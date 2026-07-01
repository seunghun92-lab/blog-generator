"""
블로그 글 생성기 백엔드 메인 서버
"""
import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

from docx_parser import extract_guide_text
from prompt_builder import build_system_prompt, build_user_prompt
from response_parser import parse_gpt_response, split_photo_markers

load_dotenv()

app = FastAPI(title="블로그 글 생성기 API")

# 프론트엔드(Vercel)에서 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 운영 배포 시 프론트엔드 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/")
def health_check():
    return {"status": "ok", "message": "블로그 글 생성기 API 동작 중"}


@app.post("/api/parse-guide")
async def parse_guide(guide_file: UploadFile = File(...)):
    """
    가이드 .docx 파일을 업로드 받아서 텍스트로 추출해 미리보기로 돌려줌.
    프론트엔드 1단계 박스에 "내용을 자동으로 읽어올게요" 부분에 해당.
    """
    if not guide_file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="docx 파일만 업로드 가능합니다.")

    file_bytes = await guide_file.read()
    try:
        guide_text = extract_guide_text(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"가이드 파일을 읽는 중 오류가 발생했습니다: {str(e)}")

    if not guide_text.strip():
        raise HTTPException(status_code=400, detail="가이드 파일에서 텍스트를 추출하지 못했습니다.")

    return {"guide_text": guide_text}


@app.post("/api/generate")
async def generate_post(
    guide_text: str = Form(...),
    photo_count: int = Form(...),
    char_count: int = Form(1200),
    profile_json: str = Form("{}"),
    style_json: str = Form("{}"),
):
    """
    가이드 텍스트 + 옵션을 받아서 GPT로 블로그 글을 생성하고
    제목/본문/주소/전화번호/링크/해시태그 6개 항목으로 분리해서 반환.
    본문은 사진 마커 기준으로도 추가 분리해서 함께 내려줌.
    """
    try:
        profile = json.loads(profile_json)
    except json.JSONDecodeError:
        profile = {}

    try:
        style = json.loads(style_json)
    except json.JSONDecodeError:
        style = {}

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        guide_text=guide_text,
        photo_count=photo_count,
        char_count=char_count,
        profile=profile,
        style=style,
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.9,  # 매번 다른 느낌의 글이 나오도록 (랜덤 옵션과도 잘 맞음)
        )
        raw_text = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 생성 중 오류가 발생했습니다: {str(e)}")

    parsed = parse_gpt_response(raw_text)
    body_segments = split_photo_markers(parsed["본문"])

    return {
        "제목": parsed["제목"],
        "본문": parsed["본문"],
        "본문_세그먼트": body_segments,  # 사진 위치까지 반영해서 프론트에서 바로 렌더링 가능
        "주소": parsed["주소"],
        "전화번호": parsed["전화번호"],
        "링크": parsed["링크"],
        "해시태그": parsed["해시태그"],
        "raw": raw_text,  # 디버깅/예외 상황 대비용 원본
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

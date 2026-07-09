"""
블로그 글 생성기 백엔드 메인 서버
"""
import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

from docx_parser import extract_guide_text
from prompt_builder import build_system_prompt, build_user_prompt, CHAR_COUNT_RANGE
from response_parser import parse_gpt_response, split_photo_markers, force_line_breaks

load_dotenv()

app = FastAPI(title="블로그 글 생성기 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

MIN_CHARS = {
    800: 350,
    1200: 800,
    1600: 1200,
    2000: 1600,
}

MAX_TOKENS = {
    800: 1500,
    1200: 2500,
    1600: 3500,
    2000: 4500,
}


@app.get("/")
def health_check():
    return {"status": "ok", "message": "블로그 글 생성기 API 동작 중"}


@app.post("/api/parse-guide")
async def parse_guide(guide_file: UploadFile = File(...)):
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
    guide_filename: str = Form(""),
):
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

    min_chars = MIN_CHARS.get(char_count, char_count // 2)
    max_tokens = MAX_TOKENS.get(char_count, 3000)
    raw_text = ""
    parsed = {}

    for attempt in range(3):
        if attempt > 0:
            retry_prompt = user_prompt + f"\n\n[중요] 이전 답변이 글자수 기준({char_count}자)에 미달했습니다. 이번엔 반드시 내용을 더 풍부하고 자세하게 작성해서 글자수를 맞춰주세요. 맛, 분위기, 서비스, 주변 환경, 개인 감상 등을 더 구체적으로 묘사해주세요."
        else:
            retry_prompt = user_prompt

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": retry_prompt},
                ],
                temperature=0.9,
                max_tokens=max_tokens,
            )
            raw_text = response.choices[0].message.content
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"글 생성 중 오류가 발생했습니다: {str(e)}")

        parsed = parse_gpt_response(raw_text)
        body_len = len(parsed["본문"].replace('\n', '').replace(' ', ''))
        print(f"[시도 {attempt+1}] 본문 글자수: {body_len} / 최소: {min_chars} / max_tokens: {max_tokens}")

        if body_len >= min_chars:
            break

    fixed_body = force_line_breaks(parsed["본문"])
    body_segments = split_photo_markers(fixed_body)

    try:
        supabase.table("post").insert({
            "제목": parsed["제목"],
            "본문": fixed_body,
            "주소": parsed["주소"],
            "전화번호": parsed["전화번호"],
            "링크": parsed["링크"],
            "해시태그": parsed["해시태그"],
            "가이드파일명": guide_filename,
        }).execute()
    except Exception as e:
        print(f"Supabase 저장 실패 (무시): {e}")

    return {
        "제목": parsed["제목"],
        "본문": fixed_body,
        "본문_세그먼트": body_segments,
        "주소": parsed["주소"],
        "전화번호": parsed["전화번호"],
        "링크": parsed["링크"],
        "해시태그": parsed["해시태그"],
        "raw": raw_text,
    }


@app.get("/api/history")
async def get_history():
    try:
        result = supabase.table("post").select("id, created_at, 제목, 가이드파일명").order("created_at", desc=True).limit(50).execute()
        return {"history": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@app.get("/api/history/{post_id}")
async def get_post(post_id: int):
    try:
        result = supabase.table("post").select("*").eq("id", post_id).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
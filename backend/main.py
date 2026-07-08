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
from prompt_builder import build_system_prompt, build_user_prompt
from response_parser import parse_gpt_response, split_photo_markers, force_line_breaks

load_dotenv()

app = FastAPI(title="블로그 글 생성기 API")

# 프론트엔드(Vercel)에서 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


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

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.9,
        )
        raw_text = response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 생성 중 오류가 발생했습니다: {str(e)}")

    parsed = parse_gpt_response(raw_text)
    fixed_body = force_line_breaks(parsed["본문"])
    body_segments = split_photo_markers(fixed_body)

    # Supabase에 저장 (실패해도 응답은 정상 반환)
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
    """저장된 글 목록 최신순으로 반환"""
    try:
        result = supabase.table("post").select("id, created_at, 제목, 가이드파일명").order("created_at", desc=True).limit(50).execute()
        return {"history": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@app.get("/api/history/{post_id}")
async def get_post(post_id: int):
    """특정 글 상세 조회"""
    try:
        result = supabase.table("post").select("*").eq("id", post_id).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
"""
블로그 글 생성기 백엔드 메인 서버
"""
import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

from docx_parser import extract_guide_text
from prompts import build_system_prompt, build_user_prompt, CHAR_COUNT_RANGE
from response_parser import (
    parse_gpt_response,
    split_photo_markers,
    force_line_breaks,
    format_phone_number,
    format_hashtags,
)

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


def _generate_content(log_tag, guide_text: str, photo_count: int, char_count: int, profile: dict, style: dict) -> dict:
    """실제 GPT 호출 + 글 작성. DB는 건드리지 않고 결과 필드만 돌려준다 (실패 시 예외 발생)."""
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
    best_body_len = -1
    best_raw_text = ""
    best_parsed = {}

    for attempt in range(3):
        if attempt > 0:
            retry_prompt = user_prompt + f"\n\n[중요] 이전 답변이 글자수 기준({char_count}자)에 미달했습니다. 이번엔 반드시 내용을 더 풍부하고 자세하게 작성해서 글자수를 맞춰주세요. 맛, 분위기, 서비스, 주변 환경, 개인 감상 등을 더 구체적으로 묘사해주세요."
        else:
            retry_prompt = user_prompt

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

        parsed = parse_gpt_response(raw_text)
        body_len = len(parsed["본문"].replace('\n', '').replace(' ', ''))
        print(f"[{log_tag}] [시도 {attempt+1}] 본문 글자수: {body_len} / 최소: {min_chars} / max_tokens: {max_tokens}")

        # 이번 시도가 지금까지 중 가장 길면 저장해둔다 (3번 다 기준 미달이어도 최선의 결과를 쓰기 위해)
        if body_len > best_body_len:
            best_body_len = body_len
            best_raw_text = raw_text
            best_parsed = parsed

        if body_len >= min_chars:
            break

    raw_text = best_raw_text
    parsed = best_parsed

    # 그래도 목표 글자수(char_count)에 못 미치면, 처음부터 새로 쓰게 하는 대신
    # 이미 쓴 본문 뒤에 자연스럽게 이어지는 내용만 추가로 받아서 붙인다.
    # (매번 새로 생성하는 것보다 목표 글자수에 훨씬 안정적으로 수렴한다)
    for _ in range(2):
        body_len = len(parsed["본문"].replace('\n', '').replace(' ', ''))
        shortfall = char_count - body_len
        if shortfall <= 0:
            break

        continue_prompt = (
            f"방금 쓴 블로그 본문이 목표 글자수(공백 제외 {char_count}자)에서 "
            f"아직 약 {shortfall}자 정도 부족해. 지금까지 쓴 본문 맨 뒤에 자연스럽게 "
            f"이어지는 추가 내용만 써줘. 맛, 분위기, 서비스, 주변 환경, 개인 감상 등을 "
            f"더 구체적으로 묘사해서 분량을 채우되, 새로운 [사진N] 마커는 절대 넣지 말고 "
            f"순수 본문 이어지는 텍스트만 출력해. [제목], [주소] 같은 다른 항목은 다시 쓰지 마."
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": raw_text},
                    {"role": "user", "content": continue_prompt},
                ],
                temperature=0.9,
                max_tokens=max_tokens,
            )
            extra_text = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[{log_tag}] [이어쓰기 실패, 기존 결과 유지] {e}")
            break

        parsed["본문"] = parsed["본문"].rstrip() + "\n\n" + extra_text
        raw_text = raw_text + "\n\n" + extra_text
        new_len = len(parsed["본문"].replace('\n', '').replace(' ', ''))
        print(f"[{log_tag}] [이어쓰기] 본문 글자수: {new_len} / 목표: {char_count}")

    fixed_body = force_line_breaks(parsed["본문"])
    return {
        "제목": parsed["제목"],
        "본문": fixed_body,
        "주소": parsed["주소"],
        "전화번호": format_phone_number(parsed["전화번호"]),
        "링크": parsed["링크"],
        "해시태그": format_hashtags(parsed["해시태그"]),
    }


def _run_generation(post_id: int, guide_text: str, photo_count: int, char_count: int, profile: dict, style: dict):
    """일괄 업로드용: 백그라운드에서 생성하고 끝나면 post_id 행을 결과로 업데이트한다 (자동 저장)."""
    try:
        fields = _generate_content(post_id, guide_text, photo_count, char_count, profile, style)
        supabase.table("post").update({**fields, "status": "done"}).eq("id", post_id).execute()
        print(f"[{post_id}] 생성 완료")
    except Exception as e:
        print(f"[{post_id}] 생성 실패: {e}")
        try:
            supabase.table("post").update({
                "제목": "생성 실패",
                "본문": f"글 생성 중 오류가 발생했어요: {e}",
                "status": "failed",
            }).eq("id", post_id).execute()
        except Exception as e2:
            print(f"[{post_id}] 실패 상태 저장도 실패: {e2}")


@app.post("/api/generate")
async def generate_post(
    background_tasks: BackgroundTasks,
    guide_text: str = Form(...),
    photo_count: int = Form(...),
    char_count: int = Form(1200),
    profile_json: str = Form("{}"),
    style_json: str = Form("{}"),
    guide_filename: str = Form(""),
    author: str = Form(""),
):
    try:
        profile = json.loads(profile_json)
    except json.JSONDecodeError:
        profile = {}

    try:
        style = json.loads(style_json)
    except json.JSONDecodeError:
        style = {}

    try:
        insert_result = supabase.table("post").insert({
            "가이드파일명": guide_filename,
            "작성자": author,
            "status": "pending",
        }).execute()
        post_id = insert_result.data[0]["id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"생성 요청을 등록하지 못했어요: {str(e)}")

    background_tasks.add_task(
        _run_generation, post_id, guide_text, photo_count, char_count, profile, style
    )

    return {"id": post_id, "status": "pending"}


@app.post("/api/generate-preview")
async def generate_preview(
    guide_text: str = Form(...),
    photo_count: int = Form(...),
    char_count: int = Form(1200),
    profile_json: str = Form("{}"),
    style_json: str = Form("{}"),
):
    """자세히 설정용: 그 자리에서 GPT 응답을 기다렸다가 결과를 바로 돌려준다. DB에는 저장하지 않는다
    (저장은 /api/save-post 에서 사용자가 "저장하기"를 눌렀을 때만)."""
    try:
        profile = json.loads(profile_json)
    except json.JSONDecodeError:
        profile = {}

    try:
        style = json.loads(style_json)
    except json.JSONDecodeError:
        style = {}

    try:
        fields = _generate_content("preview", guide_text, photo_count, char_count, profile, style)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 생성 중 오류가 발생했어요: {str(e)}")

    fields["본문_세그먼트"] = split_photo_markers(fields["본문"])
    return fields


@app.post("/api/save-post")
async def save_post(
    title: str = Form(..., alias="제목"),
    body: str = Form(..., alias="본문"),
    address: str = Form("", alias="주소"),
    phone: str = Form("", alias="전화번호"),
    link: str = Form("", alias="링크"),
    hashtags: str = Form("", alias="해시태그"),
    guide_filename: str = Form(""),
    author: str = Form(""),
):
    """자세히 설정 결과 화면에서 "이 글 저장하기"를 눌렀을 때 실제로 DB에 저장한다."""
    try:
        insert_result = supabase.table("post").insert({
            "제목": title,
            "본문": body,
            "주소": address,
            "전화번호": phone,
            "링크": link,
            "해시태그": hashtags,
            "가이드파일명": guide_filename,
            "작성자": author,
            "status": "done",
        }).execute()
        return {"id": insert_result.data[0]["id"], "status": "done"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"저장에 실패했어요: {str(e)}")


@app.delete("/api/history/{post_id}")
async def delete_post(post_id: int):
    try:
        supabase.table("post").delete().eq("id", post_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제에 실패했어요: {str(e)}")


@app.get("/api/history")
async def get_history():
    try:
        result = supabase.table("post").select("id, created_at, 제목, 가이드파일명, 작성자, status").order("created_at", desc=True).limit(50).execute()
        return {"history": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@app.get("/api/history/{post_id}")
async def get_post(post_id: int):
    try:
        result = supabase.table("post").select("*").eq("id", post_id).single().execute()
        data = result.data
        if data and data.get("본문"):
            data["본문_세그먼트"] = split_photo_markers(data["본문"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 조회 실패: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
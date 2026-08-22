"""
글 생성 라우트.
- /api/generate: 일괄 업로드용 - 즉시 등록(pending) 후 백그라운드에서 생성, 자동 저장
- /api/generate-preview: 자세히 설정용 - 그 자리에서 기다렸다가 결과만 반환, DB 저장 안 함
"""
import json

from fastapi import APIRouter, Form, HTTPException, BackgroundTasks

from clients import supabase
from generation import generate_content, run_background_generation
from response_parser import split_photo_markers

router = APIRouter()


def _parse_json_form(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


@router.post("/api/generate")
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
    profile = _parse_json_form(profile_json)
    style = _parse_json_form(style_json)

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
        run_background_generation, post_id, guide_text, photo_count, char_count, profile, style
    )

    return {"id": post_id, "status": "pending"}


@router.post("/api/generate-preview")
async def generate_preview(
    guide_text: str = Form(...),
    photo_count: int = Form(...),
    char_count: int = Form(1200),
    profile_json: str = Form("{}"),
    style_json: str = Form("{}"),
):
    """자세히 설정용: 그 자리에서 GPT 응답을 기다렸다가 결과를 바로 돌려준다. DB에는 저장하지 않는다
    (저장은 /api/save-post 에서 사용자가 "저장하기"를 눌렀을 때만)."""
    profile = _parse_json_form(profile_json)
    style = _parse_json_form(style_json)

    try:
        fields = generate_content("preview", guide_text, photo_count, char_count, profile, style)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 생성 중 오류가 발생했어요: {str(e)}")

    fields["본문_세그먼트"] = split_photo_markers(fields["본문"])
    return fields

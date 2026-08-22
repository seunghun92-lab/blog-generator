"""
글 저장소(post) CRUD 라우트: 저장 / 목록 / 상세 / 수정 / 삭제.
"""
from fastapi import APIRouter, Form, HTTPException

from clients import supabase
from response_parser import split_photo_markers

router = APIRouter()


@router.post("/api/save-post")
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


@router.put("/api/history/{post_id}")
async def update_post(
    post_id: int,
    title: str = Form(..., alias="제목"),
    body: str = Form(..., alias="본문"),
    address: str = Form("", alias="주소"),
    phone: str = Form("", alias="전화번호"),
    link: str = Form("", alias="링크"),
    hashtags: str = Form("", alias="해시태그"),
):
    """글 저장소에서 저장된 글을 직접 수정했을 때 반영한다."""
    try:
        supabase.table("post").update({
            "제목": title,
            "본문": body,
            "주소": address,
            "전화번호": phone,
            "링크": link,
            "해시태그": hashtags,
        }).eq("id", post_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"수정에 실패했어요: {str(e)}")


@router.delete("/api/history/{post_id}")
async def delete_post(post_id: int):
    try:
        supabase.table("post").delete().eq("id", post_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제에 실패했어요: {str(e)}")


@router.get("/api/history")
async def get_history():
    try:
        result = supabase.table("post").select("id, created_at, 제목, 가이드파일명, 작성자, status").order("created_at", desc=True).limit(50).execute()
        return {"history": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기록 조회 실패: {str(e)}")


@router.get("/api/history/{post_id}")
async def get_post(post_id: int):
    try:
        result = supabase.table("post").select("*").eq("id", post_id).single().execute()
        data = result.data
        if data and data.get("본문"):
            data["본문_세그먼트"] = split_photo_markers(data["본문"])
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"글 조회 실패: {str(e)}")

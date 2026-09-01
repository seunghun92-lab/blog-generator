"""
가이드(.docx 파일 / 손글씨 사진) 업로드/파싱 관련 라우트.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException

from docx_parser import extract_guide_text
from ocr import extract_text_from_image

router = APIRouter()

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


@router.post("/api/parse-guide")
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


@router.post("/api/parse-guide-photo")
async def parse_guide_photo(guide_photo: UploadFile = File(...)):
    """손글씨 메모 사진을 올리면 GPT-4o Vision으로 글자를 읽어서 가이드 텍스트로 돌려준다."""
    if not guide_photo.filename.lower().endswith(IMAGE_EXTENSIONS):
        raise HTTPException(status_code=400, detail="jpg, png, webp 사진만 업로드 가능합니다.")

    file_bytes = await guide_photo.read()

    try:
        guide_text = extract_text_from_image(file_bytes, guide_photo.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"사진에서 글자를 읽는 중 오류가 발생했습니다: {str(e)}")

    if not guide_text.strip():
        raise HTTPException(status_code=400, detail="사진에서 텍스트를 읽지 못했어요. 더 선명한 사진으로 다시 시도해주세요.")

    return {"guide_text": guide_text}

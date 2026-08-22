"""
가이드(.docx) 업로드/파싱 관련 라우트.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException

from docx_parser import extract_guide_text

router = APIRouter()


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

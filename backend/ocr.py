"""
손글씨 메모 사진에서 텍스트를 뽑아내는 모듈.
별도 OCR 서비스 없이, 이미 쓰고 있는 GPT-4o의 이미지 인식 기능을 그대로 사용한다.
"""
import base64

from clients import client

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

OCR_PROMPT = (
    "이 사진은 손으로 쓴 메모야. 사진 속에 적힌 글자를 하나도 빠짐없이 그대로 옮겨 적어줘.\n"
    "- 맞춤법이나 표현을 고치지 말고, 읽히는 그대로 옮겨.\n"
    "- 줄바꿈이나 항목 구분은 원본 메모의 구조를 최대한 살려서 유지해.\n"
    "- 글자가 아니라 사진에 대한 설명, 감상, 인사말 등은 절대 덧붙이지 말고 옮겨 적은 텍스트만 출력해.\n"
    "- 정말 읽을 수 없는 글자가 있으면 그 자리에 [판독불가]라고만 표시해."
)


def extract_text_from_image(image_bytes: bytes, filename: str) -> str:
    """손글씨 사진 바이트를 받아서 GPT-4o Vision으로 텍스트를 추출한다."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    mime = MIME_TYPES.get(ext, "image/jpeg")
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": OCR_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_image}"}},
                ],
            }
        ],
        temperature=0.2,
        max_tokens=2000,
    )
    return response.choices[0].message.content.strip()

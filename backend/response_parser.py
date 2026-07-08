"""
GPT 응답 텍스트를 [제목]/[본문]/[주소]/[전화번호]/[링크]/[해시태그] 6개로 분리하는 모듈
"""
import re

SECTION_ORDER = ["제목", "본문", "주소", "전화번호", "링크", "해시태그"]
MAX_LINE_LENGTH = 22  # 한 줄 최대 글자수 (프롬프트 규칙과 동일하게 유지)


def parse_gpt_response(raw_text: str) -> dict:
    """
    GPT가 [제목]\n...\n[본문]\n...\n 형식으로 준 응답을
    {"제목": "...", "본문": "...", ...} 딕셔너리로 분리.
    형식이 살짝 어긋나도 최대한 복구해서 빈 값이 안 나오게 처리.
    """
    result = {key: "" for key in SECTION_ORDER}

    # [섹션이름] 패턴으로 텍스트를 쪼갠다
    pattern = r"\[(제목|본문|주소|전화번호|링크|해시태그)\]"
    parts = re.split(pattern, raw_text)

    # parts는 ["앞쪽잡담", "제목", "내용1", "본문", "내용2", ...] 형태로 나옴
    # 짝수 인덱스(1,3,5..)가 섹션명, 그 다음(2,4,6..)이 내용
    for i in range(1, len(parts) - 1, 2):
        section_name = parts[i].strip()
        content = parts[i + 1].strip()
        if section_name in result:
            result[section_name] = content

    return result


def force_line_breaks(text: str, max_length: int = MAX_LINE_LENGTH) -> str:
    """
    GPT가 줄바꿈 규칙을 지키지 않고 한 줄을 길게 써버린 경우를 대비한 안전장치.
    이미 존재하는 줄바꿈(\n)은 그대로 유지하고, 그 안에서 max_length를 넘는 줄만
    공백 기준으로 다시 끊어준다. [사진N] 마커가 있는 줄은 건드리지 않는다.
    """
    lines = text.split("\n")
    result_lines = []

    for line in lines:
        # 사진 마커만 있는 줄이거나 빈 줄은 그대로 둔다
        if not line.strip() or re.fullmatch(r"\[사진\d+\]", line.strip()):
            result_lines.append(line)
            continue

        # 이미 충분히 짧으면 그대로
        if len(line) <= max_length:
            result_lines.append(line)
            continue

        # 길면 어절(공백) 단위로 다시 쌓아가며 max_length 넘기 직전에 줄바꿈
        words = line.split(" ")
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip() if current else word
            if len(candidate) > max_length and current:
                result_lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            result_lines.append(current)

    return "\n".join(result_lines)


def split_photo_markers(body_text: str) -> list[dict]:
    """
    본문 텍스트를 [사진N] 마커 기준으로 쪼개서
    [{"type": "text", "content": "..."}, {"type": "photo", "index": 1}, ...] 형태로 변환.
    프론트엔드에서 이 리스트를 순서대로 렌더링하면 사진이 자연스럽게 들어간 글이 완성됨.
    """
    pattern = r"\[사진(\d+)\]"
    segments = []
    last_end = 0

    for match in re.finditer(pattern, body_text):
        # 마커 이전의 텍스트
        text_chunk = body_text[last_end:match.start()].strip()
        if text_chunk:
            segments.append({"type": "text", "content": text_chunk})
        # 마커 자체
        segments.append({"type": "photo", "index": int(match.group(1))})
        last_end = match.end()

    # 마지막 마커 이후 남은 텍스트
    remaining = body_text[last_end:].strip()
    if remaining:
        segments.append({"type": "text", "content": remaining})

    return segments


if __name__ == "__main__":
    sample = """약간 잡담입니다

[제목]
서귀포 삼겹살 맛집 흑돈바라기 다녀왔어요

[본문]
제주 여행 중 서귀포에 갔을 때 방문했던 흑돈바라기! 올레시장 근처라 찾기 쉽더라구요. (사실 방향치라 좀 헤맸지만) 주차도 시장 공용주차장이 근처에 있어서 편리했어요.[사진1]

짚불고추장삼겹살정식을 시켰는데 진짜 비주얼부터 다르더라구요 (사진 잘 못 찍었지만 실물은 더 좋았어요..)

[사진2]

[주소]
제주 서귀포시 중정로61번길 19 1층

[전화번호]
0507-1326-7425

[링크]
https://naver.me/FHOcLqbP

[해시태그]
#서귀포맛집 #서귀포삼겹살맛집"""

    parsed = parse_gpt_response(sample)

    print("=== 후처리 전 본문 ===")
    print(parsed["본문"])
    print()

    fixed_body = force_line_breaks(parsed["본문"])
    print("=== 후처리 후 본문 (줄 길이 강제 적용) ===")
    print(fixed_body)
    print()

    print("--- 본문 사진 마커 분리 (후처리된 본문 기준) ---")
    segments = split_photo_markers(fixed_body)
    for seg in segments:
        print(seg)
"""
GPT 응답 텍스트를 [제목]/[본문]/[주소]/[전화번호]/[링크]/[해시태그] 6개로 분리하는 모듈
"""
import re

SECTION_ORDER = ["제목", "본문", "주소", "전화번호", "링크", "해시태그"]
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")


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


def force_line_breaks(text: str) -> str:
    """
    GPT가 한 문단을 여러 문장이 이어진 긴 한 줄로 써버린 경우를 대비한 안전장치.
    문단 구분(빈 줄)과 [사진N] 마커는 그대로 두고, 문장(마침표/느낌표/물음표 기준)마다
    줄바꿈을 넣어서 네이버 블로그 특유의 "문장 단위 줄바꿈" 형태로 만든다.
    """
    lines = text.split("\n")
    result_lines = []

    for line in lines:
        stripped = line.strip()
        # 사진 마커만 있는 줄이거나 빈 줄은 그대로 둔다
        if not stripped or re.fullmatch(r"\[사진\d+\]", stripped):
            result_lines.append(line)
            continue

        sentences = [s.strip() for s in SENTENCE_SPLIT_PATTERN.split(stripped) if s.strip()]
        result_lines.extend(sentences if sentences else [stripped])

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
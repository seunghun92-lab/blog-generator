"""
GPT 응답 텍스트를 [제목]/[본문]/[주소]/[전화번호]/[링크]/[해시태그] 6개로 분리하는 모듈
"""
import re

SECTION_ORDER = ["제목", "본문", "주소", "전화번호", "링크", "해시태그"]


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
요즘 고기가 땡길 때 자주 찾는 곳이 있어요.

[사진1]

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
    for k, v in parsed.items():
        print(f"--- {k} ---")
        print(v)
        print()

    print("--- 본문 사진 마커 분리 ---")
    segments = split_photo_markers(parsed["본문"])
    for seg in segments:
        print(seg)

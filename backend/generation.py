"""
GPT 호출 + 글자수 맞추기(재시도/이어쓰기) 핵심 로직.
DB 저장 여부는 이 모듈이 신경 쓰지 않는다 - 순수하게 "가이드+옵션 -> 결과 필드" 변환만 담당.
호출하는 쪽(routes)에서 결과를 어떻게 저장할지(자동 저장 / 사용자가 저장 버튼 눌러야 저장)를 결정한다.
"""
from clients import client, supabase
from prompts import build_system_prompt, build_user_prompt
from response_parser import (
    parse_gpt_response,
    force_line_breaks,
    format_phone_number,
    format_hashtags,
)

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


def generate_content(log_tag, guide_text: str, photo_count: int, char_count: int, profile: dict, style: dict) -> dict:
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


def run_background_generation(post_id: int, guide_text: str, photo_count: int, char_count: int, profile: dict, style: dict):
    """일괄 업로드용: 백그라운드에서 생성하고 끝나면 post_id 행을 결과로 업데이트한다 (자동 저장)."""
    try:
        fields = generate_content(post_id, guide_text, photo_count, char_count, profile, style)
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

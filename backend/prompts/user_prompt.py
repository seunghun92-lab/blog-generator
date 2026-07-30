"""
가이드 텍스트 + 옵션을 조합해서 유저 프롬프트를 구성하는 모듈
"""
from .labels import PROFILE_LABELS, STYLE_LABELS


def build_user_prompt(
    guide_text: str,
    photo_count: int,
    char_count: int,
    profile: dict | None = None,
    style: dict | None = None,
) -> str:
    profile = profile or {}
    style = style or {}

    profile_lines = []
    for key, label_map in PROFILE_LABELS.items():
        value = profile.get(key)
        key_name = {"age": "연령대", "gender": "성별", "job": "직업", "situation": "방문 상황"}[key]
        if value and value in label_map:
            profile_lines.append(f"- {key_name}: {label_map[value]}")
        else:
            profile_lines.append(f"- {key_name}: 가게 컨셉에 어울리게 자유롭게 설정")

    style_lines = []
    for key, label_map in STYLE_LABELS.items():
        value = style.get(key)
        key_name = {"post_type": "글 유형", "tone": "말투", "structure": "글 구조"}[key]
        if value and value in label_map:
            style_lines.append(f"- {key_name}: {label_map[value]}")
        else:
            style_lines.append(f"- {key_name}: 업체 성격에 어울리게 자유롭게 설정")

    prompt = f"""아래는 포스팅 가이드 원문입니다.

=== 포스팅 가이드 ===
{guide_text}
=== 가이드 끝 ===

[작성 조건]
- 본문 글자수: 공백 제외 최소 {char_count}자 이상 반드시 작성해야 합니다. 글자수가 부족하면 맛, 분위기, 서비스, 주변 환경, 개인 감상 등을 더 구체적이고 풍부하게 묘사해서 글자수를 채워주세요.
- 첨부된 사진 개수: {photo_count}장 (순서대로 [사진1]~[사진{photo_count}] 마커 사용)

[글쓴이 프로필 설정]
{chr(10).join(profile_lines)}

[글 스타일 설정]
{chr(10).join(style_lines)}

위 가이드와 조건에 맞춰 블로그 포스팅을 작성해주세요."""

    return prompt

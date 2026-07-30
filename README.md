# 블로그 글 생성기

가이드(.docx) + 사진 개수만 넣으면 GPT-4o가 네이버 블로그 후기글 형태(제목/본문/주소/전화번호/링크/해시태그)로 써주는 개인용 도구.

## 배포된 주소
- 프론트: https://blog-indol-one-62.vercel.app/
- 백엔드: https://blog-generator-vo6d.onrender.com

## 구조
- `backend/` - FastAPI 서버 (가이드 docx 파싱 + GPT 호출 + Supabase 기록 저장)
  - `prompts/` - GPT 프롬프트 관련 코드만 모아둔 패키지
    - `system_prompt.py` - 말투/형식 등 고정 규칙 (시스템 프롬프트)
    - `labels.py` - 프로필/스타일 옵션 값 → 설명 문구 매핑
    - `user_prompt.py` - 가이드 텍스트 + 옵션을 조합해 유저 프롬프트 생성
- `frontend/` - React(Vite) 웹앱 (업로드 UI + 결과 표시 + 생성 기록 조회)
- `vercel.json` (레포 루트) - Vercel 배포용 빌드 설정. 모노레포라 Root Directory를 프로젝트 설정에서 지정하는 대신 이 파일로 `frontend`를 직접 빌드하도록 우회함

## 글 생성 방식 (핵심 로직)
- **말투**: "존댓말감상반말" 하나로 고정 (다양한 어미 + 물결표(~)/느낌표(!) 아주 가끔 섞음). 프론트엔드에 말투 선택 UI 없음
- **줄바꿈**: 22자마다 강제로 끊던 방식에서 문장(마침표/느낌표/물음표) 단위 줄바꿈으로 변경 (`response_parser.py`의 `force_line_breaks`)
- **글자수 맞추기**: 선택한 글자수(예: 2000자)에 못 미치면
  1. 최대 3번 재생성 시도 후 그중 가장 긴 결과를 채택
  2. 그래도 부족하면 처음부터 다시 안 쓰고, 기존 본문 뒤에 **자연스럽게 이어쓰기**를 최대 2번 요청해서 분량을 채움 (`main.py`의 `/api/generate`)

## DB
**Supabase**를 사용합니다. `post` 테이블에 생성 기록(제목/본문/주소/전화번호/링크/해시태그/가이드파일명, id, created_at)을 저장하고, `/api/history`, `/api/history/{id}`에서 조회함. Supabase 저장이 실패해도 글 생성 자체는 실패하지 않도록 처리되어 있음(에러 무시하고 진행).

## 로컬 실행 방법

### 1. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt

# .env 파일 만들기 (직접 생성)
# OPENAI_API_KEY=sk-실제키
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_KEY=Supabase anon/service key

python main.py
```
→ http://localhost:8000 에서 서버 켜짐. 접속해서 `{"status":"ok"}` 뜨면 정상.

### 2. 프론트엔드 실행

새 터미널 열고:

```bash
cd frontend
npm install
npm run dev
```
→ 터미널에 뜨는 주소(보통 http://localhost:5173)로 접속하면 화면 보임.

### 3. 테스트
1. 가이드 .docx 파일 업로드 → 텍스트 자동으로 읽혀지는지 확인
2. 사진 여러 장 업로드
3. 옵션 선택 (안 해도 됨, 랜덤 적용됨)
4. "글 만들어줘" 클릭 → 결과 6개 박스(제목/본문/주소/전화번호/링크/해시태그) 생성되는지 확인
5. 각 박스 "복사" 버튼 눌러서 클립보드 복사되는지 확인
6. "생성 기록" 버튼으로 과거 생성 글 목록/상세 조회되는지 확인

## 배포

### 백엔드 → Render
- Render에서 새 Web Service 생성, 레포 연결
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- 환경변수: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` 추가
- 배포되면 나오는 URL 복사 (예: `https://xxx.onrender.com`)
- Render 무료 플랜은 일정 시간 미사용 시 슬립 상태로 들어가서, 첫 요청이 느릴 수 있음

### 프론트엔드 → Vercel
- Vercel에서 레포 연결 (Root Directory는 비워두기 - `vercel.json`이 `frontend`를 직접 빌드함)
- 환경변수에 `VITE_API_BASE_URL` = 위에서 복사한 Render URL 추가 (Production 환경 체크)
- 환경변수 추가/변경 후에는 반드시 재배포해야 반영됨 (Vite는 빌드 시점에 값을 박아넣음)
- 배포 끝나면 친구한테 그 URL 주면 됨

## 주의사항
- `.env` 파일은 절대 깃허브에 올리지 말 것 (이미 .gitignore에 들어가있긴 한데 한 번 더 확인)
- API 키는 본인이 직접 발급받은 OpenAI API 키를 써야 함 (platform.openai.com에서 발급)
- gpt-4o 모델 쓰는 중이라 사용량에 따라 비용 발생함 (글 1개당 대략 몇 원~십몇 원 수준, 글자수 미달로 이어쓰기까지 붙으면 호출 횟수가 늘어서 비용도 조금 더 늚)

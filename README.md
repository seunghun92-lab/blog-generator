# 블로그 글 생성기

가이드(.docx) + 사진 개수만 넣으면 GPT-4o가 네이버 블로그 후기글 형태(제목/본문/주소/전화번호/링크/해시태그)로 써주는 개인용 도구.

## 배포된 주소 (Render, Docker 런타임, Blueprint로 관리)
- 프론트: https://blog-generator-frontend-egvb.onrender.com
- 백엔드: https://blog-generator-backend-lg3x.onrender.com

> 예전에는 Vercel(프론트) + Render(백엔드, non-Docker)로 따로 배포했었는데, 지금은 Render 하나로 통합했다. 예전 Vercel 프로젝트와 예전 Render 백엔드 서비스는 삭제함.

## 구조
- `backend/` - FastAPI 서버 (가이드 docx 파싱 + GPT 호출 + Supabase 기록 저장)
  - `prompts/` - GPT 프롬프트 관련 코드만 모아둔 패키지
    - `system_prompt.py` - 말투/형식 등 고정 규칙 (시스템 프롬프트)
    - `labels.py` - 프로필/스타일 옵션 값 → 설명 문구 매핑
    - `user_prompt.py` - 가이드 텍스트 + 옵션을 조합해 유저 프롬프트 생성
  - `Dockerfile` - 백엔드 컨테이너 이미지 (python:3.11-slim + uvicorn)
- `frontend/` - React(Vite) 웹앱 (업로드 UI + 결과 표시 + 생성 기록 조회)
  - `Dockerfile` - 프론트 컨테이너 이미지 (node로 빌드 → nginx로 정적 서빙)
  - `nginx.conf` - 정적 파일 서빙 + `/api/*` 요청을 backend 컨테이너로 프록시
  - `src/supabaseClient.js` - 구글 로그인 전용 Supabase 클라이언트 (anon key만 사용)
  - `src/LoginGate.jsx`, `src/LoginGate.css` - 로그인 게이트 화면 (구글 로그인 안 하면 이 화면만 보임)
- `docker-compose.yml` (레포 루트) - backend + frontend를 한 번에 빌드/실행
- `render.yaml` (레포 루트) - Render Blueprint. backend/frontend 두 서비스를 Docker 런타임으로 한 번에 정의
- `vercel.json` (레포 루트) - (사용 안 함) 예전 Vercel 배포용 빌드 설정. Vercel 프로젝트 자체를 삭제했으므로 이 파일도 참고용으로만 남겨둠, 지워도 무방

## 글 생성 방식 (핵심 로직)
- **말투**: "존댓말감상반말" 하나로 고정 (다양한 어미 + 물결표(~)/느낌표(!) 아주 가끔 섞음). 프론트엔드에 말투 선택 UI 없음
- **줄바꿈**: 22자마다 강제로 끊던 방식에서 문장(마침표/느낌표/물음표) 단위 줄바꿈으로 변경 (`response_parser.py`의 `force_line_breaks`)
- **글자수 맞추기**: 선택한 글자수(예: 2000자)에 못 미치면
  1. 최대 3번 재생성 시도 후 그중 가장 긴 결과를 채택
  2. 그래도 부족하면 처음부터 다시 안 쓰고, 기존 본문 뒤에 **자연스럽게 이어쓰기**를 최대 2번 요청해서 분량을 채움 (`main.py`의 `/api/generate`)

## DB
**Supabase**를 사용합니다. `post` 테이블에 생성 기록(제목/본문/주소/전화번호/링크/해시태그/가이드파일명/**작성자**, id, created_at)을 저장하고, `/api/history`, `/api/history/{id}`에서 조회함. Supabase 저장이 실패해도 글 생성 자체는 실패하지 않도록 처리되어 있음(에러 무시하고 진행).

`작성자` 컬럼은 기본 테이블에 없으니 Supabase 대시보드 → SQL Editor에서 한 번 실행해서 추가해야 함:
```sql
ALTER TABLE post ADD COLUMN "작성자" text;
```

## 구글 로그인
여러 명이 같이 쓰다 보니 기록이 다 섞여서, 구글 로그인으로 누가 만든 글인지 구분한다. 실제 접근 제어(보안) 목적이 아니라 **단순 구분/정리용** - 로그인한 구글 계정 이름이 자동으로 "작성자"로 태그되고, 생성 기록 화면에서 작성자별로 필터링해서 볼 수 있다.

- 로그인 안 하면 `LoginGate.jsx` 화면만 보이고 그 뒤 앱은 아예 안 보임 (프론트 게이트, 백엔드 API 자체를 막는 건 아님)
- Supabase Auth의 Google Provider를 그대로 사용 (자체 회원가입/비밀번호 로직 없음)

**최초 설정 (한 번만)**
1. [Google Cloud Console](https://console.cloud.google.com/) → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID 만들기 (애플리케이션 유형: 웹 애플리케이션)
   - 승인된 리디렉션 URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback` (Supabase 대시보드 Authentication → Providers → Google 화면에 정확한 값이 표시됨)
2. Supabase 대시보드 → Authentication → Providers → **Google** 활성화 → 위에서 발급받은 Client ID / Client Secret 입력
3. Supabase 대시보드 → Authentication → URL Configuration
   - Site URL: `https://blog-generator-frontend-egvb.onrender.com`
   - Additional Redirect URLs에 로컬 개발용으로 `http://localhost:5173` 추가
4. 프론트 환경변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 (Settings → API에서 확인. **anon public 키만** 쓸 것 — service_role 키는 브라우저에 그대로 노출되므로 절대 금지)

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

## 배포 (Docker)

Vercel/Render(구 Railway) 두 곳을 따로 들어가서 배포하던 방식 대신, `docker compose` 한 번으로 프론트+백엔드를 같이 빌드/실행한다. 프론트는 nginx가 정적 파일을 서빙하면서 `/api/*` 요청을 backend 컨테이너로 프록시해주기 때문에 프론트 쪽에 API 주소를 따로 설정할 필요가 없다 (CORS 신경 안 써도 됨).

### 사전 준비
- Docker Desktop (Windows/Mac) 또는 Docker Engine + Compose 플러그인 설치
- `backend/.env` 파일 생성 (`backend/.env.example` 참고):
  ```
  OPENAI_API_KEY=sk-실제키
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_KEY=Supabase anon/service key
  ```

### 실행
레포 루트에서:
```bash
docker compose up --build
```
- 프론트: http://localhost (80번 포트)
- 백엔드: http://localhost:8000 (헬스체크: http://localhost:8000 → `{"status":"ok"}`)

백그라운드 실행: `docker compose up --build -d`
종료: `docker compose down`
코드 수정 후 다시 반영: `docker compose up --build` (변경된 이미지만 다시 빌드됨)

### 실제 서비스 배포 → Render (Docker, 대시보드 1개로 통합)

VPS를 직접 운영하는 대신, backend/frontend 둘 다 Render에 Docker 런타임으로 올린다. Render는 카드 등록 없이 무료로 쓸 수 있고, git 연결만 해두면 push할 때마다 자동으로 재배포된다 (별도 CI 파이프라인 불필요). 레포 루트의 `render.yaml`이 두 서비스를 한 번에 정의해둔 Blueprint.

**최초 설정 (한 번만, 이미 완료된 상태 - 나중에 통째로 다시 만들어야 할 때 참고용)**
1. Render 대시보드 → New → **Blueprint** → 이 레포 선택
2. `render.yaml`을 인식해서 `blog-generator-backend`, `blog-generator-frontend` 두 서비스가 자동으로 생성됨
3. backend 서비스의 환경변수에 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` 값을 채워넣음 (`sync: false`라 대시보드에서 직접 입력해야 함)
4. backend 서비스가 배포되면 나오는 실제 URL을 확인해서, `render.yaml`의 frontend `VITE_API_BASE_URL` 값을 그 URL로 맞춰준 뒤 다시 push (URL에 Render가 붙이는 랜덤 접미사가 포함되므로 반드시 실제 값 확인 후 반영해야 함)
5. 예전 Vercel 프로젝트, 예전 Render 백엔드 서비스는 삭제 (더 이상 안 씀)

**이후로는**
- `git push`만 하면 backend/frontend 둘 다 Render가 알아서 재배포 (대시보드 하나만 확인하면 됨)
- 로그, 재시작, 환경변수 관리도 Render 대시보드 한 곳에서

> Render free plan은 일정 시간 미사용 시 슬립 상태로 들어가서 첫 요청이 느릴 수 있음 (기존과 동일한 제약)

### (참고) VPS에 직접 올리고 싶을 때
카드 등록 없이 쓸 수 있는 VPS는 마땅치 않아서 기본 경로로는 추천하지 않지만, 이미 보유한 서버가 있다면:
- 서버에 Docker + Compose 설치 후 레포를 클론, `backend/.env` 파일을 서버에 직접 생성
- `docker compose up --build -d` 로 실행, 이후 `git pull && docker compose up --build -d` 로 수동 재배포
- 자동배포를 원하면 GitHub Actions에서 SSH로 위 명령을 실행하도록 워크플로를 추가하면 됨 (필요해지면 별도로 구성)

## 주의사항
- `.env` 파일은 절대 깃허브에 올리지 말 것 (이미 .gitignore에 들어가있긴 한데 한 번 더 확인)
- API 키는 본인이 직접 발급받은 OpenAI API 키를 써야 함 (platform.openai.com에서 발급)
- gpt-4o 모델 쓰는 중이라 사용량에 따라 비용 발생함 (글 1개당 대략 몇 원~십몇 원 수준, 글자수 미달로 이어쓰기까지 붙으면 호출 횟수가 늘어서 비용도 조금 더 늚)

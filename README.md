# 블로그 글 생성기

## 구조
- `backend/` - FastAPI 서버 (가이드 docx 파싱 + GPT 호출)
- `frontend/` - React 웹앱 (업로드 UI + 결과 표시)

## 로컬 실행 방법

### 1. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt

# .env 파일 만들기
cp .env.example .env
# .env 파일 열어서 OPENAI_API_KEY=sk-실제키 로 수정

python main.py
```
→ http://localhost:8000 에서 서버 켜짐. http://localhost:8000 접속해서 `{"status":"ok"}` 뜨면 정상.

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

## 배포할 때 (나중에)

### 백엔드 → Railway
- Railway에 backend 폴더 배포
- 환경변수에 `OPENAI_API_KEY` 추가
- 배포되면 나오는 URL 복사 (예: `https://xxx.up.railway.app`)

### 프론트엔드 → Vercel
- Vercel에 frontend 폴더 배포
- 환경변수에 `VITE_API_BASE_URL` = 위에서 복사한 Railway URL 추가
- 배포 끝나면 친구한테 그 URL 주면 됨

## 주의사항
- `.env` 파일은 절대 깃허브에 올리지 말 것 (이미 .gitignore에 들어가있긴 한데 한 번 더 확인)
- API 키는 본인이 직접 발급받은 OpenAI API 키를 써야 함 (platform.openai.com에서 발급)
- gpt-4o 모델 쓰는 중이라 사용량에 따라 비용 발생함 (글 1개당 대략 몇 원~십몇 원 수준)

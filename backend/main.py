"""
블로그 글 생성기 백엔드 메인 서버

실제 로직은 다 다른 모듈에 있고, 여기서는 앱을 만들고 라우터를 붙이기만 한다.
- clients.py     : OpenAI/Supabase 클라이언트
- generation.py  : GPT 호출 + 글자수 맞추기 핵심 로직
- routes/        : 엔드포인트 (guide/generate/posts)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import guide_router, generate_router, posts_router

app = FastAPI(title="블로그 글 생성기 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(guide_router)
app.include_router(generate_router)
app.include_router(posts_router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "블로그 글 생성기 API 동작 중"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

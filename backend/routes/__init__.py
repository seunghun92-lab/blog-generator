"""
라우터 모음. main.py가 이 안의 router들을 app.include_router()로 붙인다.
"""
from .guide import router as guide_router
from .generate import router as generate_router
from .posts import router as posts_router

__all__ = ["guide_router", "generate_router", "posts_router"]

// 모든 API 모듈이 공유하는 base URL + 공통 에러 처리 헬퍼
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// fetch 응답이 실패(!ok)면 백엔드가 보낸 detail 메시지로 에러를 던진다.
export async function throwIfNotOk(res, fallbackMessage) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || fallbackMessage);
  }
}

// 백엔드 API 호출 모음
// 배포 후에는 .env 파일에 VITE_API_BASE_URL=https://your-backend.up.railway.app 설정
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function parseGuideFile(file) {
  const formData = new FormData();
  formData.append("guide_file", file);

  const res = await fetch(`${API_BASE}/api/parse-guide`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "가이드 파일을 읽는 중 오류가 발생했습니다.");
  }

  return res.json();
}

export async function generatePost({ guideText, photoCount, charCount, profile, style }) {
  const formData = new FormData();
  formData.append("guide_text", guideText);
  formData.append("photo_count", photoCount);
  formData.append("char_count", charCount);
  formData.append("profile_json", JSON.stringify(profile));
  formData.append("style_json", JSON.stringify(style));

  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "글 생성 중 오류가 발생했습니다.");
  }

  return res.json();
}

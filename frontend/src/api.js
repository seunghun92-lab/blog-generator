// 백엔드 API 호출 모음
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

export async function generatePost({ guideText, photoCount, charCount, profile, style, guideFilename, author }) {
  const formData = new FormData();
  formData.append("guide_text", guideText);
  formData.append("photo_count", photoCount);
  formData.append("char_count", charCount);
  formData.append("profile_json", JSON.stringify(profile));
  formData.append("style_json", JSON.stringify(style));
  formData.append("guide_filename", guideFilename || "");
  formData.append("author", author || "");

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

// 자세히 설정: 그 자리에서 기다렸다가 결과를 바로 받는다 (DB에는 저장 안 됨)
export async function generatePreview({ guideText, photoCount, charCount, profile, style }) {
  const formData = new FormData();
  formData.append("guide_text", guideText);
  formData.append("photo_count", photoCount);
  formData.append("char_count", charCount);
  formData.append("profile_json", JSON.stringify(profile));
  formData.append("style_json", JSON.stringify(style));

  const res = await fetch(`${API_BASE}/api/generate-preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "글 생성 중 오류가 발생했습니다.");
  }

  return res.json();
}

// "이 글 저장하기" 눌렀을 때만 실제로 DB(글 저장소)에 저장
export async function savePost({ result, guideFilename, author }) {
  const formData = new FormData();
  formData.append("제목", result.제목 || "");
  formData.append("본문", result.본문 || "");
  formData.append("주소", result.주소 || "");
  formData.append("전화번호", result.전화번호 || "");
  formData.append("링크", result.링크 || "");
  formData.append("해시태그", result.해시태그 || "");
  formData.append("guide_filename", guideFilename || "");
  formData.append("author", author || "");

  const res = await fetch(`${API_BASE}/api/save-post`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "저장 중 오류가 발생했습니다.");
  }

  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${API_BASE}/api/history`);
  if (!res.ok) throw new Error("기록 조회 실패");
  return res.json();
}

export async function getPost(postId) {
  const res = await fetch(`${API_BASE}/api/history/${postId}`);
  if (!res.ok) throw new Error("글 조회 실패");
  return res.json();
}

export async function deletePost(postId) {
  const res = await fetch(`${API_BASE}/api/history/${postId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("삭제 실패");
  return res.json();
}
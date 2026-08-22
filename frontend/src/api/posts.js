import { API_BASE, throwIfNotOk } from "./client";

function postFieldsToFormData(fields) {
  const formData = new FormData();
  formData.append("제목", fields.제목 || "");
  formData.append("본문", fields.본문 || "");
  formData.append("주소", fields.주소 || "");
  formData.append("전화번호", fields.전화번호 || "");
  formData.append("링크", fields.링크 || "");
  formData.append("해시태그", fields.해시태그 || "");
  return formData;
}

// "이 글 저장하기" 눌렀을 때만 실제로 DB(글 저장소)에 저장
export async function savePost({ result, guideFilename, author }) {
  const formData = postFieldsToFormData(result);
  formData.append("guide_filename", guideFilename || "");
  formData.append("author", author || "");

  const res = await fetch(`${API_BASE}/api/save-post`, {
    method: "POST",
    body: formData,
  });

  await throwIfNotOk(res, "저장 중 오류가 발생했습니다.");
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

// 글 저장소에서 저장된 글을 직접 수정
export async function updatePost(postId, fields) {
  const res = await fetch(`${API_BASE}/api/history/${postId}`, {
    method: "PUT",
    body: postFieldsToFormData(fields),
  });

  await throwIfNotOk(res, "수정 중 오류가 발생했습니다.");
  return res.json();
}

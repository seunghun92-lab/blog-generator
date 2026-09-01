import { API_BASE, throwIfNotOk } from "./client";

export async function parseGuideFile(file) {
  const formData = new FormData();
  formData.append("guide_file", file);

  const res = await fetch(`${API_BASE}/api/parse-guide`, {
    method: "POST",
    body: formData,
  });

  await throwIfNotOk(res, "가이드 파일을 읽는 중 오류가 발생했습니다.");
  return res.json();
}

export async function parseGuidePhoto(file) {
  const formData = new FormData();
  formData.append("guide_photo", file);

  const res = await fetch(`${API_BASE}/api/parse-guide-photo`, {
    method: "POST",
    body: formData,
  });

  await throwIfNotOk(res, "사진에서 글자를 읽는 중 오류가 발생했습니다.");
  return res.json();
}

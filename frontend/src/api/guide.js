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

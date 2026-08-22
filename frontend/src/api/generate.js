import { API_BASE, throwIfNotOk } from "./client";

// 일괄 업로드용: 즉시 큐에 등록되고 백그라운드에서 생성 + 자동 저장됨
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

  await throwIfNotOk(res, "글 생성 중 오류가 발생했습니다.");
  return res.json();
}

// 자세히 설정용: 그 자리에서 기다렸다가 결과를 바로 받는다 (DB에는 저장 안 됨)
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

  await throwIfNotOk(res, "글 생성 중 오류가 발생했습니다.");
  return res.json();
}

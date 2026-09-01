// 백엔드 API 호출 모음 - 도메인별로 나눠서(guide/generate/posts) 여기서 재수출한다.
// 다른 파일에서는 그대로 `from "../api"` 로 가져다 쓰면 됨.
export { parseGuideFile, parseGuidePhoto } from "./guide";
export { generatePost, generatePreview } from "./generate";
export { savePost, getHistory, getPost, deletePost, updatePost } from "./posts";

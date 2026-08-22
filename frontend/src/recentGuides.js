// 최근에 쓴 가이드를 브라우저에 저장해뒀다가 다시 고를 수 있게 해주는 헬퍼.
// 같은 가게를 또 리뷰할 때 매번 docx 파일을 다시 올리지 않아도 되게.
const KEY = "blog-generator-recent-guides";
const MAX = 8;

export function getRecentGuides() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentGuide(name, guideText) {
  try {
    const list = getRecentGuides().filter((g) => g.name !== name);
    list.unshift({ name, guideText, savedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // 프라이빗 모드 등 localStorage 접근이 막힌 환경은 조용히 무시
  }
}

export function removeRecentGuide(name) {
  try {
    const list = getRecentGuides().filter((g) => g.name !== name);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 무시
  }
}

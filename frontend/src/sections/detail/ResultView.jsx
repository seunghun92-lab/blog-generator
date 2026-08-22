import ResultBox from "../../components/ResultBox";
import PhotoPreview from "../../components/PhotoPreview";
import MiniGame from "../../components/MiniGame";

// 글자수별 대략적인 예상 소요시간 (GPT 호출 1~5번, 재시도/이어쓰기 포함될 수 있어서 범위로 안내)
const ETA_TEXT = {
  800: "약 15~25초",
  1200: "약 20~35초",
  1600: "약 25~45초",
  2000: "약 30~60초",
};

// 3단계: 생성 로딩(진행률+미니게임) / 실패 / 결과+저장
export default function ResultView({
  phase, // loading | error | result
  progress,
  charCount,
  errorMsg,
  result,
  photos,
  saving,
  saved,
  onRetry,
  onBackToForm,
  onSave,
  onStartOver,
}) {
  if (phase === "loading") {
    return (
      <div className="result-loading">
        <p className="progress-pct">{Math.round(progress)}%</p>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-eta">글을 쓰고 있어요 · 예상 소요시간 {ETA_TEXT[charCount] || "약 20~40초"}</p>
        <MiniGame />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="done-screen">
        <div className="done-badge" style={{ background: "#fdecea", color: "#c0392b" }}>!</div>
        <h2>생성에 실패했어요</h2>
        <p>{errorMsg}</p>
        <div className="wiz-nav">
          <button className="btn-back" onClick={onBackToForm}>이전으로</button>
          <button className="btn-next" onClick={onRetry}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div>
        <ResultBox label="제목" content={result.제목} />
        <PhotoPreview segments={result.본문_세그먼트} body={result.본문} photos={photos} />
        <ResultBox label="주소" content={result.주소} />
        <ResultBox label="전화번호" content={result.전화번호} />
        <ResultBox label="링크" content={result.링크} />
        <ResultBox label="해시태그" content={result.해시태그} />

        {!saved ? (
          <>
            <div className="result-actions">
              <button className="btn-back" onClick={onRetry}>다시 만들기</button>
              <button className="save-btn" onClick={onSave} disabled={saving}>
                {saving ? "저장하는 중..." : "이 글 저장하기"}
              </button>
            </div>
            {errorMsg && <p className="error-text">{errorMsg}</p>}
          </>
        ) : (
          <div className="wiz-nav">
            <button className="save-btn saved" style={{ flex: 1 }} disabled>저장됐어요 ✓</button>
            <button className="btn-next" style={{ flex: 1 }} onClick={onStartOver}>새로 만들기</button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

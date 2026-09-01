import DropZone from "../../components/DropZone";

// 1단계: 가이드 파일 업로드 + 최근 가이드 재사용
export default function GuideStep({
  guideFile,
  guideText,
  guideLoading,
  errorMsg,
  recentGuides,
  onFiles,
  onClear,
  onPickRecent,
  onDeleteRecent,
  onNext,
}) {
  return (
    <div>
      <DropZone accept=".docx,image/jpeg,image/png,image/webp" multiple={false} onFiles={onFiles}>
        <div className="zone-main">{guideFile ? guideFile.name : "가이드 파일을 여기에 끌어다 놓으세요"}</div>
        <div className="zone-sub">.docx 파일 또는 손글씨 사진(jpg/png/webp) 가능</div>
        <span className="zone-btn">파일 선택</span>
      </DropZone>
      {guideLoading && <p className="hint">가이드 읽는 중... (사진이면 글자를 읽는 데 몇 초 더 걸려요)</p>}
      {guideFile && !guideLoading && (
        <div className="file-count">
          <span><b>1개</b> 선택됨 · {guideFile.name}</span>
          <button className="clear-all" onClick={onClear}>삭제</button>
        </div>
      )}
      {recentGuides.length > 0 && (
        <div className="recent-guides">
          <p className="recent-guides-label">최근 가이드</p>
          <div className="recent-guides-list">
            {recentGuides.map((g) => (
              <button type="button" key={g.name} className="recent-guide-chip" onClick={() => onPickRecent(g)}>
                <span className="recent-guide-name">{g.name}</span>
                <span className="recent-guide-x" onClick={(e) => onDeleteRecent(e, g.name)}>×</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {errorMsg && <p className="error-text">{errorMsg}</p>}
      <div className="wiz-nav">
        <button className="btn-next" style={{ flex: 1 }} onClick={onNext} disabled={!guideText}>
          다음 · 사진
        </button>
      </div>
    </div>
  );
}

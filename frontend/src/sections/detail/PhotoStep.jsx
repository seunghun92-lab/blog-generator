import DropZone from "../../components/DropZone";
import { CHAR_COUNT_OPTIONS } from "../../options";

// 2단계: 사진 업로드 + 글 분량 선택
export default function PhotoStep({
  photos,
  charCount,
  errorMsg,
  onFiles,
  onRemove,
  onClearAll,
  onCharCountChange,
  onBack,
  onGenerate,
}) {
  return (
    <div>
      <DropZone accept="image/*" multiple onFiles={onFiles}>
        <div className="zone-main">사진을 여기에 끌어다 놓으세요</div>
        <div className="zone-sub">여러 장 한번에 선택 가능 (첫 장 = 대표이미지) · 사진 없이도 생성할 수 있어요</div>
        <span className="zone-btn">사진 선택</span>
      </DropZone>
      {photos.length > 0 && (
        <div className="file-count">
          <span><b>{photos.length}개</b> 선택됨</span>
          <button className="clear-all" onClick={onClearAll}>전체 삭제</button>
        </div>
      )}
      <div className="file-list">
        {photos.map((p, i) => (
          <div key={p.id} className="file-row">
            <img className="file-thumb" src={p.url} alt={`사진${i + 1}`} />
            <span className="file-name">{i === 0 ? "대표 사진" : `사진 ${i + 1}`} · {p.file.name}</span>
            <button type="button" className="file-remove" onClick={() => onRemove(p.id)}>×</button>
          </div>
        ))}
      </div>
      <div className="opt-row" style={{ marginTop: 8 }}>
        <span className="label">글 분량</span>
        <select value={charCount} onChange={(e) => onCharCountChange(Number(e.target.value))}>
          {CHAR_COUNT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {errorMsg && <p className="error-text">{errorMsg}</p>}
      <div className="wiz-nav">
        <button className="btn-back" onClick={onBack}>이전</button>
        <button className="btn-next" onClick={onGenerate}>
          생성 시작하기
        </button>
      </div>
    </div>
  );
}

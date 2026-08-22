import ResultBox from "../../components/ResultBox";
import PhotoPreview from "../../components/PhotoPreview";

const EDIT_FIELDS = [
  { key: "제목", label: "제목", multiline: false },
  { key: "본문", label: "본문", multiline: true },
  { key: "주소", label: "주소", multiline: false },
  { key: "전화번호", label: "전화번호", multiline: false },
  { key: "링크", label: "링크", multiline: false },
  { key: "해시태그", label: "해시태그", multiline: true },
];

// 글 저장소 상세/수정 모달
export default function PostModal({
  post,
  editMode,
  editFields,
  savingEdit,
  onClose,
  onStartEdit,
  onCancelEdit,
  onEditFieldChange,
  onSaveEdit,
}) {
  if (!post) return null;

  return (
    <div className="archive-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="archive-modal">
        <button type="button" className="archive-modal-close" onClick={onClose}>×</button>

        {!editMode ? (
          <>
            <h2>{post.제목 || "제목 없음"}</h2>
            <p className="archive-modal-meta">{post.작성자} · {post.가이드파일명}</p>
            <PhotoPreview segments={post.본문_세그먼트} body={post.본문} />
            <ResultBox label="주소" content={post.주소} />
            <ResultBox label="전화번호" content={post.전화번호} />
            <ResultBox label="링크" content={post.링크} />
            <ResultBox label="해시태그" content={post.해시태그} />
            <div className="wiz-nav">
              <button className="btn-back" onClick={onStartEdit}>수정하기</button>
            </div>
          </>
        ) : (
          <>
            <h2>수정하기</h2>
            {EDIT_FIELDS.map((f) => (
              <div key={f.key} className="edit-field">
                <label>{f.label}</label>
                {f.multiline ? (
                  <textarea
                    rows={f.key === "본문" ? 10 : 3}
                    value={editFields[f.key]}
                    onChange={(e) => onEditFieldChange(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={editFields[f.key]}
                    onChange={(e) => onEditFieldChange(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
            <div className="wiz-nav">
              <button className="btn-back" onClick={onCancelEdit} disabled={savingEdit}>취소</button>
              <button className="btn-next" onClick={onSaveEdit} disabled={savingEdit}>
                {savingEdit ? "저장하는 중..." : "저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

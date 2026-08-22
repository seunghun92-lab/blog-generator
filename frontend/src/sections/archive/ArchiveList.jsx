const STATUS_LABEL = { pending: "생성 중", failed: "실패" };

// 저장된 글 목록 - 작성자 필터, 페이지네이션, 항목 클릭/삭제
// (페이지 크기 계산과 필터링은 상위 Archive.jsx가 담당하고, 이 컴포넌트는 순수 표시만 한다)
export default function ArchiveList({
  loading,
  filtered,
  pageItems,
  authors,
  authorFilter,
  onAuthorFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  onOpenItem,
  onDeleteItem,
}) {
  return (
    <>
      {authors.length > 1 && (
        <div className="author-filter">
          <button className={`author-chip ${authorFilter === "" ? "active" : ""}`} onClick={() => onAuthorFilterChange("")}>전체</button>
          {authors.map((a) => (
            <button key={a} className={`author-chip ${authorFilter === a ? "active" : ""}`} onClick={() => onAuthorFilterChange(a)}>{a}</button>
          ))}
        </div>
      )}

      {loading && <p className="hint">불러오는 중...</p>}
      {!loading && filtered.length === 0 && <p className="hint">아직 저장한 글이 없어요.</p>}

      <div className="archive-list">
        {pageItems.map((item) => {
          const isPending = item.status === "pending";
          const isFailed = item.status === "failed";
          return (
            <div
              key={item.id}
              className={`archive-item ${isPending ? "is-pending" : ""} ${isFailed ? "is-failed" : ""}`}
              onClick={() => onOpenItem(item)}
            >
              <div className="archive-main">
                <div className="archive-title">{isPending ? "생성 중인 글이에요" : (item.제목 || "제목 없음")}</div>
                <div className="archive-meta">
                  {item.작성자 && <span className="archive-author">{item.작성자}</span>}
                  {item.가이드파일명 && <span>{item.가이드파일명}</span>}
                </div>
              </div>
              <div className="archive-row">
                {(isPending || isFailed) && (
                  <span className={`status-pill ${item.status}`}><span className="dot" />{STATUS_LABEL[item.status]}</span>
                )}
                {!isPending && <span className="status-pill done">완료</span>}
                <button
                  type="button"
                  className="archive-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                  title="삭제"
                >×</button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="steps" style={{ marginTop: 22, marginBottom: 0 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div className="step-dot-wrap" key={i}>
              <button className={`step-dot ${i === currentPage ? "current" : ""}`} onClick={() => onPageChange(i)}>{i + 1}</button>
              {i < totalPages - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import ResultBox from "../components/ResultBox";
import { getHistory, getPost, deletePost } from "../api";

const PAGE_SIZE = 3;

const STATUS_LABEL = { pending: "생성 중", failed: "실패" };

export default function Archive({ showToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [authorFilter, setAuthorFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data.history || []);
    } catch {
      showToast?.("기록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 생성 중인 항목이 있으면 5초마다 자동 새로고침
  useEffect(() => {
    if (!history.some((h) => h.status === "pending")) return;
    const timer = setInterval(loadHistory, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const authors = [...new Set(history.map((h) => h.작성자).filter(Boolean))];
  const filtered = authorFilter ? history.filter((h) => h.작성자 === authorFilter) : history;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const openItem = async (item) => {
    if (item.status !== "done") return;
    setModalLoading(true);
    try {
      const data = await getPost(item.id);
      setSelectedPost(data);
    } catch {
      showToast?.("글을 불러오지 못했어요.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => setSelectedPost(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await deletePost(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      showToast?.("삭제했어요.");
    } catch {
      showToast?.("삭제에 실패했어요.");
    }
  };

  return (
    <div className="wizard" style={{ maxWidth: 820 }}>
      <div className="wiz-head" style={{ textAlign: "left", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>글 저장소</h1>
        <p>지금까지 저장한 글을 한 곳에서 확인하세요</p>
      </div>

      {authors.length > 1 && (
        <div className="author-filter">
          <button className={`author-chip ${authorFilter === "" ? "active" : ""}`} onClick={() => { setAuthorFilter(""); setPage(0); }}>전체</button>
          {authors.map((a) => (
            <button key={a} className={`author-chip ${authorFilter === a ? "active" : ""}`} onClick={() => { setAuthorFilter(a); setPage(0); }}>{a}</button>
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
              onClick={() => openItem(item)}
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
                <button type="button" className="archive-delete" onClick={(e) => handleDelete(e, item.id)} title="삭제">×</button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="steps" style={{ marginTop: 22, marginBottom: 0 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <div className="step-dot-wrap" key={i}>
              <button className={`step-dot ${i === currentPage ? "current" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
              {i < totalPages - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>
      )}

      {selectedPost && (
        <div className="archive-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="archive-modal">
            <button type="button" className="archive-modal-close" onClick={closeModal}>×</button>
            <h2>{selectedPost.제목 || "제목 없음"}</h2>
            <p className="archive-modal-meta">{selectedPost.작성자} · {selectedPost.가이드파일명}</p>
            <ResultBox label="본문" content={selectedPost.본문} />
            <ResultBox label="주소" content={selectedPost.주소} />
            <ResultBox label="전화번호" content={selectedPost.전화번호} />
            <ResultBox label="링크" content={selectedPost.링크} />
            <ResultBox label="해시태그" content={selectedPost.해시태그} />
          </div>
        </div>
      )}
      {modalLoading && <p className="hint">불러오는 중...</p>}
    </div>
  );
}

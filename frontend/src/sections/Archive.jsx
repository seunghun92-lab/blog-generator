import { useEffect, useState } from "react";
import ArchiveList from "./archive/ArchiveList";
import PostModal from "./archive/PostModal";
import { getHistory, getPost, deletePost, updatePost } from "../api";

const PAGE_SIZE = 3;

export default function Archive({ showToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [authorFilter, setAuthorFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const handleAuthorFilterChange = (a) => {
    setAuthorFilter(a);
    setPage(0);
  };

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

  const closeModal = () => {
    setSelectedPost(null);
    setEditMode(false);
    setEditFields(null);
  };

  const startEdit = () => {
    setEditFields({
      제목: selectedPost.제목 || "",
      본문: selectedPost.본문 || "",
      주소: selectedPost.주소 || "",
      전화번호: selectedPost.전화번호 || "",
      링크: selectedPost.링크 || "",
      해시태그: selectedPost.해시태그 || "",
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditFields(null);
  };

  const changeEditField = (key, value) => {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await updatePost(selectedPost.id, editFields);
      const updated = { ...selectedPost, ...editFields };
      setSelectedPost(updated);
      setHistory((prev) => prev.map((h) => (h.id === updated.id ? { ...h, 제목: updated.제목 } : h)));
      setEditMode(false);
      setEditFields(null);
      showToast?.("수정했어요.");
    } catch (err) {
      showToast?.(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteItem = async (id) => {
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

      <ArchiveList
        loading={loading}
        filtered={filtered}
        pageItems={pageItems}
        authors={authors}
        authorFilter={authorFilter}
        onAuthorFilterChange={handleAuthorFilterChange}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        onOpenItem={openItem}
        onDeleteItem={handleDeleteItem}
      />

      {modalLoading && <p className="hint">불러오는 중...</p>}

      <PostModal
        post={selectedPost}
        editMode={editMode}
        editFields={editFields}
        savingEdit={savingEdit}
        onClose={closeModal}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onEditFieldChange={changeEditField}
        onSaveEdit={saveEdit}
      />
    </div>
  );
}

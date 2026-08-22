import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import LoginGate from "./LoginGate";
import DetailWizard from "./sections/DetailWizard";
import BatchUpload from "./sections/BatchUpload";
import Archive from "./sections/Archive";

// 구글 계정에서 표시용 이름을 뽑아낸다 (없으면 이메일 앞부분으로 대체)
function getDisplayName(user) {
  if (!user) return "";
  const meta = user.user_metadata || {};
  return meta.full_name || meta.name || user.email?.split("@")[0] || "";
}

export default function App() {
  // 로그인 세션 (undefined: 확인 중, null: 미로그인, object: 로그인됨)
  const [session, setSession] = useState(undefined);
  const [section, setSection] = useState("detail"); // detail | batch | archive
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const author = getDisplayName(session?.user);
  const handleLogout = () => supabase.auth.signOut();

  const goSection = (name) => {
    if (name === section) return;
    if (hasUnsaved && !window.confirm("저장 안 한 글이 있어요. 그래도 이동할까요?")) return;
    setHasUnsaved(false);
    setSection(name);
  };

  // ───── 로그인 세션 확인 중 ─────
  if (session === undefined) {
    return <div className="session-loading" />;
  }

  // ───── 미로그인 ─────
  if (session === null) {
    return <LoginGate />;
  }

  return (
    <div className="app-root">
      <div className="app-topbar">
        <span className="brand">Blog-Generator</span>
        <div className="top-actions">
          <span className="name">{author}님</span>
          <button onClick={() => goSection("detail")}>Home</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="shell">
        <aside className="sidebar">
          <button className={section === "detail" ? "active" : ""} onClick={() => goSection("detail")}>
            자세히 설정해서 만들기
          </button>
          <button className={section === "batch" ? "active" : ""} onClick={() => goSection("batch")}>
            일괄 업로드
          </button>
          <button className={section === "archive" ? "active" : ""} onClick={() => goSection("archive")}>
            글 저장소
          </button>
        </aside>

        <div className="page">
          {toast && <div className="toast">{toast}</div>}
          {section === "detail" && (
            <DetailWizard author={author} showToast={showToast} onUnsavedChange={setHasUnsaved} />
          )}
          {section === "batch" && (
            <BatchUpload author={author} showToast={showToast} onGoArchive={() => setSection("archive")} />
          )}
          {section === "archive" && <Archive showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

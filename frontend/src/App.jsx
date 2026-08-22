import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import LoginGate from "./LoginGate";
import DetailWizard from "./sections/DetailWizard";
import BatchUpload from "./sections/BatchUpload";
import Archive from "./sections/Archive";
import { getHistory } from "./api";

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

  // ── 일괄 업로드 완료 시 브라우저 알림 ──
  const [watchingBatch, setWatchingBatch] = useState(false);
  const sawPendingRef = useRef(false);

  const notifyBatchDone = (message) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Blog-Generator", { body: message });
      } catch {
        // 알림 생성이 막힌 환경(일부 모바일 브라우저 등)은 토스트로만 대체
      }
    }
    showToast(message);
  };

  // 배치 제출 버튼 클릭 시(=사용자 제스처 안에서) 호출 - 권한 요청은 여기서 바로 해야
  // 브라우저가 안 막고 프롬프트를 띄워준다.
  const startWatchingBatch = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    sawPendingRef.current = false;
    setWatchingBatch(true);
  };

  useEffect(() => {
    if (!watchingBatch) return;
    const check = async () => {
      try {
        const data = await getHistory();
        const pendingCount = (data.history || []).filter((h) => h.status === "pending").length;
        if (pendingCount > 0) {
          sawPendingRef.current = true;
        } else if (sawPendingRef.current) {
          setWatchingBatch(false);
          notifyBatchDone("생성 완료! 글 저장소에서 확인해보세요.");
        }
      } catch {
        // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
      }
    };
    check();
    const timer = setInterval(check, 6000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchingBatch]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const author = getDisplayName(session?.user);
  const handleLogout = () => {
    if (hasUnsaved && !window.confirm("저장 안 한 글이 있어요. 그래도 로그아웃할까요?")) return;
    supabase.auth.signOut();
  };

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
        <button className="brand" onClick={handleLogout} title="로그아웃하고 로그인 화면으로">Blog-Generator</button>
        <div className="top-actions">
          <span className="name">{author}님</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="shell">
        <aside className="sidebar">
          <button className={section === "detail" ? "active" : ""} onClick={() => goSection("detail")}>
            글 1개 만들기
          </button>
          <button className={section === "batch" ? "active" : ""} onClick={() => goSection("batch")}>
            글 여러 개 만들기
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
            <BatchUpload
              author={author}
              showToast={showToast}
              onGoArchive={() => setSection("archive")}
              onBatchQueued={startWatchingBatch}
            />
          )}
          {section === "archive" && <Archive showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

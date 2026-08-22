import { useEffect, useRef, useState } from "react";
import DropZone from "../components/DropZone";
import ResultBox from "../components/ResultBox";
import MiniGame from "../components/MiniGame";
import { CHAR_COUNT_OPTIONS } from "../options";
import { parseGuideFile, generatePreview, savePost } from "../api";

// 글자수별 대략적인 예상 소요시간 (GPT 호출 1~5번, 재시도/이어쓰기 포함될 수 있어서 범위로 안내)
const ETA_TEXT = {
  800: "약 15~25초",
  1200: "약 20~35초",
  1600: "약 25~45초",
  2000: "약 30~60초",
};

export default function DetailWizard({ author, showToast, onUnsavedChange }) {
  const [step, setStep] = useState(1);

  // 1단계: 가이드
  const [guideFile, setGuideFile] = useState(null);
  const [guideText, setGuideText] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);

  // 2단계: 사진 + 글 분량
  const [photos, setPhotos] = useState([]);
  const [charCount, setCharCount] = useState(1200);

  // 생성/결과
  const [phase, setPhase] = useState("form"); // form | loading | result | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    // 언마운트 시 진행률 타이머 정리
    return () => clearInterval(progressTimerRef.current);
  }, []);

  useEffect(() => {
    onUnsavedChange?.(phase === "result" && !saved);
  }, [phase, saved, onUnsavedChange]);

  const handleGuideFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setErrorMsg("가이드 파일은 .docx 형식만 업로드할 수 있어요.");
      return;
    }
    setGuideFile(file);
    setGuideLoading(true);
    setErrorMsg("");
    try {
      const data = await parseGuideFile(file);
      setGuideText(data.guide_text);
    } catch (err) {
      setErrorMsg(err.message);
      setGuideFile(null);
    } finally {
      setGuideLoading(false);
    }
  };

  const clearGuide = () => {
    setGuideFile(null);
    setGuideText("");
  };

  const handlePhotoFiles = (files) => {
    const newPhotos = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
  };

  const goStep = (n) => {
    if (n === 2 && !guideText.trim()) return;
    setStep(n);
  };

  const runGenerate = async () => {
    setPhase("loading");
    setErrorMsg("");
    setProgress(0);

    // 실제 진행률을 알 방법이 없어서(백엔드가 한 번에 응답), 92%까지는 점점 느려지면서
    // 채워지다가, 응답이 오면 100%로 마무리하는 식으로 흉내낸다 (tqdm 느낌).
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + (92 - p) * 0.06));
    }, 200);

    try {
      const data = await generatePreview({
        guideText,
        photoCount: photos.length,
        charCount,
        profile: {},
        style: {},
      });
      clearInterval(progressTimerRef.current);
      setProgress(100);
      setResult(data);
      setSaved(false);
      setPhase("result");
    } catch (err) {
      clearInterval(progressTimerRef.current);
      setErrorMsg(err.message);
      setPhase("error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePost({ result, guideFilename: guideFile?.name || "", author });
      setSaved(true);
      showToast?.("저장됐어요! 글 저장소에서 확인할 수 있어요.");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startOver = () => {
    clearGuide();
    clearPhotos();
    setCharCount(1200);
    setStep(1);
    setPhase("form");
    setResult(null);
    setSaved(false);
    setErrorMsg("");
  };

  const backToForm = () => {
    // 결과가 마음에 안 들 때 - 입력값은 유지한 채 폼으로 복귀
    setPhase("form");
    setResult(null);
    setSaved(false);
  };

  return (
    <div className="wizard">
      <div className="wiz-head">
        <p className="eyebrow">AI 블로그 자동 생성</p>
        <h1>블로그 글 생성기</h1>
        <p>
          {phase === "form" && "2단계만 거치면 바로 글이 완성돼요"}
          {phase === "loading" && "글을 쓰고 있어요"}
          {phase === "result" && (saved ? "저장 완료!" : "결과를 확인하고 저장해주세요")}
          {phase === "error" && "문제가 생겼어요"}
        </p>
      </div>

      {phase === "form" && (
        <>
          <div className="steps">
            <div className="step-dot-wrap">
              <button className={`step-dot ${step === 1 ? "current" : ""} ${guideText ? "done" : ""}`} onClick={() => goStep(1)}>1</button>
              <span className={`step-label ${step === 1 ? "current" : ""}`}>가이드</span>
            </div>
            <div className="step-line" />
            <div className="step-dot-wrap">
              <button className={`step-dot ${step === 2 ? "current" : ""}`} onClick={() => goStep(2)} disabled={!guideText}>2</button>
              <span className={`step-label ${step === 2 ? "current" : ""}`}>사진</span>
            </div>
          </div>

          {step === 1 && (
            <div>
              <DropZone accept=".docx" multiple={false} onFiles={handleGuideFiles}>
                <div className="zone-main">{guideFile ? guideFile.name : "가이드 파일을 여기에 끌어다 놓으세요"}</div>
                <div className="zone-sub">.docx 파일만 가능</div>
                <span className="zone-btn">파일 선택</span>
              </DropZone>
              {guideLoading && <p className="hint">가이드 읽는 중...</p>}
              {guideFile && !guideLoading && (
                <div className="file-count">
                  <span><b>1개</b> 선택됨</span>
                  <button className="clear-all" onClick={clearGuide}>삭제</button>
                </div>
              )}
              {errorMsg && <p className="error-text">{errorMsg}</p>}
              <div className="wiz-nav">
                <button className="btn-next" style={{ flex: 1 }} onClick={() => goStep(2)} disabled={!guideText}>
                  다음 · 사진
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <DropZone accept="image/*" multiple onFiles={handlePhotoFiles}>
                <div className="zone-main">사진을 여기에 끌어다 놓으세요</div>
                <div className="zone-sub">여러 장 한번에 선택 가능 (첫 장 = 대표이미지)</div>
                <span className="zone-btn">사진 선택</span>
              </DropZone>
              {photos.length > 0 && (
                <div className="file-count">
                  <span><b>{photos.length}개</b> 선택됨</span>
                  <button className="clear-all" onClick={clearPhotos}>전체 삭제</button>
                </div>
              )}
              <div className="file-list">
                {photos.map((p, i) => (
                  <div key={p.id} className="file-row">
                    <img className="file-thumb" src={p.url} alt={`사진${i + 1}`} />
                    <span className="file-name">{i === 0 ? "대표 사진" : `사진 ${i + 1}`} · {p.file.name}</span>
                    <button type="button" className="file-remove" onClick={() => removePhoto(p.id)}>×</button>
                  </div>
                ))}
              </div>
              <div className="opt-row" style={{ marginTop: 8 }}>
                <span className="label">글 분량</span>
                <select value={charCount} onChange={(e) => setCharCount(Number(e.target.value))}>
                  {CHAR_COUNT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {errorMsg && <p className="error-text">{errorMsg}</p>}
              <div className="wiz-nav">
                <button className="btn-back" onClick={() => goStep(1)}>이전</button>
                <button className="btn-next" onClick={runGenerate} disabled={photos.length === 0}>
                  생성 시작하기
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "loading" && (
        <div className="result-loading">
          <p className="progress-pct">{Math.round(progress)}%</p>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-eta">글을 쓰고 있어요 · 예상 소요시간 {ETA_TEXT[charCount] || "약 20~40초"}</p>
          <MiniGame />
        </div>
      )}

      {phase === "error" && (
        <div className="done-screen">
          <div className="done-badge" style={{ background: "#fdecea", color: "#c0392b" }}>!</div>
          <h2>생성에 실패했어요</h2>
          <p>{errorMsg}</p>
          <div className="wiz-nav">
            <button className="btn-back" onClick={backToForm}>이전으로</button>
            <button className="btn-next" onClick={runGenerate}>다시 시도</button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          <ResultBox label="제목" content={result.제목} />
          <ResultBox label="본문" content={result.본문} />
          <ResultBox label="주소" content={result.주소} />
          <ResultBox label="전화번호" content={result.전화번호} />
          <ResultBox label="링크" content={result.링크} />
          <ResultBox label="해시태그" content={result.해시태그} />

          {!saved ? (
            <>
              <div className="result-actions">
                <button className="btn-back" onClick={runGenerate}>다시 만들기</button>
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? "저장하는 중..." : "이 글 저장하기"}
                </button>
              </div>
              {errorMsg && <p className="error-text">{errorMsg}</p>}
            </>
          ) : (
            <div className="wiz-nav">
              <button className="save-btn saved" style={{ flex: 1 }} disabled>저장됐어요 ✓</button>
              <button className="btn-next" style={{ flex: 1 }} onClick={startOver}>새로 만들기</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

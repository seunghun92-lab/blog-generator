import { useEffect, useRef, useState } from "react";
import GuideStep from "./detail/GuideStep";
import PhotoStep from "./detail/PhotoStep";
import ResultView from "./detail/ResultView";
import { parseGuideFile, parseGuidePhoto, generatePreview, savePost } from "../api";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
import { getRecentGuides, saveRecentGuide, removeRecentGuide } from "../recentGuides";

export default function DetailWizard({ author, showToast, onUnsavedChange }) {
  const [step, setStep] = useState(1);

  // 1단계: 가이드
  const [guideFile, setGuideFile] = useState(null);
  const [guideText, setGuideText] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [recentGuides, setRecentGuides] = useState(() => getRecentGuides());

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
    const isDocx = file.name.endsWith(".docx");
    const isPhoto = IMAGE_EXT.test(file.name);
    if (!isDocx && !isPhoto) {
      setErrorMsg("가이드는 .docx 파일이나 손글씨 사진(jpg/png/webp)만 업로드할 수 있어요.");
      return;
    }
    setGuideFile(file);
    setGuideLoading(true);
    setErrorMsg("");
    try {
      // 사진이면 GPT-4o Vision으로 글자를 읽어오고(OCR), docx면 문서에서 바로 텍스트를 뽑는다.
      // 이후 로직은 가이드 텍스트가 어디서 왔든 완전히 동일하게 처리된다.
      const data = isDocx ? await parseGuideFile(file) : await parseGuidePhoto(file);
      setGuideText(data.guide_text);
      saveRecentGuide(file.name, data.guide_text);
      setRecentGuides(getRecentGuides());
    } catch (err) {
      setErrorMsg(err.message);
      setGuideFile(null);
    } finally {
      setGuideLoading(false);
    }
  };

  const pickRecentGuide = (g) => {
    setGuideFile({ name: g.name });
    setGuideText(g.guideText);
    setErrorMsg("");
  };

  const deleteRecentGuide = (e, name) => {
    e.stopPropagation();
    removeRecentGuide(name);
    setRecentGuides(getRecentGuides());
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
            <GuideStep
              guideFile={guideFile}
              guideText={guideText}
              guideLoading={guideLoading}
              errorMsg={errorMsg}
              recentGuides={recentGuides}
              onFiles={handleGuideFiles}
              onClear={clearGuide}
              onPickRecent={pickRecentGuide}
              onDeleteRecent={deleteRecentGuide}
              onNext={() => goStep(2)}
            />
          )}

          {step === 2 && (
            <PhotoStep
              photos={photos}
              charCount={charCount}
              errorMsg={errorMsg}
              onFiles={handlePhotoFiles}
              onRemove={removePhoto}
              onClearAll={clearPhotos}
              onCharCountChange={setCharCount}
              onBack={() => goStep(1)}
              onGenerate={runGenerate}
            />
          )}
        </>
      )}

      {phase !== "form" && (
        <ResultView
          phase={phase}
          progress={progress}
          charCount={charCount}
          errorMsg={errorMsg}
          result={result}
          photos={photos}
          saving={saving}
          saved={saved}
          onRetry={runGenerate}
          onBackToForm={backToForm}
          onSave={handleSave}
          onStartOver={startOver}
        />
      )}
    </div>
  );
}

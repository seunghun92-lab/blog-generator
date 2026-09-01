import { useState } from "react";
import DropZone from "../components/DropZone";
import { parseGuideFile, generatePost } from "../api";

let seq = 0;
const nextId = (prefix) => `${prefix}-${Date.now()}-${seq++}`;

export default function BatchUpload({ author, showToast, onGoArchive, onBatchQueued }) {
  const [files, setFiles] = useState([]); // [{id, file, guideText, parsing, error, photos:[{id,url,file}]}]
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState("select"); // select | status
  const [statusInfo, setStatusInfo] = useState(null);

  const handleFilesSelected = (fileList) => {
    const docxFiles = fileList.filter((f) => f.name.endsWith(".docx"));
    const entries = docxFiles.map((file) => ({
      id: nextId("bf"),
      file,
      guideText: "",
      parsing: true,
      error: "",
      photos: [],
    }));
    setFiles((prev) => [...prev, ...entries]);

    entries.forEach((entry) => {
      parseGuideFile(entry.file)
        .then((data) => {
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, guideText: data.guide_text, parsing: false } : f)));
        })
        .catch((err) => {
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, parsing: false, error: err.message } : f)));
        });
    });
  };

  const addPhotosToFile = (fileId, photoFiles) => {
    const newPhotos = photoFiles.map((file) => ({
      id: nextId("bp"),
      file,
      url: URL.createObjectURL(file),
    }));
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, photos: [...f.photos, ...newPhotos] } : f)));
  };

  const removePhoto = (fileId, photoId) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id !== fileId) return f;
      const target = f.photos.find((p) => p.id === photoId);
      if (target) URL.revokeObjectURL(target.url);
      return { ...f, photos: f.photos.filter((p) => p.id !== photoId) };
    }));
  };

  const removeFile = (fileId) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === fileId);
      target?.photos.forEach((p) => URL.revokeObjectURL(p.url));
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const clearAll = () => {
    files.forEach((f) => f.photos.forEach((p) => URL.revokeObjectURL(p.url)));
    setFiles([]);
  };

  const ready = files.length > 0 && files.every((f) => !f.parsing && f.guideText && !f.error);

  const handleSubmitBatch = async () => {
    onBatchQueued?.(); // 사용자 클릭 제스처 안에서 바로 호출 (알림 권한 요청 타이밍 때문)
    setSubmitting(true);
    const results = await Promise.allSettled(
      files.map((f) =>
        generatePost({
          guideText: f.guideText,
          photoCount: f.photos.length,
          charCount: 1200,
          profile: {},
          style: {},
          guideFilename: f.file.name,
          author,
        })
      )
    );
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    setSubmitting(false);
    setStatusInfo({ total: files.length, successCount });
    setPhase("status");
    clearAll();
    if (successCount < files.length) {
      showToast?.(`${files.length - successCount}개는 등록에 실패했어요.`);
    }
  };

  const startOver = () => {
    setPhase("select");
    setStatusInfo(null);
  };

  if (phase === "status") {
    const allOk = statusInfo && statusInfo.successCount === statusInfo.total;
    return (
      <div className="wizard">
        <div className="done-screen">
          <div className="done-badge is-pending">
            <div className="big-spinner" style={{ width: 26, height: 26, margin: 0, borderWidth: 2.5 }} />
          </div>
          <h2>생성 중입니다...</h2>
          <p>
            {statusInfo?.successCount}개 자료가 백그라운드에서 생성되고 있어요
            {!allOk && ` (${statusInfo.total - statusInfo.successCount}개는 등록에 실패했어요)`}
          </p>
        </div>
        <div className="wiz-nav">
          <button className="btn-back" onClick={startOver}>더 올리기</button>
          <button className="btn-next" onClick={onGoArchive}>현황 보기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard">
      <div className="wiz-head">
        <p className="eyebrow">AI 블로그 자동 생성</p>
        <h1>글 여러 개 만들기</h1>
        <p>.docx 파일을 한꺼번에 여러 개 골라주세요. 파일마다 사진도 따로 올릴 수 있어요.</p>
      </div>

      <DropZone accept=".docx" multiple onFiles={handleFilesSelected}>
        <div className="zone-main">가이드 파일 여러 개를 여기에 끌어다 놓으세요</div>
        <div className="zone-sub">.docx 파일만 가능, 여러 개 동시 선택</div>
        <span className="zone-btn">파일 선택</span>
      </DropZone>

      {files.length > 0 && (
        <div className="file-count">
          <span><b>{files.length}개</b> 선택됨</span>
          <button className="clear-all" onClick={clearAll}>전체 삭제</button>
        </div>
      )}

      <div className="file-list">
        {files.map((f) => (
          <div key={f.id} className="batch-file-card">
            <div className="file-row">
              <div className="file-thumb" />
              <span className="file-name">{f.file.name}</span>
              <span className="file-state">
                {f.parsing ? <span className="spinner" /> : f.error ? <span style={{ color: "#c0392b", fontSize: 12 }}>오류</span> : <span className="check">✓</span>}
              </span>
              <button type="button" className="file-remove" onClick={() => removeFile(f.id)}>×</button>
            </div>
            {f.error && <p className="error-text" style={{ marginTop: 0 }}>{f.error}</p>}
            <div className="batch-photo-row">
              <DropZone
                accept="image/*"
                multiple
                className="batch-photo-add"
                onFiles={(photoFiles) => addPhotosToFile(f.id, photoFiles)}
              >
                ＋
              </DropZone>
              {f.photos.map((p) => (
                <div key={p.id} className="batch-photo-thumb">
                  <img src={p.url} alt="" />
                  <button type="button" className="thumb-x" onClick={() => removePhoto(f.id, p.id)}>×</button>
                </div>
              ))}
              {f.photos.length === 0 && <span className="batch-photo-hint">사진 없이도 생성돼요 (선택)</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="wiz-nav">
        <button className="btn-next" style={{ flex: 1 }} onClick={handleSubmitBatch} disabled={!ready || submitting}>
          {submitting ? "등록하는 중..." : ready ? `선택한 ${files.length}개 한번에 생성 시작하기` : "가이드 파일을 불러오는 중이에요"}
        </button>
      </div>
    </div>
  );
}

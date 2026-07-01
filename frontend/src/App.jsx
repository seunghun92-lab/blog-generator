import { useState, useRef } from "react";
import {
  AGE_OPTIONS, GENDER_OPTIONS, JOB_OPTIONS, SITUATION_OPTIONS,
  POST_TYPE_OPTIONS, TONE_OPTIONS, STRUCTURE_OPTIONS, CHAR_COUNT_OPTIONS,
} from "./options";
import { parseGuideFile, generatePost } from "./api";

const RESULT_FIELDS = [
  { key: "제목", label: "제목" },
  { key: "본문", label: "본문" },
  { key: "주소", label: "주소" },
  { key: "전화번호", label: "전화번호" },
  { key: "링크", label: "링크" },
  { key: "해시태그", label: "해시태그" },
];

function Dropdown({ label, options, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CopyBox({ label, content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="result-box">
      <div className="result-header">
        <span>{label}</span>
        <button onClick={handleCopy} className="copy-btn">
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <pre className="result-content">{content || "(내용 없음)"}</pre>
    </div>
  );
}

// 드래그 앤 드롭 + 클릭 업로드를 모두 지원하는 공용 업로드 영역
function DropZone({ accept, multiple, onFiles, placeholder, children }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) onFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFiles(files);
    // 같은 파일을 다시 선택해도 onChange가 발동하도록 값 초기화
    e.target.value = "";
  };

  return (
    <div
      className={`upload-zone ${dragActive ? "drag-active" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      {children || placeholder}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={handleInputChange}
      />
    </div>
  );
}

export default function App() {
  // 화면 전환: "form" (입력 화면) | "result" (결과 화면)
  const [view, setView] = useState("form");

  // 1단계: 가이드 파일
  const [guideFile, setGuideFile] = useState(null);
  const [guideText, setGuideText] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);

  // 2단계: 사진 (각 항목에 file + 미리보기 url을 함께 저장)
  const [photos, setPhotos] = useState([]);

  // 3단계: 옵션
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [job, setJob] = useState("");
  const [situation, setSituation] = useState("");
  const [postType, setPostType] = useState("후기성");
  const [tone, setTone] = useState("");
  const [structure, setStructure] = useState("");
  const [charCount, setCharCount] = useState(1200);

  // 결과
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadGuideFile = async (file) => {
    setGuideFile(file);
    setGuideLoading(true);
    setError("");
    try {
      const data = await parseGuideFile(file);
      setGuideText(data.guide_text);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuideLoading(false);
    }
  };

  const handleGuideFiles = (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setError("가이드 파일은 .docx 형식만 업로드할 수 있어요.");
      return;
    }
    loadGuideFile(file);
  };

  const handlePhotoFiles = (files) => {
    const newPhotos = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleGenerate = async () => {
    if (!guideText.trim()) {
      setError("먼저 포스팅 가이드 파일을 업로드해주세요.");
      return;
    }
    if (photos.length === 0) {
      setError("사진을 1장 이상 업로드해주세요.");
      return;
    }

    setGenerating(true);
    setError("");
    setResult(null);

    try {
      const data = await generatePost({
        guideText,
        photoCount: photos.length,
        charCount,
        profile: { age, gender, job, situation },
        style: { post_type: postType, tone, structure },
      });
      setResult(data);
      setView("result"); // 생성 끝나면 결과 페이지로 전환
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToForm = () => {
    setView("form");
  };

  // ───────────────────── 결과 화면 ─────────────────────
  if (view === "result" && result) {
    return (
      <div className="app">
        <header className="app-header">
          <button className="back-btn" onClick={handleBackToForm}>
            ← 다시 만들기
          </button>
          <h1>생성 결과</h1>
          <p>각 항목을 복사해서 그대로 붙여넣으세요.</p>
        </header>

        <section className="results">
          {RESULT_FIELDS.map((field) => (
            <CopyBox key={field.key} label={field.label} content={result[field.key]} />
          ))}
          <p className="warn">AI는 100% 완벽하지 않습니다. 생성된 본문은 반드시 확인 후 사용해주세요.</p>
        </section>
      </div>
    );
  }

  // ───────────────────── 입력 화면 ─────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>블로그 글 생성기</h1>
        <p>포스팅 가이드(.docx)랑 사진만 넣으면, 글을 자동으로 써드려요.</p>
      </header>

      <section className="card">
        <h2>1. 포스팅 가이드 파일</h2>
        <p className="hint">받은 .docx 가이드 파일을 올려주세요. 내용을 자동으로 읽어올게요.</p>
        <DropZone accept=".docx" multiple={false} onFiles={handleGuideFiles}>
          {guideFile ? guideFile.name : "클릭하거나 파일을 끌어다 놓으세요 (.docx)"}
        </DropZone>
        {guideLoading && <p className="hint">가이드 읽는 중...</p>}
        {guideText && (
          <textarea
            className="guide-preview"
            value={guideText}
            onChange={(e) => setGuideText(e.target.value)}
            rows={8}
          />
        )}
      </section>

      <section className="card">
        <h2>2. 사진</h2>
        <p className="hint">포스팅에 들어갈 사진들을 올려주세요. 순서대로 글에 자연스럽게 녹여드려요. (첫 번째 사진 = 대표이미지)</p>
        <DropZone accept="image/*" multiple={true} onFiles={handlePhotoFiles}>
          {photos.length > 0 ? `${photos.length}장 선택됨 (클릭하거나 끌어다 놓으면 추가돼요)` : "클릭하거나 사진 여러 장을 끌어다 놓으세요"}
        </DropZone>
        {photos.length > 0 && (
          <div className="photo-preview-row">
            {photos.map((photo, i) => (
              <div key={photo.id} className="photo-thumb">
                <img src={photo.url} alt={`사진${i + 1}`} />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePhoto(photo.id);
                  }}
                  aria-label="사진 삭제"
                >
                  ×
                </button>
                <span>{i === 0 ? "대표" : `사진${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>3. 옵션</h2>

        <div className="field-row">
          <Dropdown label="글 분량" options={CHAR_COUNT_OPTIONS} value={charCount} onChange={(v) => setCharCount(Number(v))} />
          <Dropdown label="글 유형" options={POST_TYPE_OPTIONS} value={postType} onChange={setPostType} />
        </div>

        <h3>프로필 설정 (선택 안 하면 랜덤 적용)</h3>
        <div className="field-row">
          <Dropdown label="연령대" options={AGE_OPTIONS} value={age} onChange={setAge} />
          <Dropdown label="성별" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
        </div>
        <div className="field-row">
          <Dropdown label="직업" options={JOB_OPTIONS} value={job} onChange={setJob} />
          <Dropdown label="상황" options={SITUATION_OPTIONS} value={situation} onChange={setSituation} />
        </div>

        <h3>스타일 설정 (선택 안 하면 랜덤 적용)</h3>
        <div className="field-row">
          <Dropdown label="말투" options={TONE_OPTIONS} value={tone} onChange={setTone} />
          <Dropdown label="글 구조" options={STRUCTURE_OPTIONS} value={structure} onChange={setStructure} />
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
        {generating ? "포스팅 생성 중..." : "글 만들어줘"}
      </button>
    </div>
  );
}

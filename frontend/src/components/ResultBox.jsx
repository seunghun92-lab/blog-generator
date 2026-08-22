import { useState } from "react";

// 결과 필드 하나(제목/본문/주소/전화번호/링크/해시태그)를 복사 가능한 박스로 보여준다.
export default function ResultBox({ label, content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="result-box">
      <div className="result-header">
        <span>{label}</span>
        <button onClick={handleCopy} className="result-copy-btn">
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <pre className="result-content">{content || "(내용 없음)"}</pre>
    </div>
  );
}

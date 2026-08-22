import { useState } from "react";

// 본문을 [사진N] 마커 기준으로 나눠서, 실제로 그 자리에 사진을 끼운 모습으로 미리보여준다.
// photos가 있으면 실제 이미지(방금 올린 사진)를, 없으면 "사진 N" 자리표시자를 보여준다.
export default function PhotoPreview({ segments, body, photos }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!segments || segments.length === 0) {
    return (
      <div className="result-box">
        <div className="result-header">
          <span>본문</span>
          <button onClick={handleCopy} className="result-copy-btn">{copied ? "복사됨!" : "복사"}</button>
        </div>
        <pre className="result-content">{body || "(내용 없음)"}</pre>
      </div>
    );
  }

  return (
    <div className="result-box">
      <div className="result-header">
        <span>본문 미리보기</span>
        <button onClick={handleCopy} className="result-copy-btn">{copied ? "복사됨!" : "본문 복사"}</button>
      </div>
      <div className="photo-preview-body">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return <p key={i} className="pp-text">{seg.content}</p>;
          }
          const photo = photos?.[seg.index - 1];
          return photo ? (
            <img key={i} className="pp-photo" src={photo.url} alt={`사진 ${seg.index}`} />
          ) : (
            <div key={i} className="pp-photo-placeholder">사진 {seg.index} 자리</div>
          );
        })}
      </div>
    </div>
  );
}

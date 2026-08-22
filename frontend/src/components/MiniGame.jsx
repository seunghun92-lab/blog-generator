import { useEffect, useRef, useState } from "react";

// 글 생성 기다리는 동안 심심하지 말라고 넣은 버블팝 미니게임
const COLORS = ["#f4a261", "#4a7a5a", "#7c6cf0", "#c1440e", "#2f9e6e"];

export default function MiniGame() {
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const areaRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const spawn = () => {
      const area = areaRef.current;
      if (!area) return;
      const size = 32 + Math.random() * 22;
      const x = Math.random() * Math.max(0, area.clientWidth - size);
      const y = Math.random() * Math.max(0, area.clientHeight - size);
      const id = seqRef.current++;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      setBubbles((prev) => [...prev, { id, x, y, size, color }]);
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== id));
      }, 1600);
    };
    const interval = setInterval(spawn, 650);
    return () => clearInterval(interval);
  }, []);

  const pop = (id) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    setScore((s) => s + 1);
  };

  return (
    <div className="minigame" ref={areaRef}>
      <span className="minigame-score">점수 {score}</span>
      {bubbles.map((b) => (
        <button
          key={b.id}
          type="button"
          className="bubble"
          style={{ left: b.x, top: b.y, width: b.size, height: b.size, background: b.color }}
          onClick={() => pop(b.id)}
        />
      ))}
      <span className="minigame-hint">기다리는 동안 버블을 눌러보세요</span>
    </div>
  );
}

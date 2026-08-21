import { useState } from "react";
import { supabase } from "./supabaseClient";
import heroPhoto from "./assets/blogger-hero.jpg";
import "./LoginGate.css";

export default function LoginGate() {
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (signInError) {
      setError("구글 로그인을 시작하지 못했어요: " + signInError.message);
      setLoggingIn(false);
    }
    // 성공하면 구글 로그인 페이지로 리다이렉트되므로 여기서 별도 처리 없음
  };

  return (
    <div className="login-hero">
      <div className="login-photo">
        <img src={heroPhoto} alt="노트에 글을 쓰는 블로거" />
      </div>

      <div className="login-content">
        <p className="login-eyebrow">AI 블로그 자동 생성 서비스</p>
        <h1 className="login-headline">
          Blog-Generator
          <span className="login-headline-sub">That's Perfect For Da-eun</span>
        </h1>
        <p className="login-sub">
          가이드 파일이랑 사진만 올리면,
          <br />
          네이버 블로그 후기글을 그 자리에서 써드려요.
        </p>

        <button className="login-cta" onClick={handleGoogleLogin} disabled={loggingIn} type="button">
          <svg className="g-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.7 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.4 0-13.8 4-17.2 9.9z" />
            <path fill="#4CAF50" d="M24 45c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 36.4 27 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 40.9 16.4 45 24 45z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.6 5.4C41.6 35.9 45 30.5 45 24c0-1.4-.1-2.5-.4-3.5z" />
          </svg>
          {loggingIn ? "이동 중..." : "Google로 로그인하기"}
        </button>
        {error && <p className="login-error">{error}</p>}
        <p className="login-footnote">다은님을 위한 개인용 도구예요</p>

        <div className="login-divider" />
        <div className="login-feature-list">
          <div className="login-feature">
            <span className="ic">✎</span>가이드 파일 + 사진만 올리면 바로 초안 완성
          </div>
          <div className="login-feature">
            <span className="ic">↗</span>지금까지 만든 글 기록도 한 번에 조회
          </div>
        </div>
      </div>
    </div>
  );
}

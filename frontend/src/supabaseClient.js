// Supabase 클라이언트 (구글 로그인 전용 - DB 접근은 백엔드가 service key로 직접 처리)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았어요. 구글 로그인이 동작하지 않습니다."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

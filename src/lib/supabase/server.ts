import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// .env.local에 Supabase 키를 아직 채우지 않은 로컬 개발 상태를 구분하기 위한 값.
// 이 값이 false면 인증 관련 기능은 비활성화된 것으로 취급한다(로그인 안 한 것과 동일하게 처리).
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 서버 컴포넌트/라우트 핸들러에서 Supabase에 접근할 때 사용하는 클라이언트.
// 쿠키를 통해 로그인 세션을 읽고 갱신하므로 요청마다 새로 생성해야 한다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출되면 쿠키 쓰기가 불가능하다.
            // 미들웨어에서 세션을 갱신하는 구조라면 무시해도 안전하다.
          }
        },
      },
    }
  );
}

// Supabase 설정 전(.env.local 미기입)에도 페이지가 죽지 않도록 감싼 헬퍼.
// 레이아웃처럼 모든 요청에서 로그인 상태를 확인해야 하는 곳에서 사용한다.
export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

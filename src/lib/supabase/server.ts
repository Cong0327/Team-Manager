import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

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
//
// react의 cache()로 감쌌다 — supabase.auth.getUser()는 로컬 세션을 그냥 읽는 게 아니라
// 매번 Supabase Auth 서버로 네트워크 왕복해서 토큰을 검증한다(getSession()과 다름, 의도적으로
// getUser()를 쓰는 이유는 서버 컴포넌트에서 세션 위조를 막기 위함). 이 함수를 레이아웃과 거의
// 모든 page.tsx가 직접 호출하는 데다, getMyTeamMemberships/getMyProfile도 내부에서 또 호출해서
// 캐싱 없이는 요청 하나당 이 네트워크 왕복이 3~5번씩 중첩됐다(버튼 클릭마다 router.refresh()가
// 전체 트리를 다시 그리면서 그만큼 또 반복) — 체감 지연의 주범이었다. cache()는 React 요청
// 단위로만 메모이즈되므로 요청이 끝나면 자동으로 사라져 세션 만료 등은 여전히 정상 반영된다.
export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

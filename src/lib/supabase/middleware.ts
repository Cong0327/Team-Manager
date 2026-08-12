import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 미들웨어에서 매 요청마다 세션 쿠키를 갱신하기 위한 헬퍼.
// 갱신을 빼먹으면 클라이언트에서 로그인 세션이 예기치 않게 만료된 것처럼 보인다.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // .env.local에 Supabase 키가 아직 없는 로컬 개발 상태에서는 세션 갱신을 건너뛴다.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // JWT 서명을 검증하면서 만료가 임박한 세션은 갱신한다.
  // 비대칭 서명 키를 쓰는 프로젝트에서는 공개 키가 캐시된 뒤 로컬 검증되므로,
  // 매 네비게이션마다 Auth 서버까지 왕복하는 getUser()보다 빠르다.
  // 대칭 키이거나 WebCrypto를 사용할 수 없는 환경에서는 Supabase가 안전하게
  // getUser() 검증으로 폴백하므로 인증 신뢰 수준은 낮아지지 않는다.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

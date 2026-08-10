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

  // 세션 유효성 검사를 트리거해서 만료된 토큰을 갱신한다.
  await supabase.auth.getUser();

  return supabaseResponse;
}

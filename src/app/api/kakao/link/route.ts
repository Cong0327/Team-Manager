import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getKakaoAuthorizeUrl } from "@/lib/kakao";

// 카카오톡(톡캘린더) 연동 시작점. Supabase Auth의 카카오 로그인과는 완전히 별개 흐름이다 —
// 앱이 카카오 OAuth authorize 엔드포인트로 직접 리다이렉트해서 talk_calendar 스코프만 요청한다.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const redirectUri = `${origin}/api/kakao/link/callback`;
  return NextResponse.redirect(getKakaoAuthorizeUrl(redirectUri));
}

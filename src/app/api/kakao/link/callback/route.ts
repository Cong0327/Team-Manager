import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { exchangeKakaoCode, getKakaoUserId } from "@/lib/kakao";

// 카카오 OAuth 콜백. 인가 코드를 토큰으로 교환하고 kakao_links에 저장한다.
// 이미 로그인된 계정(이메일/비밀번호)에 카카오 토큰을 덧붙이는 것뿐이라, 새 계정을
// 만들거나 로그인 세션을 바꾸지 않는다.
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const code = searchParams.get("code");
  const kakaoError = searchParams.get("error");
  if (kakaoError || !code) {
    return NextResponse.redirect(`${origin}/account?kakao=error`);
  }

  try {
    const redirectUri = `${origin}/api/kakao/link/callback`;
    const tokens = await exchangeKakaoCode(code, redirectUri);
    const kakaoUserId = await getKakaoUserId(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const supabase = await createClient();
    const { error } = await supabase.from("kakao_links").upsert({
      user_id: user.id,
      kakao_user_id: kakaoUserId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return NextResponse.redirect(`${origin}/account?kakao=linked`);
  } catch (err) {
    console.error("카카오 연동 콜백 실패:", err);
    return NextResponse.redirect(`${origin}/account?kakao=error`);
  }
}

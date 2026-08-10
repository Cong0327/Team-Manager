import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 카카오 로그인/계정 연동이 Supabase를 거쳐 돌아오는 콜백.
// code를 세션으로 교환해야 로그인이 실제로 완료된다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}

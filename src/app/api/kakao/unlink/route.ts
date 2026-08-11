import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

// 카카오톡 연동 해제. 저장된 토큰 행만 지운다(카카오 쪽 동의 자체를 철회하진 않음 —
// 필요하면 사용자가 카카오톡 앱에서 직접 연결 끊기를 해야 한다).
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase.from("kakao_links").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

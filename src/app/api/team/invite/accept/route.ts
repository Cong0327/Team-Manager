import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ACTIVE_TEAM_COOKIE } from "@/lib/teams";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let token: string;
  try {
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token) throw new Error();
    token = body.token;
  } catch {
    return NextResponse.json({ error: "잘못된 초대 요청입니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("join_team_via_invite", {
    p_token: token,
  });

  if (error || !teamId) {
    return NextResponse.json({ error: "유효하지 않은 초대 링크입니다." }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ACTIVE_TEAM_COOKIE, teamId as string, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

"use server";

import { cookies } from "next/headers";
import { ACTIVE_TEAM_COOKIE } from "@/lib/teams";

// 팀 스위처에서 팀을 고르면 호출된다. active_team_id 쿠키만 바꾸고,
// 실제 화면 갱신은 호출부에서 router.refresh()로 처리한다(URL은 그대로 유지).
export async function setActiveTeam(teamId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

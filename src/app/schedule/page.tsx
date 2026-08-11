import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getTeamEvents } from "@/lib/events";
import ScheduleView from "./schedule-view";

// 경기일정: 월 캘린더 + 유형 필터(경기/훈련/기타) + 다가오는 일정(참석 투표) + 지난 경기(결과).
// 조회는 팀원 전원, 생성/수정/삭제는 owner·manager (RLS로도 강제).
export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const events = await getTeamEvents(team.id);
  const canManage = role === "owner" || role === "manager";

  return (
    <main className="flex flex-1 flex-col gap-5 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">경기일정</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.name}</p>
      </div>

      <ScheduleView
        teamId={team.id}
        teamName={team.name}
        events={events}
        canManage={canManage}
        currentUserId={user.id}
      />
    </main>
  );
}

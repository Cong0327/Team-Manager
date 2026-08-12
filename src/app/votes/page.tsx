import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getTeamPolls } from "@/lib/polls";
import CreatePoll from "./create-poll";
import PollList from "./poll-list";

// 투표관리: 생성은 owner·manager, 응답/집계 조회는 팀원 전원(RLS로도 강제).
export default async function VotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const polls = await getTeamPolls(team.id);
  const canManage = role === "owner" || role === "manager";

  return (
    <main className="app-page flex flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div>
        <p className="page-eyebrow">Team polls</p><h1 className="page-title">투표관리</h1>
        <p className="page-subtitle">{team.name}</p>
      </div>

      {canManage && <CreatePoll teamId={team.id} currentUserId={user.id} />}

      <PollList polls={polls} currentUserId={user.id} canManage={canManage} />
    </main>
  );
}

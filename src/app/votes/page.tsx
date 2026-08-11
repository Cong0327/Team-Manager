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
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">투표관리</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.name}</p>
      </div>

      {canManage && <CreatePoll teamId={team.id} currentUserId={user.id} />}

      <PollList polls={polls} currentUserId={user.id} canManage={canManage} />
    </main>
  );
}

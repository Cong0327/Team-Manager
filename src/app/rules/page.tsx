import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getTeamPolicies } from "@/lib/policies";
import RulesManager from "./rules-manager";

// 회칙(팀 규정): 조회는 팀원 전원, 생성/수정/삭제는 감독(owner)만 (RLS로도 강제).
export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const policies = await getTeamPolicies(team.id);
  const canManage = role === "owner"; // 감독만 생성/수정 가능

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div>
        <p className="page-eyebrow">Team rules</p><h1 className="page-title">회칙</h1>
        <p className="page-subtitle">{team.name}</p>
      </div>

      <RulesManager teamId={team.id} currentUserId={user.id} policies={policies} canManage={canManage} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership, getTeamRoster } from "@/lib/teams";
import { getTeamInvite } from "@/lib/invites";
import InviteLinkCard from "./invite-link-card";
import RosterTable from "./roster-table";

// 명단관리: 별도 등록 없이 팀에 가입 승인된 사람을 그대로 명단으로 보여준다.
// 조회는 승인된 팀원 전원, 포지션/골/어시스트/역할 편집은 owner·manager, 제명은 owner만
// (RLS로도 강제 — 개발자 겸 관리자 테스트 계정은 자기 팀의 owner라 별도 예외가 필요 없다).
export default async function RosterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const canManageInvite = role === "owner" || role === "manager";
  const [members, invite] = await Promise.all([
    getTeamRoster(team.id),
    canManageInvite ? getTeamInvite(team.id) : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">명단관리</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {team.name} · {members.length}명
        </p>
      </div>

      {canManageInvite && (
        <InviteLinkCard teamId={team.id} initialInvite={invite} currentUserId={user.id} />
      )}

      <RosterTable members={members} viewerRole={role} />
    </main>
  );
}

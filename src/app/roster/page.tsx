import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership, getTeamRoster } from "@/lib/teams";
import { getTeamInvite } from "@/lib/invites";
import { getTeamGoalAssistStats, getPlayerGoalAssistStats } from "@/lib/season-stats-server";
import { getTeamSeasons } from "@/lib/seasons-server";
import InviteLinkCard from "./invite-link-card";
import RosterTable from "./roster-table";
import SeasonSelect from "./season-select";

// 명단관리: 별도 등록 없이 팀에 가입 승인된 사람을 그대로 명단으로 보여준다.
// 조회는 승인된 팀원 전원, 포지션/골/어시스트 편집은 owner·manager, 역할 변경·제명은
// 감독(owner)과 관리자 계정(PLATFORM_ADMIN_EMAIL)만 (RLS로도 강제 — roster-table.tsx 참고).
// ?season=<id>로 골/어시스트를 어느 시즌 기준으로 볼지 고를 수 있다(기본값: 전체 기간).
export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const canManageInvite = role === "owner" || role === "manager";

  const params = await searchParams;
  const seasonParam = Array.isArray(params.season) ? params.season[0] : params.season;

  const [members, invite, seasons] = await Promise.all([
    getTeamRoster(team.id),
    canManageInvite ? getTeamInvite(team.id) : Promise.resolve(null),
    getTeamSeasons(team.id),
  ]);
  const selectedSeason = seasons.find((season) => season.id === seasonParam) ?? null;
  const goalAssistStats = await getTeamGoalAssistStats(team.id, selectedSeason);

  // 골/어시스트는 team_members에 수동으로 쌓인 값 대신 경기 기록(event_player_stats)에서
  // 선택한 시즌 기준으로 계산한 값을 보여준다 — 표에서 편집칸을 없앤 것과 짝이 맞는 변경이다.
  const rosterWithStats = members.map((member) => ({
    ...member,
    ...getPlayerGoalAssistStats(goalAssistStats, member.user_id),
  }));

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

      <SeasonSelect seasons={seasons} selectedSeasonId={selectedSeason?.id ?? null} />

      <RosterTable
        teamId={team.id}
        members={rosterWithStats}
        viewerRole={role}
        viewerEmail={user.email ?? null}
        currentSeasonName={selectedSeason?.name ?? null}
      />
    </main>
  );
}

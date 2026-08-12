import { redirect } from "next/navigation";
import { getTeamEvents, splitMatches } from "@/lib/events";
import { getTeamSeasons } from "@/lib/seasons-server";
import { isWithinSeason } from "@/lib/seasons";
import { getTeamSeasonSummary } from "@/lib/records-server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import TeamRecordsManager from "./team-records-manager";
import SeasonPicker from "./season-picker";
import TeamSeasonSummary from "./team-season-summary";

// 팀 기록: 개인별 골/어시스트 없이 "경기 자체"의 날짜·시간·상대·스코어만 카드로 보여준다.
// 참여자 단위 기록은 /my-records(개인 기록)에서 별도로 다룬다.
// 시즌 추가/선택은 이 페이지에서 관리한다(경기 결과가 있는 화면이라 시즌 필터가 여기 있는 게 자연스럽다).
export default async function TeamRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const canManage = role === "owner" || role === "manager";

  const params = await searchParams;
  const seasonParam = Array.isArray(params.season) ? params.season[0] : params.season;

  const [events, seasons] = await Promise.all([getTeamEvents(team.id), getTeamSeasons(team.id)]);
  const { pastMatches } = splitMatches(events);
  const selectedSeason = seasons.find((season) => season.id === seasonParam) ?? null;
  const filteredMatches = selectedSeason
    ? pastMatches.filter((match) => isWithinSeason(match.starts_at, selectedSeason))
    : pastMatches;

  const summary = await getTeamSeasonSummary(team.id, filteredMatches);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">팀 기록</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.name} · 경기 결과</p>
      </div>

      <SeasonPicker
        teamId={team.id}
        currentUserId={user.id}
        seasons={seasons}
        selectedSeasonId={selectedSeason?.id ?? null}
        canManage={canManage}
      />

      <TeamSeasonSummary periodLabel={selectedSeason ? selectedSeason.name : "전체 기간"} summary={summary} />

      <TeamRecordsManager teamName={team.name} matches={filteredMatches} canManage={canManage} />
    </main>
  );
}

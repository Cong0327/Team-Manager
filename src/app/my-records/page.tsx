import { redirect } from "next/navigation";
import { getTeamMatchRecords } from "@/lib/records-server";
import { getTeamSeasons } from "@/lib/seasons-server";
import { buildSeasonLeaderboard } from "@/lib/records";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import RecordsManager from "./records-manager";
import SeasonSelect from "./season-select";

// 개인 기록: 참여자별 골/어시스트/MOM 투표를 다룬다. 시즌 추가/수정/삭제 같은 관리는
// 팀 기록(/team-records)에서 하고, 여기서는 조회용 셀렉트로 시즌을 골라 그 기간의
// 스탯 요약 + 경기 카드만 필터링해서 보여준다.
export default async function MyRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team } = membership;

  const params = await searchParams;
  const seasonParam = Array.isArray(params.season) ? params.season[0] : params.season;

  const seasons = await getTeamSeasons(team.id);
  const selectedSeason = seasons.find((season) => season.id === seasonParam) ?? null;

  const records = await getTeamMatchRecords(team.id, user.id, selectedSeason ?? undefined);
  // 카드 목록 위 "내 스탯 요약"에 쓸 내 행만 뽑아 쓴다.
  const myRow = buildSeasonLeaderboard(records).find((row) => row.user_id === user.id) ?? null;

  return (
    <main className="app-page flex flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div>
        <p className="page-eyebrow">My performance</p><h1 className="page-title">개인 기록</h1>
        <p className="page-subtitle">
          {team.name} · 참여자별 골·어시스트·MOM 투표
        </p>
      </div>

      <SeasonSelect seasons={seasons} selectedSeasonId={selectedSeason?.id ?? null} />

      <p className="content-card p-4 text-sm font-medium text-slate-700">
        내 {selectedSeason ? selectedSeason.name : "전체 기간"} 기록 · ⚽ {myRow?.goals ?? 0}골 · 🅰
        {myRow?.assists ?? 0}도움 · ⭐ MOM {myRow?.momCount ?? 0}회 · {myRow?.matchesPlayed ?? 0}경기 출전
      </p>

      <RecordsManager records={records} />
    </main>
  );
}

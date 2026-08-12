import { createClient } from "@/lib/supabase/server";
import { getTeamSeasons } from "@/lib/seasons-server";
import { isWithinSeason, type Season } from "@/lib/seasons";

export type PlayerGoalAssistStats = {
  seasonGoals: number;
  seasonAssists: number;
  totalGoals: number;
  totalAssists: number;
};

export type TeamGoalAssistStats = {
  // 화면에서 실제로 선택된(또는 아무것도 안 골라 "전체 기간"인) 시즌. is_current와는 별개다 —
  // 예전엔 항상 팀의 현재 시즌만 썼지만, 명단관리에도 시즌 셀렉트가 생기면서 호출하는 쪽이
  // 어떤 시즌 기준으로 볼지 직접 정한다.
  currentSeason: Season | null;
  byUserId: Map<string, PlayerGoalAssistStats>;
};

// 명단관리 등에서 "골/어시스트"를 시즌 기준으로 보여줘야 해서, 경기별 기록(event_player_stats)을
// 팀 단위로 한 번에 모아 선택된 시즌 합/전체 합을 계산하는 공용 함수로 뺐다.
// event_player_stats에는 team_id가 없어 events를 거쳐 팀 소속 경기 id를 먼저 구한다.
// selectedSeason이 null이면 "전체 기간"으로 seasonGoals/seasonAssists는 항상 0이 된다
// (그 경우 호출하는 쪽에서 totalGoals/totalAssists를 주로 보여주면 된다).
export async function getTeamGoalAssistStats(
  teamId: string,
  selectedSeason: Season | null
): Promise<TeamGoalAssistStats> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, starts_at")
    .eq("team_id", teamId)
    .eq("event_type", "match");

  const startsAtByEventId = new Map((events ?? []).map((event) => [event.id, event.starts_at as string]));
  const eventIds = [...startsAtByEventId.keys()];

  const byUserId = new Map<string, PlayerGoalAssistStats>();
  if (eventIds.length === 0) return { currentSeason: selectedSeason, byUserId };

  const { data: stats } = await supabase
    .from("event_player_stats")
    .select("event_id, user_id, goals, assists")
    .in("event_id", eventIds);

  for (const row of stats ?? []) {
    const current = byUserId.get(row.user_id) ?? {
      seasonGoals: 0,
      seasonAssists: 0,
      totalGoals: 0,
      totalAssists: 0,
    };
    current.totalGoals += row.goals;
    current.totalAssists += row.assists;

    const startsAt = startsAtByEventId.get(row.event_id);
    if (selectedSeason && startsAt && isWithinSeason(startsAt, selectedSeason)) {
      current.seasonGoals += row.goals;
      current.seasonAssists += row.assists;
    }

    byUserId.set(row.user_id, current);
  }

  return { currentSeason: selectedSeason, byUserId };
}

const emptyStats: PlayerGoalAssistStats = { seasonGoals: 0, seasonAssists: 0, totalGoals: 0, totalAssists: 0 };

export function getPlayerGoalAssistStats(stats: TeamGoalAssistStats, userId: string): PlayerGoalAssistStats {
  return stats.byUserId.get(userId) ?? emptyStats;
}

export type PlayerSeasonStat = { goals: number; assists: number; matchesPlayed: number };

export type PlayerSeasonBreakdown = {
  seasons: Season[];
  total: PlayerSeasonStat;
  // Server Component -> Client Component 경계로 넘길 거라 Map 대신 일반 객체(직렬화 가능)로 둔다.
  bySeasonId: Record<string, PlayerSeasonStat>;
};

// 마이페이지 "선수 기록" 카드의 시즌 선택 셀렉트박스용: 이 유저의 골/어시스트/출전을
// 시즌마다(겹치는 기간이 있어도 각각 독립적으로) + 전체 통합 기준으로 미리 다 계산해서 내려준다.
// 셀렉트 변경은 순수 클라이언트 상태 전환이라 매번 서버를 다시 안 불러도 된다.
export async function getMySeasonBreakdown(teamId: string, userId: string): Promise<PlayerSeasonBreakdown> {
  const supabase = await createClient();
  const seasons = await getTeamSeasons(teamId);
  const empty: PlayerSeasonStat = { goals: 0, assists: 0, matchesPlayed: 0 };

  const { data: events } = await supabase
    .from("events")
    .select("id, starts_at")
    .eq("team_id", teamId)
    .eq("event_type", "match");

  const startsAtByEventId = new Map((events ?? []).map((event) => [event.id, event.starts_at as string]));
  const eventIds = [...startsAtByEventId.keys()];
  if (eventIds.length === 0) return { seasons, total: empty, bySeasonId: {} };

  const { data: stats } = await supabase
    .from("event_player_stats")
    .select("event_id, goals, assists")
    .eq("user_id", userId)
    .in("event_id", eventIds);

  const total: PlayerSeasonStat = { goals: 0, assists: 0, matchesPlayed: 0 };
  const bySeasonId: Record<string, PlayerSeasonStat> = {};

  for (const row of stats ?? []) {
    total.goals += row.goals;
    total.assists += row.assists;
    total.matchesPlayed += 1;

    const startsAt = startsAtByEventId.get(row.event_id);
    if (!startsAt) continue;

    for (const season of seasons) {
      if (!isWithinSeason(startsAt, season)) continue;
      const current = bySeasonId[season.id] ?? { goals: 0, assists: 0, matchesPlayed: 0 };
      current.goals += row.goals;
      current.assists += row.assists;
      current.matchesPlayed += 1;
      bySeasonId[season.id] = current;
    }
  }

  return { seasons, total, bySeasonId };
}

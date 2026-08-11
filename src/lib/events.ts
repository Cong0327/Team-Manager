import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type ParticipationStatus = "attending" | "declined";

// 일정 유형: 경기 | 훈련 | 기타.
export type EventType = "match" | "training" | "etc";

export type TeamEvent = {
  id: string;
  team_id: string;
  title: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  created_by: string;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
  match_notes: string | null;
  attending_count: number;
  declined_count: number;
  undecided_count: number;
  my_status: ParticipationStatus | "undecided";
};

// event_type이 'match'인 일정만 "경기"로 취급한다 (대시보드 다가오는/지난 경기 카드 대상).
// DB 제약상 경기는 항상 opponent_name을 가지므로 "vs 상대팀" 표시가 안전하다.
export function isMatch(event: TeamEvent) {
  return event.event_type === "match";
}

// Date.now()를 컴포넌트 렌더 중에 직접 호출하면 eslint(react-hooks/purity)에 걸리므로
// "현재 시각 기준으로 다가오는/지난 경기 나누기"를 여기 순수 헬퍼로 뺀다.
export function splitMatches(events: TeamEvent[], nowMs: number = Date.now()) {
  const matches = events.filter(isMatch);
  const upcomingMatch = matches.find((m) => new Date(m.starts_at).getTime() >= nowMs) ?? null;
  const pastMatches = matches
    .filter((m) => new Date(m.starts_at).getTime() < nowMs)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return { upcomingMatch, pastMatches };
}

// 팀의 전체 일정을 가져오면서 일정별 참석/불참/미정 인원 수와 "나"의 응답을 같이 계산해 붙인다.
// 미정은 별도 저장하지 않고 (승인된 팀원 수 - 참석 - 불참)으로 계산한다.
// 캘린더가 월 이동을 클라이언트에서 처리하므로 기간 필터 없이 팀 전체 일정을 한 번에 가져온다
// (소규모 동호회 팀 기준 데이터량이 작아 페이지네이션 없이도 충분함).
export async function getTeamEvents(teamId: string): Promise<TeamEvent[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id, team_id, title, event_type, starts_at, ends_at, created_by, opponent_name, our_score, opponent_score, match_notes"
    )
    .eq("team_id", teamId)
    .order("starts_at", { ascending: true });

  if (error || !events || events.length === 0) return [];

  // 서로 의존관계 없는 두 조회를 순차 실행하면 왕복이 그대로 더해져서(특히 지연이 큰 환경에서
  // 체감이 큼) Promise.all로 동시에 보낸다.
  const [{ count: approvedMemberCount }, { data: participants }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "approved"),
    supabase
      .from("event_participants")
      .select("event_id, user_id, status")
      .in(
        "event_id",
        events.map((e) => e.id)
      ),
  ]);

  return events.map((event) => {
    const rows = participants?.filter((p) => p.event_id === event.id) ?? [];
    const attending_count = rows.filter((p) => p.status === "attending").length;
    const declined_count = rows.filter((p) => p.status === "declined").length;
    const total = approvedMemberCount ?? rows.length;
    const undecided_count = Math.max(total - attending_count - declined_count, 0);
    const myRow = user ? rows.find((p) => p.user_id === user.id) : undefined;

    return {
      ...event,
      attending_count,
      declined_count,
      undecided_count,
      my_status: (myRow?.status as ParticipationStatus | undefined) ?? "undecided",
    };
  });
}

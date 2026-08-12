import type { TeamEvent } from "@/lib/events";

export type EventPlayerStatRow = {
  id: string;
  event_id: string;
  user_id: string;
  goals: number;
  assists: number;
  created_at: string;
};

export type EventMomVoteRow = {
  id: string;
  event_id: string;
  voter_user_id: string;
  voted_for_user_id: string;
  created_at: string;
};

export type MatchRecordAttendee = {
  user_id: string;
  name: string | null;
  email: string | null;
  goals: number;
  assists: number;
  statId: string | null;
  voteCount: number;
  isMom: boolean;
};

export type TeamMatchRecord = TeamEvent & {
  attendees: MatchRecordAttendee[];
  myVoteForUserId: string | null;
  currentUserAttended: boolean;
  canVote: boolean;
  voteOpen: boolean;
};

// MOM 마감 기준은 DB RLS의 KST 자정 계산과 화면 표시가 어긋나면 사용자가 저장 실패를 버그로 보게 되므로 한곳에서 맞춘다.
export function isMomVoteOpen(startsAt: string, now: Date = new Date()) {
  const kstParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(startsAt));

  const year = Number(kstParts.find((part) => part.type === "year")?.value);
  const month = Number(kstParts.find((part) => part.type === "month")?.value);
  const day = Number(kstParts.find((part) => part.type === "day")?.value);

  return now.getTime() < Date.UTC(year, month - 1, day, 15, 0, 0);
}

// 카드 헤더는 경기 흐름을 빠르게 훑는 영역이라 한국 시간 기준의 짧은 날짜만 노출한다.
export function formatMatchRecordDate(startsAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(startsAt));
}

export function formatMatchRecordScore(match: Pick<TeamEvent, "our_score" | "opponent_score">) {
  if (match.our_score === null || match.opponent_score === null) return "스코어 미입력";
  return `${match.our_score} : ${match.opponent_score}`;
}

// 팀 기록 카드에서 스코어 앞에 승/패/무를 붙이는 데 쓴다. 스코어가 둘 다 입력돼야 판정 가능.
export function getMatchResult(
  match: Pick<TeamEvent, "our_score" | "opponent_score">
): "승" | "패" | "무" | null {
  if (match.our_score === null || match.opponent_score === null) return null;
  if (match.our_score > match.opponent_score) return "승";
  if (match.our_score < match.opponent_score) return "패";
  return "무";
}

// 팀 기록 카드는 날짜와 시작 시각을 함께 보여줘야 해서 날짜와 별개로 시각만 따로 포맷한다.
export function formatMatchRecordTime(startsAt: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startsAt));
}

export type SeasonLeaderboardRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  matchesPlayed: number;
  goals: number;
  assists: number;
  momCount: number;
};

// 시즌 선택 시 카드 목록 위에 보여줄 리더보드. 이미 조립된 카드 데이터(attendees)를 그대로
// 합산하면 되므로 별도 쿼리 없이 순수 함수로 계산한다. 골 많은 순 → 어시스트 많은 순으로 정렬.
export function buildSeasonLeaderboard(records: TeamMatchRecord[]): SeasonLeaderboardRow[] {
  const byUserId = new Map<string, SeasonLeaderboardRow>();

  for (const record of records) {
    for (const attendee of record.attendees) {
      const row = byUserId.get(attendee.user_id) ?? {
        user_id: attendee.user_id,
        name: attendee.name,
        email: attendee.email,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        momCount: 0,
      };
      row.matchesPlayed += 1;
      row.goals += attendee.goals;
      row.assists += attendee.assists;
      if (attendee.isMom) row.momCount += 1;
      byUserId.set(attendee.user_id, row);
    }
  }

  return [...byUserId.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

// 팀 기록의 "팀 시즌 기간 기록" 요약(승/무/패/골/도움)에서 각 항목에 마우스오버/탭했을 때
// 보여줄 근거 목록. 승/무/패는 경기 단위, 골/도움은 (경기, 선수) 단위로 묶는다
// (event_player_stats가 "이 선수가 이 경기에서 몇 골"만 담고 있어 골 하나하나를 구분할 수는 없다).
export type MatchResultBreakdownItem = {
  matchId: string;
  opponentName: string;
  ourScore: number;
  opponentScore: number;
};

export type PlayerStatBreakdownItem = {
  matchId: string;
  opponentName: string;
  playerName: string;
  count: number;
};

export type TeamSeasonSummary = {
  wins: MatchResultBreakdownItem[];
  draws: MatchResultBreakdownItem[];
  losses: MatchResultBreakdownItem[];
  goalEntries: PlayerStatBreakdownItem[];
  assistEntries: PlayerStatBreakdownItem[];
  totalGoals: number;
  totalAssists: number;
};

export function formatResultBreakdownLine(item: MatchResultBreakdownItem) {
  return `vs ${item.opponentName} (${item.ourScore}:${item.opponentScore})`;
}

export function formatPlayerStatBreakdownLine(item: PlayerStatBreakdownItem) {
  return `vs ${item.opponentName} (${item.playerName})${item.count > 1 ? ` ×${item.count}` : ""}`;
}

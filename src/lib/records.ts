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

import { getTeamEvents, splitMatches } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { getTeamRoster } from "@/lib/teams";
import {
  isMomVoteOpen,
  type EventMomVoteRow,
  type EventPlayerStatRow,
  type TeamMatchRecord,
} from "@/lib/records";
import type { TeamEvent } from "@/lib/events";

type ParticipantRow = {
  event_id: string;
  user_id: string;
  status: "attending" | "declined";
};

export type LatestMatchMom = {
  userId: string;
  name: string;
  jerseyNumber: number | null;
  positions: string[];
  goals: number;
  assists: number;
  voteCount: number;
};

export type LatestMatchMomSummary = {
  match: Pick<TeamEvent, "id" | "starts_at" | "opponent_name" | "our_score" | "opponent_score">;
  winners: LatestMatchMom[];
};

// 홈 화면에는 가장 최근 경기의 MOM만 필요하다. 전체 경기 기록을 조립하지 않고
// 해당 경기의 투표·스탯·명단만 병렬 조회해 대시보드의 응답 크기와 쿼리량을 줄인다.
export async function getLatestMatchMom(
  teamId: string,
  match: TeamEvent | null
): Promise<LatestMatchMomSummary | null> {
  if (!match) return null;

  const supabase = await createClient();
  const [{ data: votes }, { data: stats }, roster] = await Promise.all([
    supabase
      .from("event_mom_votes")
      .select("voted_for_user_id")
      .eq("event_id", match.id),
    supabase
      .from("event_player_stats")
      .select("user_id, goals, assists")
      .eq("event_id", match.id),
    getTeamRoster(teamId),
  ]);

  const voteCountByUserId = new Map<string, number>();
  for (const vote of votes ?? []) {
    voteCountByUserId.set(
      vote.voted_for_user_id,
      (voteCountByUserId.get(vote.voted_for_user_id) ?? 0) + 1
    );
  }

  const topVoteCount = Math.max(0, ...voteCountByUserId.values());
  if (topVoteCount === 0) {
    return { match, winners: [] };
  }

  const statsByUserId = new Map((stats ?? []).map((stat) => [stat.user_id, stat]));
  const rosterByUserId = new Map(roster.map((member) => [member.user_id, member]));
  const winners = [...voteCountByUserId.entries()]
    .filter(([, count]) => count === topVoteCount)
    .map(([userId, voteCount]) => {
      const member = rosterByUserId.get(userId);
      const stat = statsByUserId.get(userId);
      return {
        userId,
        name: member?.profile?.name ?? member?.profile?.email ?? "이름 미등록",
        jerseyNumber: member?.jersey_number ?? null,
        positions: member?.positions ?? [],
        goals: stat?.goals ?? 0,
        assists: stat?.assists ?? 0,
        voteCount,
      };
    });

  return { match, winners };
}

// 경기 기록 화면은 여러 테이블을 한 카드 단위로 합쳐야 하므로 서버에서 한 번에 조립해 클라이언트 변경 로직을 단순하게 둔다.
export async function getTeamMatchRecords(teamId: string, currentUserId: string): Promise<TeamMatchRecord[]> {
  const supabase = await createClient();
  const [events, roster] = await Promise.all([getTeamEvents(teamId), getTeamRoster(teamId)]);
  const { pastMatches } = splitMatches(events);

  if (pastMatches.length === 0) return [];

  const eventIds = pastMatches.map((match) => match.id);
  const [{ data: participants }, { data: stats }, { data: votes }] = await Promise.all([
    supabase.from("event_participants").select("event_id, user_id, status").in("event_id", eventIds),
    supabase.from("event_player_stats").select("id, event_id, user_id, goals, assists, created_at").in("event_id", eventIds),
    supabase
      .from("event_mom_votes")
      .select("id, event_id, voter_user_id, voted_for_user_id, created_at")
      .in("event_id", eventIds),
  ]);

  const profileByUserId = new Map(
    roster.map((member) => [
      member.user_id,
      {
        name: member.profile?.name ?? null,
        email: member.profile?.email ?? null,
      },
    ])
  );
  const statsByEventAndUser = new Map(
    ((stats ?? []) as EventPlayerStatRow[]).map((stat) => [`${stat.event_id}:${stat.user_id}`, stat])
  );
  const votesByEventId = new Map<string, EventMomVoteRow[]>();

  for (const vote of (votes ?? []) as EventMomVoteRow[]) {
    votesByEventId.set(vote.event_id, [...(votesByEventId.get(vote.event_id) ?? []), vote]);
  }

  return pastMatches.map((match) => {
    const attending = ((participants ?? []) as ParticipantRow[]).filter(
      (participant) => participant.event_id === match.id && participant.status === "attending"
    );
    const currentUserAttended = attending.some((participant) => participant.user_id === currentUserId);
    const matchVotes = votesByEventId.get(match.id) ?? [];
    const voteCountByUserId = new Map<string, number>();

    for (const vote of matchVotes) {
      voteCountByUserId.set(vote.voted_for_user_id, (voteCountByUserId.get(vote.voted_for_user_id) ?? 0) + 1);
    }

    const topVoteCount = Math.max(0, ...attending.map((participant) => voteCountByUserId.get(participant.user_id) ?? 0));
    const voteOpen = isMomVoteOpen(match.starts_at);

    return {
      ...match,
      attendees: attending.map((participant) => {
        const profile = profileByUserId.get(participant.user_id);
        const stat = statsByEventAndUser.get(`${match.id}:${participant.user_id}`);

        return {
          user_id: participant.user_id,
          name: profile?.name ?? null,
          email: profile?.email ?? null,
          goals: stat?.goals ?? 0,
          assists: stat?.assists ?? 0,
          statId: stat?.id ?? null,
          voteCount: voteCountByUserId.get(participant.user_id) ?? 0,
          isMom: topVoteCount > 0 && (voteCountByUserId.get(participant.user_id) ?? 0) === topVoteCount,
        };
      }),
      myVoteForUserId: matchVotes.find((vote) => vote.voter_user_id === currentUserId)?.voted_for_user_id ?? null,
      currentUserAttended,
      canVote: voteOpen && currentUserAttended,
      voteOpen,
    };
  });
}

// 경기 기록 상세 페이지(/my-records/[eventId])용: 전체 목록에서 해당 경기 하나만 골라낸다.
// 팀 전체 지난 경기 수가 적은 소규모 동호회 기준이라 목록 계산 로직을 그대로 재사용해도 부담 없다.
export async function getMatchRecord(
  teamId: string,
  eventId: string,
  currentUserId: string
): Promise<TeamMatchRecord | null> {
  const records = await getTeamMatchRecords(teamId, currentUserId);
  return records.find((record) => record.id === eventId) ?? null;
}

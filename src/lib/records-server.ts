import { getTeamEvents, splitMatches } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { getTeamRoster } from "@/lib/teams";
import {
  isMomVoteOpen,
  type EventMomVoteRow,
  type EventPlayerStatRow,
  type TeamMatchRecord,
} from "@/lib/records";

type ParticipantRow = {
  event_id: string;
  user_id: string;
  status: "attending" | "declined";
};

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

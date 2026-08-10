import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type TeamEvent = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  created_by: string;
  participant_count: number;
  is_participating: boolean;
};

// 팀의 전체 일정을 가져오면서 일정별 참여인원 수와 "나"의 참여 여부를 같이 계산해 붙인다.
// 캘린더가 월 이동을 클라이언트에서 처리하므로 기간 필터 없이 팀 전체 일정을 한 번에 가져온다
// (소규모 동호회 팀 기준 데이터량이 작아 페이지네이션 없이도 충분함).
export async function getTeamEvents(teamId: string): Promise<TeamEvent[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, team_id, title, starts_at, ends_at, created_by")
    .eq("team_id", teamId)
    .order("starts_at", { ascending: true });

  if (error || !events || events.length === 0) return [];

  const { data: participants } = await supabase
    .from("event_participants")
    .select("event_id, user_id")
    .in(
      "event_id",
      events.map((e) => e.id)
    );

  return events.map((event) => {
    const rows = participants?.filter((p) => p.event_id === event.id) ?? [];
    return {
      ...event,
      participant_count: rows.length,
      is_participating: user ? rows.some((p) => p.user_id === user.id) : false,
    };
  });
}

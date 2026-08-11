import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type PollOption = {
  id: string;
  label: string;
  vote_count: number; // 이 보기를 고른 표 수(집계값)
};

export type Poll = {
  id: string;
  team_id: string;
  question: string;
  closes_at: string | null;
  created_by: string;
  created_at: string;
  options: PollOption[];
  total_votes: number; // 이 투표에 참여한 총 표 수
  my_option_id: string | null; // "내"가 고른 보기(없으면 null)
  is_closed: boolean; // closes_at이 지났는지 여부
};

// 팀의 투표 목록을 보기·집계·내 선택까지 조합해 최신순으로 돌려준다.
// 소규모 팀 기준 데이터량이 작아 투표/보기/표를 각각 한 번씩 가져와 앱에서 합친다.
export async function getTeamPolls(teamId: string): Promise<Poll[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: polls, error } = await supabase
    .from("polls")
    .select("id, team_id, question, closes_at, created_by, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !polls || polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id);

  // 보기와 표를 각각 한 번에 가져온다.
  const { data: options } = await supabase
    .from("poll_options")
    .select("id, poll_id, label, sort_order")
    .in("poll_id", pollIds)
    .order("sort_order", { ascending: true });

  const { data: votes } = await supabase
    .from("poll_votes")
    .select("poll_id, option_id, user_id")
    .in("poll_id", pollIds);

  const now = Date.now();

  return polls.map((poll) => {
    const pollOptions = options?.filter((o) => o.poll_id === poll.id) ?? [];
    const pollVotes = votes?.filter((v) => v.poll_id === poll.id) ?? [];

    return {
      ...poll,
      options: pollOptions.map((o) => ({
        id: o.id,
        label: o.label,
        vote_count: pollVotes.filter((v) => v.option_id === o.id).length,
      })),
      total_votes: pollVotes.length,
      my_option_id: user ? (pollVotes.find((v) => v.user_id === user.id)?.option_id ?? null) : null,
      is_closed: poll.closes_at ? new Date(poll.closes_at).getTime() < now : false,
    };
  });
}

import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type Team = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  owner_id: string;
  created_at: string;
};

export type TeamMemberStatus = "pending" | "approved";

export type TeamMembership = {
  id: string;
  team_id: string;
  role: "owner" | "member";
  status: TeamMemberStatus;
  team: Team;
};

// 로그인한 유저의 팀 멤버십(있다면 하나) + 팀 정보를 함께 가져온다.
// 사용자는 한 번에 한 팀에만 속한다고 가정한다 (여러 팀 지원은 지금 범위 밖).
export async function getMyTeamMembership(): Promise<TeamMembership | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id, team_id, role, status, team:teams(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  // Supabase가 관계를 배열로 반환하는 타입을 쓰지만 1:1 관계이므로 단일 객체로 정리한다.
  const team = Array.isArray(data.team) ? data.team[0] : data.team;
  return { ...data, team } as TeamMembership;
}

// 내가 팀장인 팀의 대기중인 가입신청 목록 (승인/거절 UI에서 사용).
// profiles와 조인해 신청자 이메일을 함께 보여준다 (auth.users는 클라이언트에서 조회 불가).
export async function getPendingRequests(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, user_id, created_at, profile:profiles(email)")
    .eq("team_id", teamId)
    .eq("status", "pending");

  if (error || !data) return [];
  return data.map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  }));
}

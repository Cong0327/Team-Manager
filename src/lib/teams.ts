import { cookies } from "next/headers";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const ACTIVE_TEAM_COOKIE = "active_team_id";

export type Team = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  owner_id: string;
  created_at: string;
  dues_account: string | null;
};

export type TeamMemberStatus = "pending" | "approved";
export type TeamMemberRole = "owner" | "manager" | "member";

export type TeamMembership = {
  id: string;
  team_id: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  team: Team;
};

// 로그인한 유저가 속한 모든 팀 멤버십(대기중 포함) + 팀 정보를 함께 가져온다.
// 한 유저가 여러 팀에 동시에 속할 수 있다.
export async function getMyTeamMemberships(): Promise<TeamMembership[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, team_id, role, status, team:teams(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // RLS 정책 오류 등으로 조회 자체가 실패한 경우도 데이터 없음(빈 배열)과 똑같이 처리되면
  // "팀이 아직 없음" 화면으로 오인될 수 있다(실제로 겪었던 RLS 무한 재귀 버그).
  // 로그로는 남겨서 이런 실패가 조용히 묻히지 않게 한다.
  if (error) console.error("getMyTeamMemberships 조회 실패:", error);
  if (!data) return [];
  return data.map((row) => {
    // Supabase가 관계를 배열로 반환하는 타입을 쓰지만 1:1 관계이므로 단일 객체로 정리한다.
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    return { ...row, team } as TeamMembership;
  });
}

// 여러 팀 중 지금 화면에 보여줄 "활성 팀" 하나를 정한다.
// active_team_id 쿠키가 가리키는 팀이 승인된 멤버십이면 그것을, 아니면(쿠키 없음/무효/
// 더는 그 팀 멤버가 아님) 승인된 팀 중 가장 먼저 가입한 팀을 기본값으로 쓴다.
export async function getActiveMembership(): Promise<TeamMembership | null> {
  const memberships = await getMyTeamMemberships();
  const approved = memberships.filter((m) => m.status === "approved");
  if (approved.length === 0) return null;

  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value;
  return approved.find((m) => m.team_id === activeTeamId) ?? approved[0];
}

// 승인된 팀원 목록 (매니저 지정 UI에서 사용). 이메일도 함께 가져온다.
export async function getApprovedMembers(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, user_id, role, profile:profiles(email)")
    .eq("team_id", teamId)
    .eq("status", "approved");

  if (error || !data) return [];
  return data.map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  }));
}

export type RosterMember = {
  id: string;
  user_id: string;
  role: TeamMemberRole;
  positions: string[];
  jersey_number: number | null;
  goals: number;
  assists: number;
  mom: number;
  created_at: string;
  // 나이는 birth_date로 계산한다(@/lib/age). age는 예전 데이터 호환용.
  profile: { email: string; name: string | null; age: number | null; birth_date: string | null } | null;
};

// 명단관리 페이지용: 별도 등록 없이 "이 팀에 가입해 승인된 사람들"을 그대로 명단으로 보여준다.
// 가입일(승인 여부와 무관하게 team_members 행 생성일) 순으로 정렬한다.
export async function getTeamRoster(teamId: string): Promise<RosterMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, user_id, role, positions, jersey_number, goals, assists, mom, created_at, profile:profiles(email, name, age, birth_date)"
    )
    .eq("team_id", teamId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  })) as RosterMember[];
}

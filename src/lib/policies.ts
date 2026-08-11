import { createClient } from "@/lib/supabase/server";

export type TeamPolicy = {
  id: string;
  team_id: string;
  title: string | null;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// 팀 회칙(team_policy) 목록을 최신 등록순(created_at 내림차순)으로 가져온다.
// 조회 권한(승인된 팀원)은 RLS가 보장하므로 여기서는 team_id 필터만 건다.
export async function getTeamPolicies(teamId: string): Promise<TeamPolicy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_policy")
    .select("id, team_id, title, content, created_by, created_at, updated_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as TeamPolicy[];
}

import { createClient } from "@/lib/supabase/server";

export type TeamInvite = {
  id: string;
  team_id: string;
  token: string;
};

// RLS가 owner/manager만 조회 가능하게 막아뒀으므로, 그 외 역할이면 항상 null이 온다.
export async function getTeamInvite(teamId: string): Promise<TeamInvite | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_invites")
    .select("id, team_id, token")
    .eq("team_id", teamId)
    .maybeSingle();

  return data;
}

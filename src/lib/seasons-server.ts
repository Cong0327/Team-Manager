import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/lib/seasons";

// 최근 시즌이 먼저 보이는 게 선택 드롭다운/관리 목록 모두에 자연스러워 시작일 내림차순으로 정렬한다.
export async function getTeamSeasons(teamId: string): Promise<Season[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_seasons")
    .select("id, team_id, name, start_date, end_date, is_current, created_by, created_at")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  if (error) console.error("getTeamSeasons 조회 실패:", error);
  return (data as Season[]) ?? [];
}

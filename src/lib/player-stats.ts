import { createClient, getCurrentUser } from "@/lib/supabase/server";

// 마이페이지 상세정보/기록 카드에서 쓰는, "활성 팀 기준 내 선수 데이터".
export type MyRosterEntry = {
  id: string; // team_members 행 id (상세정보 폼에서 positions/jersey 수정 대상)
  positions: string[];
  jersey_number: number | null;
  goals: number;
  assists: number;
  mom: number;
};

// 참석한 경기 한 건(상세정보 카드의 "출전 경기" 목록에 쓴다).
export type AttendedMatch = {
  id: string;
  title: string;
  starts_at: string;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
};

export type MyMatchStats = {
  totalMatches: number; // 팀의 지난 경기 총 수(출석률 분모)
  attendedCount: number; // 그중 내가 '참석'한 경기 수(=출전 경기, 기록 카드의 '경기')
  attendanceRate: number | null; // 출석률(%). 지난 경기가 없으면 null.
  attendedMatches: AttendedMatch[]; // 참석한 경기 목록(최신순)
};

// 활성 팀에서 "나"의 team_members 행을 가져온다. 상세정보/기록 카드의 기본 데이터.
export async function getMyRosterEntry(teamId: string): Promise<MyRosterEntry | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("id, positions, jersey_number, goals, assists, mom")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data as MyRosterEntry | null;
}

// "경기"는 상대팀명(opponent_name)이 있는 이벤트다. 이미 시작된(지난) 경기만 출석 집계 대상으로 삼는다.
// 출석률 = 내가 '참석(attending)'한 지난 경기 수 / 지난 경기 총 수.
export async function getMyMatchStats(teamId: string): Promise<MyMatchStats> {
  const empty: MyMatchStats = {
    totalMatches: 0,
    attendedCount: 0,
    attendanceRate: null,
    attendedMatches: [],
  };

  const user = await getCurrentUser();
  if (!user) return empty;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: matches } = await supabase
    .from("events")
    .select("id, title, starts_at, opponent_name, our_score, opponent_score")
    .eq("team_id", teamId)
    .eq("event_type", "match") // 경기만
    .lte("starts_at", nowIso) // 이미 열린(지난) 경기만
    .order("starts_at", { ascending: false });

  if (!matches || matches.length === 0) return empty;

  const matchIds = matches.map((m) => m.id);
  const { data: myRows } = await supabase
    .from("event_participants")
    .select("event_id, status")
    .eq("user_id", user.id)
    .eq("status", "attending")
    .in("event_id", matchIds);

  const attendedIds = new Set((myRows ?? []).map((r) => r.event_id));
  const attendedMatches = matches.filter((m) => attendedIds.has(m.id)) as AttendedMatch[];

  return {
    totalMatches: matches.length,
    attendedCount: attendedMatches.length,
    attendanceRate: Math.round((attendedMatches.length / matches.length) * 100),
    attendedMatches,
  };
}

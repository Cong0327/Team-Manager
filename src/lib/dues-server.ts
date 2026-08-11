import { createClient } from "@/lib/supabase/server";
import { getTeamRoster } from "@/lib/teams";
import { monthToDate, type MonthlyDues, type MonthlyPayRow } from "@/lib/dues";

export type MyDuesOverview = {
  duesAccount: string | null;
  currentMonth: MonthlyPayRow | null;
  history: MonthlyPayRow[];
};

// next/headers(createClient)를 쓰는 서버 전용 조회는 dues.ts와 분리한다.
// dues-manager.tsx 같은 client 컴포넌트가 dues.ts의 타입/포맷 함수만 가져다 써도
// 같은 파일에 서버 전용 import가 있으면 번들에 딸려 들어가 "next/headers는 App Router의
// Server Component에서만 쓸 수 있다" 에러가 난다(실제로 겪은 버그).
export async function getMonthlyDues(teamId: string, month: string): Promise<MonthlyDues> {
  const supabase = await createClient();
  const yearMonth = monthToDate(month);

  // 서로 의존관계 없는 조회라 Promise.all로 동시에 보낸다.
  const [roster, { data: pays }] = await Promise.all([
    getTeamRoster(teamId),
    supabase
      .from("team_monthly_pay")
      .select("id, team_id, user_id, year_month, amount, due_date, paid, paid_at, created_at")
      .eq("team_id", teamId)
      .eq("year_month", yearMonth)
      .order("created_at", { ascending: true }),
  ]);

  const payByUserId = new Map((pays ?? []).map((pay) => [pay.user_id, pay as MonthlyPayRow]));
  const firstPay = (pays ?? [])[0] as MonthlyPayRow | undefined;

  const members = roster.map((member) => ({
    user_id: member.user_id,
    name: member.profile?.name ?? null,
    email: member.profile?.email ?? null,
    pay: payByUserId.get(member.user_id) ?? null,
  }));

  return {
    yearMonth,
    displayMonth: month,
    amount: firstPay?.amount ?? null,
    dueDate: firstPay?.due_date ?? null,
    members,
    totalCount: members.length,
    paidCount: members.filter((member) => member.pay?.paid).length,
  };
}

// 일반 회원 화면용: 선택한 달의 내 납부 상태 + 계좌 안내 + 전체 납부 이력을 한 번에 모은다.
// 이력은 최신 달이 위로 오게 정렬해서 "매월 회비납부 로그"로 그대로 보여줄 수 있게 한다.
export async function getMyDuesOverview(
  teamId: string,
  userId: string,
  month: string
): Promise<MyDuesOverview> {
  const supabase = await createClient();
  const yearMonth = monthToDate(month);

  const [{ data: team }, { data: rows }] = await Promise.all([
    supabase.from("teams").select("dues_account").eq("id", teamId).single(),
    supabase
      .from("team_monthly_pay")
      .select("id, team_id, user_id, year_month, amount, due_date, paid, paid_at, created_at")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .order("year_month", { ascending: false }),
  ]);

  const history = (rows ?? []) as MonthlyPayRow[];

  return {
    duesAccount: team?.dues_account ?? null,
    currentMonth: history.find((row) => row.year_month === yearMonth) ?? null,
    history,
  };
}

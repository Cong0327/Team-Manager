export type MonthlyPayRow = {
  id: string;
  team_id: string;
  user_id: string;
  year_month: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export type DuesMember = {
  user_id: string;
  name: string | null;
  email: string | null;
  pay: MonthlyPayRow | null;
};

export type MonthlyDues = {
  yearMonth: string;
  displayMonth: string;
  amount: number | null;
  dueDate: string | null;
  members: DuesMember[];
  totalCount: number;
  paidCount: number;
};

// URL에는 YYYY-MM만 노출하고 DB에는 항상 월 첫날 date를 저장해야 월별 unique key가 흔들리지 않는다.
export function normalizeMonthParam(month: string | string[] | undefined) {
  const raw = Array.isArray(month) ? month[0] : month;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// date 컬럼 비교값을 로컬 타임존 변환 없이 안정적으로 만들기 위해 문자열 조합만 사용한다.
export function monthToDate(month: string) {
  return `${month}-01`;
}

// 월 이동 링크가 달 말/윤년 영향을 받지 않도록 UTC 기준으로 월 첫날에서만 계산한다.
export function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// 설정 폼의 기본 마감일은 팀 운영에서 흔한 25일로 두되, 저장 시 감독/매니저가 명시적으로 바꿀 수 있게 한다.
export function defaultDueDateForMonth(month: string) {
  return `${month}-25`;
}

// 숫자 입력값은 화면과 DB가 모두 원 단위 정수라는 전제를 공유해야 해서 표시 포맷을 한 곳으로 모은다.
export function formatWon(amount: number | null) {
  if (amount === null) return "미설정";
  return `${amount.toLocaleString("ko-KR")}원`;
}

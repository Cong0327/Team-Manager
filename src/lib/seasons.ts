export type Season = {
  id: string;
  team_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_by: string;
  created_at: string;
};

export function formatSeasonRange(season: Pick<Season, "start_date" | "end_date">) {
  return `${season.start_date} ~ ${season.end_date}`;
}

// 경기 시각(timestamptz)이 시즌 기간(date, 경계 포함) 안에 드는지 판단한다.
// 이 앱은 경기 날짜를 한국 시간 기준으로 다루므로(MOM 마감 계산과 동일한 원칙),
// UTC로 비교하면 자정 근처 경기가 하루 어긋나 보일 수 있어 KST 달력 날짜로 변환해서 비교한다.
export function isWithinSeason(startsAtIso: string, season: Pick<Season, "start_date" | "end_date">) {
  const kstDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(startsAtIso));
  return kstDate >= season.start_date && kstDate <= season.end_date;
}

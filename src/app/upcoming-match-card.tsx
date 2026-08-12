import type { TeamEvent } from "@/lib/events";

function formatMatchDate(iso: string) {
  const d = new Date(iso);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${weekday}) ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 카드2: 가장 가까운 다가오는 경기(상대팀명 있음 + 시작시간이 미래) 요약.
// 참석 투표는 바로 위 '다가오는 일정' 카드에서만 제공한다.
export default function UpcomingMatchCard({ match }: { match: TeamEvent | null }) {
  return (
    <div
      id="upcoming-match"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]"
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">다가오는 경기</h2>
      {match ? (
        <div>
          <p className="text-lg font-semibold">vs {match.opponent_name}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMatchDate(match.starts_at)}</p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">예정된 경기가 없어요.</p>
      )}
    </div>
  );
}

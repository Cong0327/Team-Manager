import type { TeamEvent } from "@/lib/events";
import RsvpButtons from "./rsvp-buttons";

function formatMatchDate(iso: string) {
  const d = new Date(iso);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${weekday}) ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 카드2: 가장 가까운 다가오는 경기(상대팀명 있음 + 시작시간이 미래) 요약과 참석 투표.
export default function UpcomingMatchCard({
  match,
  currentUserId,
}: {
  match: TeamEvent | null;
  currentUserId: string;
}) {
  return (
    <div
      id="upcoming-match"
      className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]"
    >
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">다가오는 경기</h2>
      {match ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-lg font-semibold">vs {match.opponent_name}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMatchDate(match.starts_at)}</p>
          </div>
          <RsvpButtons
            eventId={match.id}
            currentUserId={currentUserId}
            initialStatus={match.my_status}
            initialCounts={{
              attending: match.attending_count,
              declined: match.declined_count,
              undecided: match.undecided_count,
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">예정된 경기가 없어요.</p>
      )}
    </div>
  );
}

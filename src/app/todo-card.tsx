import Link from "next/link";
import type { TeamEvent } from "@/lib/events";

// 카드4: 지금 해야 할 일. 다음 경기 참석 여부를 아직 안 정했으면 알려주고,
// MVP 투표는 아직 기능이 없어 자리만 잡아둔다(추후 별도 구현).
export default function TodoCard({ upcomingMatch }: { upcomingMatch: TeamEvent | null }) {
  const needsRsvp = upcomingMatch !== null && upcomingMatch.my_status === "undecided";

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">해야할 일</h2>
      <ul className="flex flex-col gap-2">
        {needsRsvp && (
          <li>
            <Link
              href="#upcoming-match"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              <span>다음 경기(vs {upcomingMatch!.opponent_name}) 참석 여부 정하기</span>
              <span className="text-zinc-400">→</span>
            </Link>
          </li>
        )}
        <li className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-400">
          <span>MVP 투표</span>
          <span className="text-xs">준비중</span>
        </li>
        {!needsRsvp && (
          <li className="px-3 py-1 text-sm text-zinc-500">
            {upcomingMatch ? "다음 경기 참석 여부를 이미 정했어요." : "지금은 처리할 일이 없어요."}
          </li>
        )}
      </ul>
    </div>
  );
}

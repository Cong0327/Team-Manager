import type { LatestMatchMomSummary } from "@/lib/records-server";
import { formatMatchRecordDate, formatMatchRecordScore } from "@/lib/records";

export default function LatestMomCard({ summary }: { summary: LatestMatchMomSummary | null }) {
  if (!summary) return null;

  const opponent = summary.match.opponent_name ?? "상대팀";

  return (
    <section className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <div aria-hidden className="absolute -right-5 -top-7 text-[7rem] leading-none text-amber-400 opacity-[.07]">★</div>
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-400" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-base dark:bg-amber-900/40">🏆</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-600 dark:text-amber-400">Man of the Match</p>
                <h2 className="text-sm font-semibold">이전 경기 MOM</h2>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>{formatMatchRecordDate(summary.match.starts_at)} · vs {opponent}</p>
            <p className="mt-0.5 font-bold">{formatMatchRecordScore(summary.match)}</p>
          </div>
        </div>

        {summary.winners.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-black/[.1] bg-black/[.02] p-3 text-center text-sm text-zinc-500 dark:border-white/[.12] dark:bg-white/[.03]">
            아직 MOM 투표 결과가 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.winners.map((winner) => (
              <article key={winner.userId} className="group relative overflow-hidden rounded-xl border border-black/[.08] bg-black/[.015] p-3.5 dark:border-white/[.1] dark:bg-white/[.03]">
                <div aria-hidden className="absolute -right-3 -top-4 rotate-12 text-6xl opacity-10 transition-transform group-hover:scale-110">🏆</div>
                <div className="relative flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm ring-1 ring-amber-400 dark:bg-zinc-100 dark:text-zinc-950">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">No.</span>
                    <span className="text-xl font-black leading-none">{winner.jerseyNumber ?? "–"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{winner.name}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {winner.positions.length > 0 ? winner.positions.join(" · ") : "포지션 미등록"}
                    </p>
                  </div>
                </div>
                <div className="relative mt-3 grid grid-cols-3 divide-x divide-black/[.07] rounded-lg bg-black/[.03] py-2 text-center dark:divide-white/[.08] dark:bg-white/[.05]">
                  <MomStat label="골" value={winner.goals} />
                  <MomStat label="도움" value={winner.assists} />
                  <MomStat label="득표" value={winner.voteCount} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MomStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-black tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold text-amber-800/70 dark:text-amber-200/70">{label}</p>
    </div>
  );
}

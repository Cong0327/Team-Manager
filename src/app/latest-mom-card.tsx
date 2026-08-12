import type { LatestMatchMomSummary } from "@/lib/records-server";
import { formatMatchRecordDate, formatMatchRecordScore } from "@/lib/records";

export default function LatestMomCard({ summary }: { summary: LatestMatchMomSummary | null }) {
  if (!summary) return null;

  const opponent = summary.match.opponent_name ?? "상대팀";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-yellow-300/60 bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 p-5 shadow-[0_18px_50px_-24px_rgba(217,119,6,.65)] sm:p-7 dark:border-yellow-700/50 dark:from-yellow-950/60 dark:via-amber-950/40 dark:to-orange-950/50">
      <div aria-hidden className="absolute -right-8 -top-10 text-[9rem] leading-none opacity-[.08]">★</div>
      <div aria-hidden className="absolute left-1/4 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-lg shadow-lg shadow-yellow-500/30">🏆</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-700 dark:text-amber-300">Man of the Match</p>
                <h2 className="text-lg font-black tracking-tight">이전 경기 MOM</h2>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-amber-900/70 dark:text-amber-100/70">
            <p>{formatMatchRecordDate(summary.match.starts_at)} · vs {opponent}</p>
            <p className="mt-0.5 font-bold">{formatMatchRecordScore(summary.match)}</p>
          </div>
        </div>

        {summary.winners.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-amber-400/60 bg-white/40 p-5 text-center text-sm text-amber-900/70 dark:bg-black/10 dark:text-amber-100/70">
            아직 MOM 투표 결과가 없습니다.
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {summary.winners.map((winner) => (
              <article key={winner.userId} className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-4 shadow-md backdrop-blur dark:border-white/10 dark:bg-black/20">
                <div aria-hidden className="absolute -right-3 -top-4 rotate-12 text-6xl opacity-10 transition-transform group-hover:scale-110">🏆</div>
                <div className="relative flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white shadow-lg ring-2 ring-yellow-400 ring-offset-2 ring-offset-amber-50 dark:ring-offset-amber-950">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">No.</span>
                    <span className="text-2xl font-black leading-none">{winner.jerseyNumber ?? "–"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-black">{winner.name}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {winner.positions.length > 0 ? winner.positions.join(" · ") : "포지션 미등록"}
                    </p>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-3 divide-x divide-amber-200/70 rounded-xl bg-amber-100/60 py-2.5 text-center dark:divide-amber-800/60 dark:bg-amber-900/20">
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

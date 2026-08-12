import type { LatestMatchMomSummary } from "@/lib/records-server";
import { formatMatchRecordDate, formatMatchRecordScore } from "@/lib/records";

export default function LatestMomCard({ summary }: { summary: LatestMatchMomSummary | null }) {
  const opponent = summary?.match.opponent_name ?? "상대팀";

  return (
    <section className="surface-card relative overflow-hidden p-4 sm:p-5">
      <div aria-hidden className="absolute -right-5 -top-7 text-[7rem] leading-none text-amber-400 opacity-[.06]">★</div>
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-600" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-base ring-1 ring-amber-100">🏆</span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.18em] text-amber-600">Man of the Match</p>
                <h2 className="surface-card-title mt-0.5">이전 경기 MOM</h2>
              </div>
            </div>
          </div>
          {summary && (
            <div className="text-right text-xs text-zinc-500">
              <p>{formatMatchRecordDate(summary.match.starts_at)} · vs {opponent}</p>
              <p className="mt-0.5 font-bold">{formatMatchRecordScore(summary.match)}</p>
            </div>
          )}
        </div>

        {!summary ? (
          <div className="mt-4 rounded-xl border border-dashed border-black/[.1] bg-black/[.02] p-3 text-center text-sm text-zinc-500 dark:border-white/[.12] dark:bg-white/[.03]">
            아직 완료된 경기 기록이 없습니다.
          </div>
        ) : summary.winners.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-black/[.1] bg-black/[.02] p-3 text-center text-sm text-zinc-500 dark:border-white/[.12] dark:bg-white/[.03]">
            아직 MOM 투표 결과가 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {summary.winners.map((winner) => (
              <article key={winner.userId} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div aria-hidden className="absolute -right-3 -top-4 rotate-12 text-6xl opacity-10 transition-transform group-hover:scale-110">🏆</div>
                <div className="relative flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-900 text-white shadow-md ring-1 ring-amber-400">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">No.</span>
                    <span className="text-xl font-black leading-none">{winner.jerseyNumber ?? "–"}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{winner.name}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-blue-600">
                      {winner.positions.length > 0 ? winner.positions.join(" · ") : "포지션 미등록"}
                    </p>
                  </div>
                </div>
                <div className="relative mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-lg bg-white py-2 text-center ring-1 ring-slate-200/70">
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
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { TeamEvent } from "@/lib/events";
import EventModal from "./event-modal";

function formatMatchDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function resultBadge(match: TeamEvent) {
  if (match.our_score === null || match.opponent_score === null) return null;
  if (match.our_score > match.opponent_score) return { label: "승", className: "text-blue-600 dark:text-blue-400" };
  if (match.our_score < match.opponent_score) return { label: "패", className: "text-red-600 dark:text-red-400" };
  return { label: "무", className: "text-zinc-500" };
}

// 카드3: 지난 경기(상대팀명 있음 + 시작시간이 과거) 목록. 클릭하면 기존 EventModal을 열어
// 결과 조회/입력, 참석 응답 확인까지 같은 컴포넌트로 처리한다.
export default function PastMatchesCard({
  matches,
  teamId,
  teamName,
  canManage,
  currentUserId,
}: {
  matches: TeamEvent[];
  teamId: string;
  teamName: string;
  canManage: boolean;
  currentUserId: string;
}) {
  const [selected, setSelected] = useState<TeamEvent | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">지난 경기 결과</h2>
      {matches.length === 0 ? (
        <p className="text-sm text-zinc-500">지난 경기가 없어요.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
          {matches.map((match) => {
            const badge = resultBadge(match);
            return (
              <li key={match.id}>
                <button
                  onClick={() => setSelected(match)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.04]"
                >
                  <span className="text-zinc-500">{formatMatchDate(match.starts_at)}</span>
                  <span className="flex-1 truncate font-medium">vs {match.opponent_name}</span>
                  {badge ? (
                    <span className={`font-semibold ${badge.className}`}>
                      {badge.label} {match.our_score}:{match.opponent_score}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">결과 미입력</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <EventModal
          teamId={teamId}
          teamName={teamName}
          date={new Date(selected.starts_at)}
          event={selected}
          canManage={canManage}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

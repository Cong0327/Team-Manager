"use client";

import { useState } from "react";
import {
  formatPlayerStatBreakdownLine,
  formatResultBreakdownLine,
  type TeamSeasonSummary,
} from "@/lib/records";

type Props = {
  periodLabel: string;
  summary: TeamSeasonSummary;
};

// "팀 시즌 기간 기록" 한 줄 요약. 개인 기록 페이지의 "내 OO 기록 · ⚽N골 ..." 줄과 같은 톤으로 두되,
// 항목마다 마우스오버(데스크톱)/탭(모바일)하면 그 숫자의 근거(어떤 경기·누구였는지)를 보여준다.
// group-hover만 쓰면 모바일에서 하나도 안 보이는 문제가 있었어서(캘린더 버그) 클릭 토글을 기본으로 하고
// 데스크톱에서는 hover로도 열리게 얹었다.
export default function TeamSeasonSummary({ periodLabel, summary }: Props) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span>팀 {periodLabel} 기록 ·</span>
      <StatToken label="승" value={summary.wins.length} lines={summary.wins.map(formatResultBreakdownLine)} />
      <span>·</span>
      <StatToken label="무" value={summary.draws.length} lines={summary.draws.map(formatResultBreakdownLine)} />
      <span>·</span>
      <StatToken label="패" value={summary.losses.length} lines={summary.losses.map(formatResultBreakdownLine)} />
      <span>·</span>
      <StatToken
        icon="⚽"
        label="골"
        value={summary.totalGoals}
        lines={summary.goalEntries.map(formatPlayerStatBreakdownLine)}
      />
      <span>·</span>
      <StatToken
        icon="🅰"
        label="도움"
        value={summary.totalAssists}
        lines={summary.assistEntries.map(formatPlayerStatBreakdownLine)}
      />
    </p>
  );
}

function StatToken({
  icon,
  label,
  value,
  lines,
}: {
  icon?: string;
  label: string;
  value: number;
  lines: string[];
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = lines.length > 0;

  return (
    <span
      className="group relative inline-flex"
      onMouseEnter={() => hasDetail && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        disabled={!hasDetail}
        className={hasDetail ? "underline decoration-dotted underline-offset-2" : ""}
      >
        {icon} {value}
        {label}
      </button>
      {open && hasDetail && (
        <span className="absolute left-0 top-full z-10 mt-1 flex max-h-48 w-max max-w-[240px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-black/[.1] bg-white p-2 text-xs normal-case text-zinc-700 shadow-lg dark:border-white/[.15] dark:bg-zinc-900 dark:text-zinc-200">
          {lines.map((line, i) => (
            <span key={i} className="whitespace-nowrap">
              {line}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

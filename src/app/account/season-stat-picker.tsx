"use client";

import { useState } from "react";
import type { Season } from "@/lib/seasons";
import type { PlayerSeasonStat } from "@/lib/season-stats-server";

type Props = {
  seasons: Season[];
  total: PlayerSeasonStat;
  bySeasonId: Record<string, PlayerSeasonStat>;
};

// 마이페이지 "선수 기록" 카드 전용: 서버가 시즌별 값을 전부 미리 계산해 내려주므로
// 셀렉트 변경은 페이지 이동/재조회 없이 클라이언트 상태만 바꿔서 즉시 반영한다.
// 기본값은 "전체 기록"(모든 시즌 통합)이다.
export default function SeasonStatPicker({ seasons, total, bySeasonId }: Props) {
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const stat = selectedSeasonId
    ? (bySeasonId[selectedSeasonId] ?? { goals: 0, assists: 0, matchesPlayed: 0 })
    : total;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-zinc-500">시즌별 골·어시스트</span>
        <select
          value={selectedSeasonId}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="rounded border border-black/[.15] px-2 py-1.5 text-xs dark:border-white/[.2]"
        >
          <option value="">전체 기록</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.is_current ? " ★" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="골" value={stat.goals} />
        <StatTile label="어시스트" value={stat.assists} />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-black/[.02] py-3 dark:bg-white/[.03]">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

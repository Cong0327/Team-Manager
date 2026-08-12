"use client";

import { useRouter } from "next/navigation";
import type { Season } from "@/lib/seasons";

type Props = {
  seasons: Season[];
  selectedSeasonId: string | null;
};

// 명단관리 전용 "조회만" 되는 시즌 셀렉트. 골/어시스트를 어느 시즌 기준으로 볼지만 고른다
// (시즌 추가/수정/삭제 같은 관리 기능은 팀 기록(/team-records)에 있다).
export default function SeasonSelect({ seasons, selectedSeasonId }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedSeasonId ?? ""}
      onChange={(e) => router.push(e.target.value ? `/roster?season=${e.target.value}` : "/roster")}
      className="self-start rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
    >
      <option value="">전체 기간</option>
      {seasons.map((season) => (
        <option key={season.id} value={season.id}>
          {season.name}
          {season.is_current ? " ★" : ""}
        </option>
      ))}
    </select>
  );
}

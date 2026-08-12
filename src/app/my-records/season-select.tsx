"use client";

import { useRouter } from "next/navigation";
import type { Season } from "@/lib/seasons";

type Props = {
  seasons: Season[];
  selectedSeasonId: string | null;
};

// 개인 기록 페이지 전용 "조회만" 되는 시즌 셀렉트. 시즌 추가/수정/삭제 같은 관리 기능은
// 팀 기록(/team-records)의 SeasonPicker로 옮겼고, 여기서는 어떤 시즌 기록을 볼지 고르기만 한다.
export default function SeasonSelect({ seasons, selectedSeasonId }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedSeasonId ?? ""}
      onChange={(e) => router.push(e.target.value ? `/my-records?season=${e.target.value}` : "/my-records")}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ParticipationStatus } from "@/lib/events";

// 참석=파랑, 미정=노랑, 불참=빨강. 선택된 버튼은 배경을 채우고, 나머지는 같은 색 테두리만 준다.
const RSVP_STYLE: Record<ParticipationStatus | "undecided", { label: string; active: string; inactive: string }> = {
  attending: {
    label: "참석",
    active: "bg-blue-600 text-white",
    inactive: "border border-blue-300 text-blue-600 dark:border-blue-800 dark:text-blue-400",
  },
  undecided: {
    label: "미정",
    active: "bg-yellow-500 text-black",
    inactive: "border border-yellow-300 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400",
  },
  declined: {
    label: "불참",
    active: "bg-red-600 text-white",
    inactive: "border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400",
  },
};

// 경기 상세 모달과 대시보드 카드에서 공통으로 쓰는 참석 응답(참석/미정/불참) 위젯.
// 미정은 row 삭제로 표현한다(lib/events.ts의 집계 방식과 짝이 맞아야 함).
export default function RsvpButtons({
  eventId,
  currentUserId,
  initialStatus,
  initialCounts,
}: {
  eventId: string;
  currentUserId: string;
  initialStatus: ParticipationStatus | "undecided";
  initialCounts: { attending: number; declined: number; undecided: number };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [counts, setCounts] = useState(initialCounts);

  // 같은 이벤트의 RSVP 위젯이 한 화면에 여러 개 렌더될 수 있다(예: 대시보드의 "다가오는 일정 참석 투표"
  // 카드와 "다가오는 경기" 카드). 한쪽에서 투표하면 router.refresh()로 서버가 새 값(props)을 내려주는데,
  // 그 값을 로컬 state에 반영해 위젯끼리 어긋나지 않게 한다.
  // React가 공식 지원하는 "렌더 중 prop 변화 감지 후 setState" 패턴(useEffect보다 효율적). prop이
  // 실제로 바뀐 렌더에서만 1회 동기화하므로, 투표 직후 낙관적 업데이트가 불필요하게 되돌려지지 않는다.
  const { attending, declined, undecided } = initialCounts;
  const propsKey = `${initialStatus}|${attending}|${declined}|${undecided}`;
  const [syncedKey, setSyncedKey] = useState(propsKey);
  if (propsKey !== syncedKey) {
    setSyncedKey(propsKey);
    setStatus(initialStatus);
    setCounts({ attending, declined, undecided });
  }

  const setRsvp = async (next: ParticipationStatus | "undecided") => {
    if (next === status) return;
    setLoading(true);
    const supabase = createClient();
    const prev = status;

    if (next === "undecided") {
      await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", currentUserId);
    } else if (prev === "undecided") {
      await supabase.from("event_participants").insert({ event_id: eventId, user_id: currentUserId, status: next });
    } else {
      await supabase
        .from("event_participants")
        .update({ status: next })
        .eq("event_id", eventId)
        .eq("user_id", currentUserId);
    }

    setCounts((c) => ({
      attending: c.attending + (next === "attending" ? 1 : 0) - (prev === "attending" ? 1 : 0),
      declined: c.declined + (next === "declined" ? 1 : 0) - (prev === "declined" ? 1 : 0),
      undecided: c.undecided + (next === "undecided" ? 1 : 0) - (prev === "undecided" ? 1 : 0),
    }));
    setStatus(next);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        참석 {counts.attending} · 미정 {counts.undecided} · 불참 {counts.declined}
      </p>
      <div className="flex gap-2">
        {(["attending", "undecided", "declined"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setRsvp(s)}
            disabled={loading}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              status === s ? RSVP_STYLE[s].active : RSVP_STYLE[s].inactive
            }`}
          >
            {RSVP_STYLE[s].label}
          </button>
        ))}
      </div>
    </div>
  );
}

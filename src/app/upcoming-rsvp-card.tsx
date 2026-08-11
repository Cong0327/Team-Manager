"use client";

import { useState } from "react";
import type { TeamEvent, EventType } from "@/lib/events";
import RsvpButtons from "./rsvp-buttons";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const TYPE_LABEL: Record<EventType, string> = { match: "경기", training: "훈련", etc: "기타" };
const TYPE_BADGE: Record<EventType, string> = {
  match: "bg-red-500/15 text-red-600 dark:text-red-400",
  training: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  etc: "bg-zinc-400/15 text-zinc-500 dark:text-zinc-400",
};

function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 다가오는 일정마다 참석 투표(참석/미정/불참)를 바로 할 수 있는 카드.
// 캘린더를 클릭하지 않고도 같은 화면에서 투표할 수 있게 대시보드/일정 화면에서 함께 쓴다.
export default function UpcomingRsvpCard({
  events,
  currentUserId,
}: {
  events: TeamEvent[];
  currentUserId: string;
}) {
  // 렌더 중 Date.now()를 직접 부르면 react purity 규칙에 걸리므로 최초 1회만 고정한다.
  const [nowMs] = useState(() => Date.now());

  // 아직 시작하지 않은 일정만, 가까운 순으로.
  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() >= nowMs)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">다가오는 일정 · 참석 투표</h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500">예정된 일정이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {upcoming.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-3 border-b border-black/[.06] pb-4 last:border-0 last:pb-0 dark:border-white/[.08]"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_BADGE[e.event_type]}`}
                >
                  {TYPE_LABEL[e.event_type]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {e.event_type === "match" ? `vs ${e.opponent_name}` : e.title}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatDay(e.starts_at)} {formatTime(e.starts_at)}
                </span>
              </div>
              <RsvpButtons
                eventId={e.id}
                currentUserId={currentUserId}
                initialStatus={e.my_status}
                initialCounts={{
                  attending: e.attending_count,
                  declined: e.declined_count,
                  undecided: e.undecided_count,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

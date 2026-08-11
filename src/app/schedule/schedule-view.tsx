"use client";

import { useState } from "react";
import type { TeamEvent, EventType } from "@/lib/events";
import Calendar from "../calendar";
import UpcomingRsvpCard from "../upcoming-rsvp-card";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 유형 필터 탭. 'all'은 전체.
const FILTERS: { key: "all" | EventType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "match", label: "경기" },
  { key: "training", label: "훈련" },
  { key: "etc", label: "기타" },
];

function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

type Props = {
  teamId: string;
  teamName: string;
  events: TeamEvent[];
  canManage: boolean;
  currentUserId: string;
};

// 경기일정 화면: 유형 필터 + 월 캘린더(기존 Calendar 재사용) + 다가오는 일정(참석 투표) + 지난 경기(결과).
export default function ScheduleView({ teamId, teamName, events, canManage, currentUserId }: Props) {
  const [filter, setFilter] = useState<"all" | EventType>("all");
  // 렌더 중 Date.now()를 직접 부르면 react purity 규칙에 걸리므로 최초 1회만 고정한다.
  const [nowMs] = useState(() => Date.now());

  const filtered = filter === "all" ? events : events.filter((e) => e.event_type === filter);

  // 지난 경기: 시작 지난 '경기'(내림차순). 다가오는 일정은 UpcomingRsvpCard가 filtered에서 직접 계산한다.
  const pastMatches = filtered
    .filter((e) => e.event_type === "match" && new Date(e.starts_at).getTime() < nowMs)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="flex flex-col gap-6">
      {/* 유형 필터 */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              filter === f.key
                ? "bg-foreground text-background"
                : "border border-black/[.15] text-zinc-600 hover:text-foreground dark:border-white/[.2] dark:text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Calendar
        teamId={teamId}
        teamName={teamName}
        events={filtered}
        canManage={canManage}
        currentUserId={currentUserId}
        // 특정 유형 필터 중이면 새 일정도 그 유형으로 만들어 저장 후 필터에서 사라지지 않게 한다.
        defaultEventType={filter === "all" ? undefined : filter}
      />

      {/* 다가오는 일정 참석 투표 (대시보드와 동일한 카드 재사용) */}
      <UpcomingRsvpCard events={filtered} currentUserId={currentUserId} />

      {/* 지난 경기: 결과 스코어. (필터가 훈련/기타면 경기가 없어 자동으로 비어 숨겨진다.) */}
      {pastMatches.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-500">지난 경기</h2>
          <ul className="flex flex-col divide-y divide-black/[.06] rounded-2xl border border-black/[.1] dark:divide-white/[.08] dark:border-white/[.15]">
            {pastMatches.map((e) => {
              const hasResult = e.our_score !== null && e.opponent_score !== null;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {teamName} vs {e.opponent_name}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDay(e.starts_at)}</p>
                  </div>
                  {hasResult ? (
                    <span className="text-base font-semibold">
                      {e.our_score} : {e.opponent_score}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">결과 미등록</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!canManage && (
        <p className="text-xs text-zinc-400">일정 추가·수정은 감독·매니저만 할 수 있어요.</p>
      )}
    </div>
  );
}

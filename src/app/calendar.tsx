"use client";

import { useState } from "react";
import type { TeamEvent, EventType } from "@/lib/events";
import EventModal from "./event-modal";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 오늘 날짜는 서버 시간이 아니라 브라우저 로컬 시간 기준으로 맞춘다.
// (Vercel 서버 함수는 UTC라 자정 근처에 날짜가 하루 어긋날 수 있음)
function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ModalState = { date: Date; event?: TeamEvent };

type Props = {
  teamId: string;
  teamName: string;
  events: TeamEvent[];
  canManage: boolean;
  currentUserId: string;
  // 이 캘린더에서 새 일정을 만들 때의 기본 유형(스케줄 화면의 유형 필터와 맞춘다).
  defaultEventType?: EventType;
};

export default function Calendar({
  teamId,
  teamName,
  events,
  canManage,
  currentUserId,
  defaultEventType,
}: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const [modal, setModal] = useState<ModalState | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const eventsByDay = new Map<string, TeamEvent[]>();
  for (const event of events) {
    const key = dateKey(new Date(event.starts_at));
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-zinc-500 transition-colors hover:bg-black/[.06] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold tracking-tight">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={goToNextMonth}
          aria-label="다음 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-zinc-500 transition-colors hover:bg-black/[.06] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-black/[.06] dark:border-white/[.08]">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`pb-2 text-center text-xs font-medium ${
              i === 0
                ? "text-red-500/80"
                : i === 6
                  ? "text-blue-500/80"
                  : "text-zinc-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-24 border-b border-r border-black/[.05] dark:border-white/[.06]"
              />
            );
          }
          const cellDate = new Date(year, month, day);
          const isToday = isSameDate(cellDate, today);
          const weekday = cellDate.getDay();
          const dayEvents = eventsByDay.get(dateKey(cellDate)) ?? [];

          return (
            <div
              key={day}
              className={`group flex min-h-24 flex-col gap-1 border-b border-r border-black/[.05] p-2 transition-colors hover:bg-black/[.02] dark:border-white/[.06] dark:hover:bg-white/[.04] ${
                isToday ? "bg-foreground/[.04] dark:bg-white/[.06]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-foreground font-semibold text-background"
                      : weekday === 0
                        ? "text-red-500/90"
                        : weekday === 6
                          ? "text-blue-500/90"
                          : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {day}
                </span>
                {canManage && (
                  <button
                    onClick={() => setModal({ date: cellDate })}
                    aria-label="일정 추가"
                    className="hidden h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-black/[.06] hover:text-foreground group-hover:flex dark:hover:bg-white/[.1]"
                  >
                    +
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setModal({ date: cellDate, event })}
                    className="flex items-center gap-1 rounded bg-foreground/[.08] px-1.5 py-0.5 text-left leading-tight text-foreground hover:bg-foreground/[.15] dark:bg-white/[.1] dark:hover:bg-white/[.18]"
                  >
                    {/* 유형 구분 도트: 경기=빨강, 훈련=초록, 기타=회색 */}
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        event.event_type === "match"
                          ? "bg-red-500"
                          : event.event_type === "training"
                            ? "bg-emerald-500"
                            : "bg-zinc-400"
                      }`}
                      aria-hidden
                    />
                    {/* 경기는 상대팀명을, 그 외는 제목을 보여준다. */}
                    <span className="truncate text-[11px]">
                      {event.event_type === "match" ? `vs ${event.opponent_name}` : event.title} (
                      {formatTime(event.starts_at)})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <EventModal
          teamId={teamId}
          teamName={teamName}
          date={modal.date}
          event={modal.event}
          canManage={canManage}
          currentUserId={currentUserId}
          defaultEventType={defaultEventType}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

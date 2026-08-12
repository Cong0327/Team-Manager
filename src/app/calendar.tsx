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
    <div className="surface-card overflow-hidden p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between sm:mb-5">
        <button
          onClick={goToPrevMonth}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          ‹
        </button>
        <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={goToNextMonth}
          aria-label="다음 달"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
                className="min-h-20 border-b border-r border-slate-100 sm:min-h-28"
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
              className={`group flex min-h-20 flex-col gap-1 border-b border-r border-slate-100 p-1 transition-colors hover:bg-slate-50 sm:min-h-28 sm:p-2 ${
                isToday ? "bg-blue-50/60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                    isToday
                      ? "bg-blue-600 font-semibold text-white shadow-sm"
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
                    className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-black/[.06] hover:text-foreground sm:hidden sm:group-hover:flex dark:hover:bg-white/[.1]"
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
                    className="relative flex min-w-0 flex-col rounded-md border border-slate-200 bg-slate-50 px-1 py-1 text-left leading-tight text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 sm:px-1.5"
                  >
                    <span className="truncate pl-2 text-[9px] text-zinc-500 sm:text-[10px]">
                      {formatTime(event.starts_at)} ~ {formatTime(event.ends_at)}
                    </span>
                    {/* 유형 구분 도트: 경기=빨강, 훈련=초록, 기타=회색 */}
                    <span
                      className={`absolute left-1 top-1.5 h-1.5 w-1.5 rounded-full ${
                        event.event_type === "match"
                          ? "bg-red-500"
                          : event.event_type === "training"
                            ? "bg-emerald-500"
                            : "bg-zinc-400"
                      }`}
                      aria-hidden
                    />
                    <span className="mt-0.5 truncate text-[10px] font-medium sm:text-[11px]">
                      {event.event_type === "match" ? `vs ${event.opponent_name}` : event.title}
                    </span>
                    <span className="mt-0.5 truncate text-[9px] text-zinc-500 sm:text-[10px]">
                      참여 {event.attending_count}명
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

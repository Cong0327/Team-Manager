"use client";

import { useState } from "react";

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

export default function Calendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          aria-label="이전 달"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[.06] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold tracking-tight">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={goToNextMonth}
          aria-label="다음 달"
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[.06] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.1]"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7">
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

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const cellDate = new Date(year, month, day);
          const isToday = isSameDate(cellDate, today);
          const weekday = cellDate.getDay();

          return (
            <div key={day} className="flex items-center justify-center py-0.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
                  isToday
                    ? "bg-foreground font-semibold text-background"
                    : weekday === 0
                      ? "text-red-500/90 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                      : weekday === 6
                        ? "text-blue-500/90 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        : "text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

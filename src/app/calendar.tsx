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

// 날짜 칸은 나중에 일정 내용(제목 몇 개)을 넣을 수 있도록 세로 공간을 넉넉히 잡아둔다.
// 실제 일정 데이터 연동은 별도 작업.
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

          return (
            <div
              key={day}
              className={`flex min-h-24 flex-col gap-1 border-b border-r border-black/[.05] p-2 transition-colors hover:bg-black/[.02] dark:border-white/[.06] dark:hover:bg-white/[.04] ${
                isToday ? "bg-foreground/[.04] dark:bg-white/[.06]" : ""
              }`}
            >
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
              {/* 일정 항목은 여기에 표시될 예정 (미구현) */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

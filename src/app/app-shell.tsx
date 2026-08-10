"use client";

import { useState } from "react";
import Link from "next/link";
import AccountMenu from "./account-menu";

const NAV_ITEMS = [
  { href: "/roster", label: "명단관리" },
  { href: "/votes", label: "투표관리" },
  { href: "/schedule", label: "일정관리" },
  { href: "/gallery", label: "사진첩" },
];

const SIDEBAR_WIDTH = "w-56";

// 좌측 사이드바(온오프+슬라이드 애니메이션)와 상단바(햄버거+계정 드롭다운)를 함께 관리한다.
// 사이드바 상태는 레이아웃에 살아있는 동안(같은 세션 내 페이지 이동)에는 유지된다.
export default function AppShell({
  user,
  children,
}: {
  user: { email: string } | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-1">
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${SIDEBAR_WIDTH} transform border-r border-black/[.08] bg-white transition-transform duration-300 ease-in-out dark:border-white/[.1] dark:bg-zinc-950 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center px-5">
          <Link href="/" className="font-semibold tracking-tight">
            Team Manager
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div
        className={`flex flex-1 flex-col transition-[margin-left] duration-300 ease-in-out ${
          sidebarOpen ? "ml-56" : "ml-0"
        }`}
      >
        <header className="flex h-14 items-center gap-3 border-b border-black/[.08] px-4 dark:border-white/[.1]">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-black/[.06] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.1]"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
              <path
                d="M3 5.5H17M3 10H17M3 14.5H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {!sidebarOpen && (
            <Link href="/" className="font-semibold tracking-tight">
              Team Manager
            </Link>
          )}

          <div className="ml-auto">
            {user ? (
              <AccountMenu email={user.email} />
            ) : (
              <Link
                href="/login"
                className="text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
              >
                로그인
              </Link>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

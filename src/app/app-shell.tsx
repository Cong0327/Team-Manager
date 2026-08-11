"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountMenu from "./account-menu";
import TeamSwitcher, { type SwitcherTeam } from "./team-switcher";

// 네비게이션을 성격별 섹션으로 묶어 가시성을 높인다. 각 섹션은 소제목 + 링크 목록으로 렌더된다.
// 일부 항목은 여러 화면을 아우른다(경기일정=일정+투표, 게시판/사진첩=게시판+사진첩) — 대표 페이지로 연결한다.
const NAV_SECTIONS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "메인",
    items: [{ href: "/", label: "팀 메인으로" }],
  },
  {
    title: "팀 관리",
    items: [
      { href: "/roster", label: "팀 명단" },
      { href: "/schedule", label: "경기일정" },
      { href: "/dues", label: "회비관리" },
      { href: "/rules", label: "회칙" },
    ],
  },
  {
    title: "기록 및 게시판",
    items: [
      { href: "/my-records", label: "기록" },
      { href: "/board", label: "게시판/사진첩" },
    ],
  },
  {
    title: "설정",
    items: [{ href: "/account", label: "마이페이지" }],
  },
];

const SIDEBAR_WIDTH = "w-56";

// 모바일 전용 하단 탭바. 사이드바 전체 메뉴 중 자주 쓰는 5개만 추려서 바로 이동할 수 있게 한다
// (전체 메뉴는 기존처럼 햄버거로 열리는 사이드바에 그대로 있음). sm 이상에서는 숨긴다.
const BOTTOM_NAV_ITEMS: { href: string; label: string; icon: (active: boolean) => ReactNode }[] = [
  {
    href: "/",
    label: "홈",
    icon: (active) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M3 9.5 10 3l7 6.5M5 8v8.5a.5.5 0 0 0 .5.5H8v-4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V17h2.5a.5.5 0 0 0 .5-.5V8"
          stroke="currentColor"
          strokeWidth={active ? 1.8 : 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "경기일정",
    icon: (active) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <rect
          x="3.5"
          y="4"
          width="13"
          height="12.5"
          rx="1.5"
          stroke="currentColor"
          strokeWidth={active ? 1.8 : 1.4}
        />
        <path d="M3.5 8h13M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/my-records",
    label: "기록",
    icon: (active) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <path
          d="M5 3.5h10a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z"
          stroke="currentColor"
          strokeWidth={active ? 1.8 : 1.4}
        />
        <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dues",
    label: "회비",
    icon: (active) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} />
        <path d="M8 7.5h3.2a1.3 1.3 0 1 1 0 2.6H8m0 0h3.4M8 10.1h4" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "내정보",
    icon: (active) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <circle cx="10" cy="6.8" r="3" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} />
        <path
          d="M4 16.5c0-3 2.7-5 6-5s6 2 6 5"
          stroke="currentColor"
          strokeWidth={active ? 1.8 : 1.4}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

// 좌측 사이드바(온오프+슬라이드 애니메이션)와 상단바(햄버거+계정 드롭다운)를 함께 관리한다.
// 사이드바 상태는 레이아웃에 살아있는 동안(같은 세션 내 페이지 이동)에는 유지된다.
export default function AppShell({
  user,
  teams,
  activeTeamId,
  children,
}: {
  user: { email: string; name: string | null } | null;
  teams: SwitcherTeam[];
  activeTeamId: string | null;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  // 로그인 + 소속된(승인된) 팀이 하나라도 있어야 좌측 네비게이션을 보여준다.
  // 로그인 전이거나(팀/로그인 화면), 팀이 아직 없는 사용자(/team 허브)에게는 사이드바 자체를 숨긴다.
  const showSidebar = Boolean(user) && teams.length > 0;

  // 모바일 화면(sm 미만)에서는 224px짜리 사이드바가 화면 대부분을 가려버려서 기본값을 접어둔다.
  // 서버 렌더링 시점엔 window가 없어 항상 true로 그려지므로, 마운트 후에만 조정한다
  // (hydration mismatch를 피하려고 초기 렌더는 데스크톱 기준으로 유지 — login/signup의 next
  // 파라미터 처리와 같은 패턴).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.innerWidth < 640) setSidebarOpen(false);
  }, []);

  // 현재 경로에 해당하는 항목을 강조한다. "/"는 정확히 일치할 때만, 나머지는 하위 경로까지 포함.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex flex-1">
      {showSidebar && (
        // 고정 오버레이(position: fixed) 대신 폭을 애니메이션하는 일반 flex 자식으로 둔다 —
        // 열고 닫을 때 옆의 콘텐츠 영역이 margin 트릭 없이 자연스럽게 밀리고 채워진다.
        // overflow-hidden + 안쪽 w-56 래퍼로 폭이 줄어드는 동안 글자가 줄바꿈되지 않고 잘려 보이게 한다.
        <aside
          className={`shrink-0 overflow-hidden border-r border-black/[.08] bg-white pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] transition-[width] duration-300 ease-in-out dark:border-white/[.1] dark:bg-zinc-950 ${
            sidebarOpen ? SIDEBAR_WIDTH : "w-0"
          }`}
        >
          <div className={SIDEBAR_WIDTH}>
            <TeamSwitcher teams={teams} activeTeamId={activeTeamId} userEmail={user?.email ?? null} />
            <nav className="flex flex-col gap-4 px-3 py-3">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col gap-0.5">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-black/[.06] font-medium text-foreground dark:bg-white/[.1]"
                            : "text-zinc-600 hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex min-h-14 items-center gap-3 border-b border-black/[.08] px-4 pt-[env(safe-area-inset-top)] dark:border-white/[.1]">
          {showSidebar && (
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
          )}

          {(!showSidebar || !sidebarOpen) && (
            <Link href="/" className="font-semibold tracking-tight">
              Team Manager
            </Link>
          )}

          <div className="ml-auto">
            {user ? (
              <AccountMenu email={user.email} name={user.name} />
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

        <div className={`flex flex-1 flex-col ${showSidebar ? "pb-16 sm:pb-0" : ""}`}>{children}</div>
      </div>

      {showSidebar && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/[.08] bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-white/[.1] dark:bg-zinc-950"
          aria-label="빠른 이동"
        >
          {BOTTOM_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {item.icon(active)}
                <span className={active ? "font-medium" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

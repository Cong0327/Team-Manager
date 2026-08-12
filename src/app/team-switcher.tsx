"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setActiveTeam } from "@/lib/team-actions";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/dev-admin";

export type SwitcherTeam = { id: string; name: string };

// 사이드바 상단의 팀 표시/선택 영역. 단일 팀 사용을 전제로 하므로 소속 팀이 하나뿐이면
// 전환할 것이 없어 드롭다운 없이 팀 이름만 보여준다. team_members가 여전히 여러 팀 소속을
// 지원하므로(초대 링크로 다른 팀에도 들어갈 수 있음), 2개 이상이면 기존 드롭다운으로 전환한다.
// 개발자 겸 관리자 테스트 계정(PLATFORM_ADMIN_EMAIL)만 테스트용 팀을 여러 개 만들어야 해서
// 팀이 하나뿐이어도 드롭다운 + "새 팀 만들기" 링크를 계속 보여준다.
export default function TeamSwitcher({
  teams,
  activeTeamId,
  userEmail,
}: {
  teams: SwitcherTeam[];
  activeTeamId: string | null;
  userEmail: string | null;
}) {
  const isPlatformAdmin = userEmail === PLATFORM_ADMIN_EMAIL;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0] ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (teamId: string) => {
    setOpen(false);
    if (teamId === activeTeam?.id) return;
    startTransition(async () => {
      await setActiveTeam(teamId);
      router.refresh();
    });
  };

  if (!activeTeam) {
    return (
      <Link href="/team" className="flex h-14 items-center px-5 font-semibold tracking-tight">
        Team Manager
      </Link>
    );
  }

  if (teams.length === 1 && !isPlatformAdmin) {
    return (
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-950/30">TM</span>
        <span className="truncate font-bold tracking-tight text-white">{activeTeam.name}</span>
      </div>
    );
  }

  return (
    <div className="relative px-3 pt-3 pb-1" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-white transition-colors hover:bg-white/[.08] disabled:opacity-50"
      >
        <span className="truncate font-semibold tracking-tight">{activeTeam.name}</span>
        <svg
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
          fill="none"
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`absolute left-3 right-3 z-50 mt-1 origin-top rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl transition-all duration-150 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => handleSelect(team.id)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/[.08] ${
              team.id === activeTeam.id ? "font-semibold text-white" : "text-slate-400"
            }`}
          >
            {team.name}
          </button>
        ))}
        {isPlatformAdmin && (
          <>
            <div className="my-1 border-t border-black/[.08] dark:border-white/[.1]" />
            <Link
              href="/team"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-black/[.05] dark:text-zinc-400 dark:hover:bg-white/[.08]"
            >
              + 새 팀 만들기 (테스트용)
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

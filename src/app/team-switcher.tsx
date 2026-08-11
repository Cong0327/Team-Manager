"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setActiveTeam } from "@/lib/team-actions";

export type SwitcherTeam = { id: string; name: string };

// 사이드바 상단의 팀 선택 드롭다운. 승인된 팀들 사이를 전환하고, 새 팀 생성/가입 화면으로 이동한다.
export default function TeamSwitcher({
  teams,
  activeTeamId,
}: {
  teams: SwitcherTeam[];
  activeTeamId: string | null;
}) {
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

  return (
    <div className="relative px-3 pt-3 pb-1" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-black/[.05] disabled:opacity-50 dark:hover:bg-white/[.08]"
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
        className={`absolute left-3 right-3 z-50 mt-1 origin-top rounded-xl border border-black/[.08] bg-white p-1 shadow-lg transition-all duration-150 dark:border-white/[.1] dark:bg-zinc-900 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => handleSelect(team.id)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08] ${
              team.id === activeTeam.id ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {team.name}
          </button>
        ))}
        <div className="my-1 border-t border-black/[.08] dark:border-white/[.1]" />
        <Link
          href="/team"
          onClick={() => setOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-black/[.05] dark:text-zinc-400 dark:hover:bg-white/[.08]"
        >
          + 새 팀 만들기/가입하기
        </Link>
      </div>
    </div>
  );
}

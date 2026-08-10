"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 상단바 우측 계정 드롭다운. 바깥을 클릭하면 자동으로 닫힌다.
export default function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {email.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate text-zinc-700 sm:inline dark:text-zinc-300">
          {email}
        </span>
        <svg
          viewBox="0 0 12 8"
          className={`h-2.5 w-2.5 text-zinc-400 transition-transform duration-200 ${
            open ? "-rotate-180" : ""
          }`}
          fill="none"
        >
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`absolute right-0 z-50 mt-2 w-44 origin-top-right rounded-xl border border-black/[.08] bg-white p-1 shadow-lg transition-all duration-150 dark:border-white/[.1] dark:bg-zinc-900 ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <p className="truncate px-3 pb-1.5 pt-2 text-xs text-zinc-400 sm:hidden">{email}</p>
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="block rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
        >
          마이페이지
        </Link>
        <button
          onClick={handleLogout}
          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-500/10"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

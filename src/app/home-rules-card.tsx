"use client";

import { useEffect, useState } from "react";
import type { TeamPolicy } from "@/lib/policies";

export default function HomeRulesCard({ policies }: { policies: TeamPolicy[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
        <button
          type="button"
          onClick={() => policies.length > 0 && setOpen(true)}
          className="group w-full p-5 text-left"
          aria-haspopup="dialog"
          disabled={policies.length === 0}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-base">📜</span>
              <h2 className="text-sm font-semibold">우리 팀 회칙</h2>
            </div>
            {policies.length > 0 && (
              <span className="text-xs font-medium text-zinc-500 transition-colors group-hover:text-foreground">
                전체 보기 →
              </span>
            )}
          </div>

          {policies.length === 0 ? (
            <p className="text-sm text-zinc-500">아직 등록된 회칙이 없습니다. 회칙 메뉴에서 등록할 수 있어요.</p>
          ) : (
            <div className="space-y-2.5">
              {policies.slice(0, 1).map((policy) => (
                <article key={policy.id}>
                  <h3 className="text-sm font-semibold">{policy.title || "회칙"}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {policy.content}
                  </p>
                </article>
              ))}
              {policies.length > 1 && (
                <p className="text-xs text-zinc-400">외 {policies.length - 1}개 회칙</p>
              )}
            </div>
          )}
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="회칙 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-rules-title"
            className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7 dark:bg-zinc-950"
          >
            <div className="sticky top-0 z-10 mb-5 flex items-center justify-between gap-3 bg-white pb-3 dark:bg-zinc-950">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-600">Team Rules</p>
                <h2 id="team-rules-title" className="mt-1 text-xl font-bold">우리 팀 회칙</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[.05] text-zinc-500 dark:bg-white/[.08]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {policies.map((policy, index) => (
                <article key={policy.id} className="rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="text-xs font-bold text-amber-600">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="font-semibold">{policy.title || "회칙"}</h3>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">{policy.content}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

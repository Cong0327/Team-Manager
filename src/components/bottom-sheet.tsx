"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

// 모바일 목록 항목을 탭하면 하단에서 올라오는 상세/편집 패널. 배경을 누르거나 ✕를 누르면 닫힌다.
// sm 이상(데스크톱)에서는 애초에 목록 자체가 표로 바뀌어서 이 컴포넌트를 안 쓴다 —
// 그래도 방어적으로 sm:hidden을 걸어둔다.
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  // 시트가 열려있는 동안 뒤 배경 스크롤을 막는다.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-xl dark:bg-zinc-950">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/[.15] dark:bg-white/[.2]" />
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-black/[.05] hover:text-foreground dark:hover:bg-white/[.08]"
          >
            ✕
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

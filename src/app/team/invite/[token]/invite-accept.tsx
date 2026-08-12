"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const requested = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 개발 모드 Strict Mode의 effect 재실행과 컴포넌트 중복 렌더에서도 요청은 한 번만 보낸다.
    if (requested.current) return;
    requested.current = true;

    const accept = async () => {
      try {
        const response = await fetch("/api/team/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) {
          setError(true);
          return;
        }
        router.replace("/");
        router.refresh();
      } catch {
        setError(true);
      }
    };

    void accept();
  }, [router, token]);

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <h1 className="text-lg font-semibold">유효하지 않은 초대 링크예요</h1>
        <p className="text-sm text-zinc-500">
          링크가 만료되었거나 잘못됐을 수 있어요. 팀장에게 새 링크를 요청해 주세요.
        </p>
        <Link href="/team" className="mt-2 text-sm underline">
          팀 화면으로 이동
        </Link>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center"
      aria-busy="true"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-r-transparent" />
      <h1 className="text-lg font-semibold">팀에 참여하고 있어요</h1>
      <p className="text-sm text-zinc-500">잠시만 기다려 주세요.</p>
    </main>
  );
}

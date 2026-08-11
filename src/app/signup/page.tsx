"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// 이메일+비밀번호만 받는 간단한 회원가입 폼.
// Supabase 프로젝트 설정에 따라 가입 후 이메일 인증이 필요할 수 있다.
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  // 초대 링크로 들어와서 가입하는 경우, 로그인 페이지까지 next를 이어서 보내
  // 로그인 후 원래 초대 링크로 돌아가게 한다.
  const [loginHref, setLoginHref] = useState("/login");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    // 서버 렌더링 시점엔 "/login"으로 렌더해 hydration mismatch를 피하고, 마운트 후에만 갱신한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setLoginHref(`/login?next=${encodeURIComponent(next)}`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }
    setStatus("done");
  };

  if (status === "done") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">가입 신청 완료</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          이메일 인증이 켜져 있다면 받은편지함에서 확인해주세요.
        </p>
        <Link href={loginHref} className="text-sm underline">
          로그인하러 가기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-xl font-semibold">회원가입</h1>
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {status === "loading" ? "가입 중..." : "가입하기"}
        </button>
        <Link href={loginHref} className="text-center text-sm underline">
          이미 계정이 있으신가요? 로그인
        </Link>
      </form>
    </main>
  );
}

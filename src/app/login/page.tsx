"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  // 카카오 로그인: Supabase 대시보드에서 Kakao Provider(REST API 키/시크릿)와
  // Kakao 개발자센터의 Redirect URI(Supabase 콜백 주소)를 먼저 설정해야 동작한다.
  // 이메일(account_email) 동의항목은 비즈 앱 심사 전엔 권한이 없어 요청하면 KOE205가 나므로,
  // 심사 전까지는 닉네임/프로필사진만 요청한다.
  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "profile_nickname profile_image",
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-xl font-semibold">로그인</h1>
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
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <div className="my-1 flex items-center gap-2 text-xs text-zinc-500">
          <div className="h-px flex-1 bg-black/[.1] dark:bg-white/[.15]" />
          또는
          <div className="h-px flex-1 bg-black/[.1] dark:bg-white/[.15]" />
        </div>

        <button
          type="button"
          onClick={handleKakaoLogin}
          className="rounded bg-[#FEE500] px-3 py-2 text-black"
        >
          카카오로 로그인
        </button>

        <Link href="/signup" className="text-center text-sm underline">
          계정이 없으신가요? 회원가입
        </Link>
      </form>
    </main>
  );
}

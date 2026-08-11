"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase의 카카오 로그인은 account_email 스코프를 강제로 요청하는데, 이 앱은 아직
// 카카오계정(이메일) 동의항목 심사 전이라 눌러도 KOE205로 무조건 실패한다.
// 심사 통과 전까지 버튼을 숨긴다 (CLAUDE.md의 Auth 절 참고).
const KAKAO_LOGIN_ENABLED = false;

// "아이디 기억하기"는 로그인 세션과 무관하게 이메일 입력칸만 채워주는 편의 기능이라
// 쿠키/서버 세션이 아니라 브라우저 localStorage에 이메일만 저장한다(비밀번호는 저장 안 함).
const REMEMBER_EMAIL_KEY = "team-manager:remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 초대 링크(/team/invite/[token])처럼 로그인 후 원래 가려던 곳으로 돌아가야 할 때 쓴다.
  // useSearchParams 대신 직접 읽어서 Suspense 경계 없이도 동작하게 한다.
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    // 서버 렌더링 시점엔 "/"로 렌더해 hydration mismatch를 피하고, 마운트 후에만 갱신한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (next) setNextPath(next);

    // 저장된 이메일이 있으면 입력칸을 미리 채우고 체크박스도 켜둔다.
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

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

    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    router.push(nextPath);
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
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
          />
          아이디 기억하기
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {KAKAO_LOGIN_ENABLED && (
          <>
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
          </>
        )}

        <Link
          href={nextPath === "/" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`}
          className="text-center text-sm underline"
        >
          계정이 없으신가요? 회원가입
        </Link>
      </form>
    </main>
  );
}

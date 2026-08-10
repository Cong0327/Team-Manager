import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import LinkKakaoButton from "./link-kakao-button";
import LogoutButton from "./logout-button";

// 로그인 페이지와 동일한 이유(KOE205)로 이메일 동의항목 심사 전까지 숨긴다.
// CLAUDE.md의 Auth 절 참고.
const KAKAO_LINK_ENABLED = false;

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const hasKakao = user.identities?.some((i) => i.provider === "kakao") ?? false;

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-xl font-semibold">계정</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>

      <div className="flex items-center gap-3">
        {hasKakao ? (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            카카오 연동됨
          </span>
        ) : (
          KAKAO_LINK_ENABLED && <LinkKakaoButton />
        )}
      </div>

      <div>
        <LogoutButton />
      </div>
    </main>
  );
}

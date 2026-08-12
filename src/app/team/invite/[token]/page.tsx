import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, createClient } from "@/lib/supabase/server";
import { setActiveTeam } from "@/lib/team-actions";

// 초대 링크 진입점. 비로그인 상태에서는 서버 redirect를 쓰지 않고 정상 안내 화면을
// 렌더링한다. 스트리밍이 시작된 뒤 redirect가 발생하면 일부 모바일/PWA 브라우저에서
// Next.js의 404 폴백이 노출될 수 있기 때문이다. 로그인 후에는 이 링크로 돌아와 가입한다.
export default async function TeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    const invitePath = `/team/invite/${token}`;
    const next = encodeURIComponent(invitePath);

    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-20">
        <section className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-black/[.08] bg-white p-6 text-center shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[.07] text-xl"
            aria-hidden
          >
            ⚽
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">팀 초대를 받았어요</h1>
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              로그인하거나 회원가입한 후 초대받은 팀에 바로 참여할 수 있어요.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 pt-1">
            <Link
              href={`/login?next=${next}`}
              className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
            >
              로그인하고 참여하기
            </Link>
            <Link
              href={`/signup?next=${next}`}
              className="rounded-xl border border-black/[.12] px-4 py-2.5 text-sm font-medium dark:border-white/[.18]"
            >
              회원가입하기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("join_team_via_invite", {
    p_token: token,
  });

  if (error || !teamId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <h1 className="text-lg font-semibold">유효하지 않은 초대 링크예요</h1>
        <p className="text-sm text-zinc-500">
          링크가 만료되었거나 잘못됐을 수 있어요. 팀장에게 새 링크를 요청해 주세요.
        </p>
      </main>
    );
  }

  await setActiveTeam(teamId as string);
  redirect("/");
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMembership } from "@/lib/teams";
import CancelRequestButton from "./cancel-request-button";

// 로그인은 했지만 아직 팀이 없는 사용자가 처음 만나는 화면.
export default async function TeamHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMyTeamMembership();
  if (membership?.status === "approved") redirect("/");

  if (membership?.status === "pending") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">{membership.team.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          가입 승인 대기중입니다. 팀장이 승인하면 이용할 수 있어요.
        </p>
        <CancelRequestButton memberId={membership.id} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20">
      <h1 className="mb-2 text-xl font-semibold">팀이 아직 없어요</h1>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/team/create"
          className="rounded bg-foreground px-4 py-4 text-center font-medium text-background"
        >
          팀 생성하기
        </Link>
        <Link
          href="/team/join"
          className="rounded border border-black/[.15] px-4 py-4 text-center font-medium dark:border-white/[.2]"
        >
          팀 가입하기
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMemberships } from "@/lib/teams";
import CancelRequestButton from "./cancel-request-button";

// 팀 허브: 팀이 아예 없는 사용자가 처음 만나는 화면이면서, 동시에 사이드바 팀 스위처의
// "+ 새 팀 만들기/가입하기"로 언제든 들어와 팀을 추가로 만들거나 가입 신청할 수 있는 화면.
// 승인된 팀이 있어도 더는 자동으로 "/"로 돌려보내지 않는다 — 여러 팀 동시 소속을 지원하므로.
export default async function TeamHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getMyTeamMemberships();
  const pending = memberships.filter((m) => m.status === "pending");
  const hasApproved = memberships.some((m) => m.status === "approved");

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-20">
      {hasApproved && (
        <Link
          href="/"
          className="self-start text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          ← 대시보드로 돌아가기
        </Link>
      )}

      {pending.length > 0 && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-500">가입 승인 대기중</h2>
          {pending.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded border border-black/[.1] px-3 py-2 dark:border-white/[.15]"
            >
              <span className="text-sm">{m.team.name}</span>
              <CancelRequestButton memberId={m.id} />
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-sm flex-col gap-3">
        {!hasApproved && pending.length === 0 && (
          <h1 className="mb-2 text-center text-xl font-semibold">팀이 아직 없어요</h1>
        )}
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

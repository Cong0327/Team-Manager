import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMembership, getPendingRequests } from "@/lib/teams";
import ApproveRequestButton from "./approve-request-button";

// 진입점 라우팅: 비로그인 -> /login, 팀 없음/대기중 -> /team, 팀 있음 -> 대시보드.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMyTeamMembership();
  if (!membership || membership.status !== "approved") redirect("/team");

  const { team, role } = membership;
  const pendingRequests = role === "owner" ? await getPendingRequests(team.id) : [];

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        {team.region && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.region}</p>
        )}
      </div>

      {role === "owner" && pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2 rounded border border-black/[.1] p-4 dark:border-white/[.15]">
          <h2 className="text-sm font-semibold">가입 신청 대기중 ({pendingRequests.length})</h2>
          {pendingRequests.map((req) => (
            <ApproveRequestButton
              key={req.id}
              memberId={req.id}
              email={req.profile?.email ?? req.user_id}
            />
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        상단 메뉴에서 명단관리 / 투표관리 / 일정관리 / 사진첩으로 이동하세요.
      </p>
    </main>
  );
}

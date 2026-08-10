import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMembership, getPendingRequests, getApprovedMembers } from "@/lib/teams";
import { getTeamEvents } from "@/lib/events";
import ApproveRequestButton from "./approve-request-button";
import MemberRoleButton from "./member-role-button";
import Calendar from "./calendar";

// 진입점 라우팅: 비로그인 -> /login, 팀 없음/대기중 -> /team, 팀 있음 -> 대시보드.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMyTeamMembership();
  if (!membership || membership.status !== "approved") redirect("/team");

  const { team, role } = membership;
  const pendingRequests = role === "owner" ? await getPendingRequests(team.id) : [];
  const approvedMembers = role === "owner" ? await getApprovedMembers(team.id) : [];
  const events = await getTeamEvents(team.id);
  const canManageEvents = role === "owner" || role === "manager";

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

      {role === "owner" && approvedMembers.length > 0 && (
        <div className="flex flex-col gap-2 rounded border border-black/[.1] p-4 dark:border-white/[.15]">
          <h2 className="text-sm font-semibold">팀원 관리</h2>
          {approvedMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {member.profile?.email ?? member.user_id}
                {member.role === "owner" && (
                  <span className="ml-2 text-xs text-zinc-500">(팀장)</span>
                )}
              </span>
              {member.role !== "owner" && (
                <MemberRoleButton memberId={member.id} currentRole={member.role} />
              )}
            </div>
          ))}
        </div>
      )}

      <Calendar
        teamId={team.id}
        events={events}
        canManage={canManageEvents}
        currentUserId={user.id}
      />
    </main>
  );
}

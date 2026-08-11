import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership, getPendingRequests, getApprovedMembers } from "@/lib/teams";
import { getTeamEvents, splitMatches } from "@/lib/events";
import ApproveRequestButton from "./approve-request-button";
import MemberRoleButton from "./member-role-button";
import Calendar from "./calendar";
import UpcomingRsvpCard from "./upcoming-rsvp-card";
import UpcomingMatchCard from "./upcoming-match-card";
import PastMatchesCard from "./past-matches-card";
import TodoCard from "./todo-card";
import QuickLinksCard from "./quick-links-card";

// 진입점 라우팅: 비로그인 -> /login, 승인된 팀 없음 -> /team, 있음 -> 활성 팀 대시보드.
// 여러 팀에 속해 있으면 사이드바 팀 스위처가 정한 active_team_id 쿠키 기준으로 활성 팀을 고른다.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const pendingRequests = role === "owner" ? await getPendingRequests(team.id) : [];
  const approvedMembers = role === "owner" ? await getApprovedMembers(team.id) : [];
  const events = await getTeamEvents(team.id);
  const canManageEvents = role === "owner" || role === "manager";

  const { upcomingMatch, pastMatches } = splitMatches(events);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        {team.region && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.region}</p>
        )}
      </div>

      {role === "owner" && pendingRequests.length > 0 && (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded border border-black/[.1] p-4 dark:border-white/[.15]">
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
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded border border-black/[.1] p-4 dark:border-white/[.15]">
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

      {/* 1. 캘린더 */}
      <Calendar
        teamId={team.id}
        teamName={team.name}
        events={events}
        canManage={canManageEvents}
        currentUserId={user.id}
      />

      {/* 2. 다가오는 일정 참석 투표 (캘린더 클릭 없이 같은 화면에서 바로 투표) */}
      <UpcomingRsvpCard events={events} currentUserId={user.id} />

      {/* 3. 다가오는 경기 */}
      <UpcomingMatchCard match={upcomingMatch} currentUserId={user.id} />

      {/* 3. 지난 경기 결과 */}
      <PastMatchesCard
        matches={pastMatches}
        teamId={team.id}
        teamName={team.name}
        canManage={canManageEvents}
        currentUserId={user.id}
      />

      {/* 4. 해야할일 */}
      <TodoCard upcomingMatch={upcomingMatch} />

      {/* 5. 빠른이동 */}
      <QuickLinksCard />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getTeamEvents, splitMatches } from "@/lib/events";
import { getTeamPolicies } from "@/lib/policies";
import { getLatestMatchMom } from "@/lib/records-server";
import Calendar from "./calendar";
import UpcomingRsvpCard from "./upcoming-rsvp-card";
import UpcomingMatchCard from "./upcoming-match-card";
import PastMatchesCard from "./past-matches-card";
import QuickLinksCard from "./quick-links-card";
import HomeRulesCard from "./home-rules-card";
import LatestMomCard from "./latest-mom-card";

// 진입점 라우팅: 비로그인 -> /login, 승인된 팀 없음 -> /team, 있음 -> 활성 팀 대시보드.
// 여러 팀에 속해 있으면 사이드바 팀 스위처가 정한 active_team_id 쿠키 기준으로 활성 팀을 고른다.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  // 서로 의존관계 없는 조회라 Promise.all로 동시에 보낸다(순차 await은 왕복 지연이 그대로 더해짐).
  const [events, policies] = await Promise.all([
    getTeamEvents(team.id),
    getTeamPolicies(team.id),
  ]);
  const canManageEvents = role === "owner" || role === "manager";

  const { upcomingMatch, pastMatches } = splitMatches(events);
  const latestMom = await getLatestMatchMom(team.id, pastMatches[0] ?? null);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        {team.region && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.region}</p>
        )}
      </div>

      <HomeRulesCard policies={policies} />

      <LatestMomCard summary={latestMom} />

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
      <UpcomingMatchCard match={upcomingMatch} />

      {/* 3. 지난 경기 결과 */}
      <PastMatchesCard
        matches={pastMatches}
        teamId={team.id}
        teamName={team.name}
        canManage={canManageEvents}
        currentUserId={user.id}
      />

      {/* 4. 빠른이동 */}
      <QuickLinksCard />
    </main>
  );
}

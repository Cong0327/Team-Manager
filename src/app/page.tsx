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
import PwaInstallGuide from "./pwa-install-guide";

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
    <main className="app-page flex flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-8">
      <div className="px-1 sm:px-0">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-blue-600">Team dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{team.name}</h1>
        {team.region && (
          <p className="mt-0.5 text-sm text-slate-500">{team.region}</p>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 [&>.surface-card]:max-w-none">
        <PwaInstallGuide />
        <div className="grid gap-4 lg:grid-cols-2 [&>.surface-card]:max-w-none">
          <HomeRulesCard policies={policies} />
          <LatestMomCard summary={latestMom} />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)]">
          <div className="[&>.surface-card]:max-w-none">
            <Calendar
              teamId={team.id}
              teamName={team.name}
              events={events}
              canManage={canManageEvents}
              currentUserId={user.id}
            />
          </div>
          <div className="flex flex-col gap-4 [&>.surface-card]:max-w-none">
            <UpcomingRsvpCard events={events} currentUserId={user.id} />
            <UpcomingMatchCard match={upcomingMatch} />
            <PastMatchesCard
              matches={pastMatches}
              teamId={team.id}
              teamName={team.name}
              canManage={canManageEvents}
              currentUserId={user.id}
            />
          </div>
        </div>
        <div className="[&>.surface-card]:max-w-none"><QuickLinksCard /></div>
      </div>
    </main>
  );
}

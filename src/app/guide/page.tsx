import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { getActiveMembership } from "@/lib/teams";
import { getMyRosterEntry } from "@/lib/player-stats";
import GuideHub, { type OnboardingStep } from "./guide-hub";

export default async function GuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/guide");

  const [profile, membership] = await Promise.all([getMyProfile(), getActiveMembership()]);
  const entry = membership ? await getMyRosterEntry(membership.team.id) : null;

  const steps: OnboardingStep[] = [
    {
      title: "이름과 생년월일",
      description: "명단과 경기 기록에 표시되는 기본 정보예요.",
      href: "/account#profile",
      action: "기본정보 설정",
      complete: Boolean(profile?.name && profile.birth_date),
    },
    {
      title: "포지션",
      description: membership ? `${membership.team.name} 명단에 표시됩니다.` : "팀 가입 후 설정할 수 있어요.",
      href: membership ? "/account#player-info" : "/team",
      action: membership ? "포지션 설정" : "팀 확인",
      complete: Boolean(entry?.positions.length),
    },
    {
      title: "등번호",
      description: "본인의 등번호를 설정할 수 있어요.",
      href: membership ? "/account#player-info" : "/team",
      action: membership ? "등번호 설정" : "팀 확인",
      complete: entry?.jersey_number != null,
    },
  ];

  const defaultTab = membership?.role === "owner" || membership?.role === "manager" ? "staff" : "member";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <p className="page-eyebrow">Getting started</p>
        <h1 className="page-title">사용법</h1>
        <p className="page-subtitle">내 역할에 맞는 기능을 확인하고 바로 이동해 보세요.</p>
      </div>
      <GuideHub steps={steps} defaultTab={defaultTab} />
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizeMonthParam } from "@/lib/dues";
import { getMonthlyDues, getMyDuesOverview } from "@/lib/dues-server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/dev-admin";
import DuesManager from "./dues-manager";
import DuesMemberView from "./dues-member-view";

// 테스트/데모 계정 전용: 감독 화면과 회원 화면을 한 계정에서 오가며 확인할 수 있게 상단 토글을 준다.
// 다른 계정은 역할(owner/manager 대 member)에 따라 화면이 고정된다.
const DUAL_VIEW_EMAIL = PLATFORM_ADMIN_EMAIL;

// 회비 페이지는 URL의 월과 로그인 사용자의 활성 팀/역할에 따라 매번 달라져 서버에서 권한과 초기 데이터를 확정한다.
export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const params = await searchParams;
  const month = normalizeMonthParam(params.month);
  const canManage = role === "owner" || role === "manager";
  const isDualViewAccount = user.email === DUAL_VIEW_EMAIL;

  // 일반 계정은 역할대로 화면이 고정된다. 데모 계정만 쿼리파라미터(?view=admin|member)로 오갈 수 있다.
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const requestedView = isDualViewAccount && (rawView === "admin" || rawView === "member") ? rawView : null;
  const view = requestedView ?? (canManage ? "admin" : "member");

  return (
    <main className="app-page flex flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="page-eyebrow">Team dues</p><h1 className="page-title">회비관리</h1>
          <p className="page-subtitle">{team.name}</p>
        </div>

        {isDualViewAccount && (
          <div className="flex gap-1 rounded-lg border border-black/[.1] p-1 text-sm dark:border-white/[.15]">
            <Link
              href={`/dues?month=${month}&view=admin`}
              className={`rounded px-3 py-1.5 ${
                view === "admin" ? "bg-foreground text-background" : "text-zinc-500"
              }`}
            >
              감독/관리자 화면
            </Link>
            <Link
              href={`/dues?month=${month}&view=member`}
              className={`rounded px-3 py-1.5 ${
                view === "member" ? "bg-foreground text-background" : "text-zinc-500"
              }`}
            >
              회원 화면
            </Link>
          </div>
        )}
      </div>

      {view === "admin" ? (
        <DuesManager
          teamId={team.id}
          dues={await getMonthlyDues(team.id, month)}
          canManage={canManage}
          isOwner={role === "owner"}
          duesAccount={team.dues_account}
        />
      ) : (
        <DuesMemberView
          displayMonth={month}
          {...(await getMyDuesOverview(team.id, user.id, month))}
        />
      )}
    </main>
  );
}

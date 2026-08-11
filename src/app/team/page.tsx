import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMemberships } from "@/lib/teams";

// 팀이 아직 없는 사용자가 처음 만나는 화면. 팀 생성만 가능하고, 기존 팀 가입은 초대 링크로만
// 가능하다 — 검색 후 가입신청을 보내는 흐름은 폐지했다(team_members_insert_self 정책도 함께 제거).
// 단일 팀 사용을 전제로 하므로, 이미 승인된 팀이 있으면 바로 대시보드("/")로 돌려보낸다
// (여러 팀 동시 소속 자체는 DB/team-switcher에 여전히 남아있지만, 이 페이지에서 새로 팀을
// 추가하는 흐름은 더 이상 제공하지 않는다).
export default async function TeamHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getMyTeamMemberships();
  const hasApproved = memberships.some((m) => m.status === "approved");
  if (hasApproved) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-20">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-center text-xl font-semibold">팀이 아직 없어요</h1>
        <Link
          href="/team/create"
          className="rounded bg-foreground px-4 py-4 text-center font-medium text-background"
        >
          팀 생성하기
        </Link>
        <p className="text-center text-xs text-zinc-500">
          기존 팀에 합류하려면 팀장에게 초대 링크를 받아주세요.
        </p>
      </div>
    </main>
  );
}

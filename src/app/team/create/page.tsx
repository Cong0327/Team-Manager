import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/dev-admin";
import CreateTeamForm from "./create-team-form";

// 팀 생성은 관리자만 할 수 있다(teams_insert_self_owner RLS로도 강제). 이 서버 게이트는
// UI 노출만 막는 거라 실제 보안 경계는 RLS이지만, 관리자가 아닌 사람이 URL을 직접 열어도
// 폼 자체를 못 보게 여기서 먼저 막는다.
export default async function CreateTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.email !== PLATFORM_ADMIN_EMAIL) redirect("/team");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <CreateTeamForm />
    </main>
  );
}

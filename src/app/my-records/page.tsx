import { redirect } from "next/navigation";
import { getTeamMatchRecords } from "@/lib/records-server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import RecordsManager from "./records-manager";

// 경기 기록은 팀 전체 데이터와 현재 사용자의 투표 권한이 함께 필요하므로 서버에서 권한 기준 데이터를 확정한다.
export default async function MyRecordsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const canManage = role === "owner" || role === "manager";
  const records = await getTeamMatchRecords(team.id, user.id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">경기 기록</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{team.name}</p>
      </div>

      <RecordsManager records={records} currentUserId={user.id} canManage={canManage} />
    </main>
  );
}

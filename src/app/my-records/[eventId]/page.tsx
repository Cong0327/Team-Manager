import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMatchRecord } from "@/lib/records-server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import MatchRecordDetail from "../match-record-detail";

// 경기 기록 상세: 카드 목록(/my-records)에서 경기를 클릭하면 이 페이지로 이동한다.
// 오늘의 참여자, MOM 투표, 감독·매니저의 골/어시스트 입력을 여기서 처리한다.
export default async function MatchRecordPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const canManage = role === "owner" || role === "manager";
  const record = await getMatchRecord(team.id, eventId, user.id);

  if (!record) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/my-records" className="text-sm text-zinc-500 hover:text-foreground">
          ← 경기 기록
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{team.name}</h1>
      </div>

      <MatchRecordDetail record={record} currentUserId={user.id} canManage={canManage} />
    </main>
  );
}

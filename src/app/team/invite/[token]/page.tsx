import { redirect } from "next/navigation";
import { getCurrentUser, createClient } from "@/lib/supabase/server";
import { setActiveTeam } from "@/lib/team-actions";

// 초대 링크 진입점. 로그인 안 돼 있으면 로그인 후 이 링크로 돌아오게 하고,
// 로그인 상태면 join_team_via_invite RPC로 즉시 승인 가입시킨 뒤 그 팀을 활성 팀으로 만들고 대시보드로 보낸다.
export default async function TeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/team/invite/${token}`)}`);

  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("join_team_via_invite", {
    p_token: token,
  });

  if (error || !teamId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <h1 className="text-lg font-semibold">유효하지 않은 초대 링크예요</h1>
        <p className="text-sm text-zinc-500">
          링크가 만료되었거나 잘못됐을 수 있어요. 팀장에게 새 링크를 요청해 주세요.
        </p>
      </main>
    );
  }

  await setActiveTeam(teamId as string);
  redirect("/");
}

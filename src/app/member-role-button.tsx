"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamMemberRole } from "@/lib/teams";

// 팀장이 팀원을 매니저로 지정/해제한다. 매니저는 일정을 생성/수정/삭제할 수 있다.
export default function MemberRoleButton({
  memberId,
  currentRole,
}: {
  memberId: string;
  currentRole: TeamMemberRole;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const nextRole: TeamMemberRole = currentRole === "manager" ? "member" : "manager";
    const supabase = createClient();
    await supabase.from("team_members").update({ role: nextRole }).eq("id", memberId);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="rounded border border-black/[.15] px-2 py-1 text-xs disabled:opacity-50 dark:border-white/[.2]"
    >
      {currentRole === "manager" ? "매니저 해제" : "매니저 지정"}
    </button>
  );
}

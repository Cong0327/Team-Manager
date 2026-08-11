"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamInvite } from "@/lib/invites";

// owner/manager 전용: 팀당 초대 링크 1개를 생성/복사/재발급한다.
// 링크로 들어온 사람은 승인 없이 바로 팀원으로 등록된다(join_team_via_invite RPC).
export default function InviteLinkCard({
  teamId,
  initialInvite,
  currentUserId,
}: {
  teamId: string;
  initialInvite: TeamInvite | null;
  currentUserId: string;
}) {
  const router = useRouter();
  const [invite, setInvite] = useState(initialInvite);
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // window는 서버 렌더링 중엔 없으므로 마운트 후에만 절대 URL을 채운다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = invite ? `${origin}/team/invite/${invite.token}` : null;

  const createInvite = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const token = crypto.randomUUID().replace(/-/g, "");
    const { data, error: dbError } = await supabase
      .from("team_invites")
      .insert({ team_id: teamId, token, created_by: currentUserId })
      .select("id, team_id, token")
      .single();

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setInvite(data);
    router.refresh();
  };

  const regenerate = async () => {
    if (!invite) return;
    if (!confirm("링크를 재발급하면 기존 링크는 더 이상 쓸 수 없습니다. 계속할까요?")) return;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    await supabase.from("team_invites").delete().eq("id", invite.id);

    const token = crypto.randomUUID().replace(/-/g, "");
    const { data, error: dbError } = await supabase
      .from("team_invites")
      .insert({ team_id: teamId, token, created_by: currentUserId })
      .select("id, team_id, token")
      .single();

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setInvite(data);
    router.refresh();
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <h2 className="text-sm font-semibold text-zinc-500">초대 링크</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {invite ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={inviteUrl ?? "불러오는 중..."}
            onFocus={(e) => e.target.select()}
            className="flex-1 rounded border border-black/[.15] bg-black/[.02] px-3 py-2 text-sm dark:border-white/[.2] dark:bg-white/[.05]"
          />
          <div className="flex gap-2">
            <button
              onClick={copy}
              disabled={!inviteUrl}
              className="rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
            >
              {copied ? "복사됨" : "복사"}
            </button>
            <button
              onClick={regenerate}
              disabled={loading}
              className="rounded border border-black/[.15] px-3 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
            >
              재발급
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={createInvite}
          disabled={loading}
          className="self-start rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "생성 중..." : "링크 생성"}
        </button>
      )}

      <p className="text-xs text-zinc-400">이 링크로 들어온 사람은 승인 없이 바로 팀원으로 등록됩니다.</p>
    </div>
  );
}

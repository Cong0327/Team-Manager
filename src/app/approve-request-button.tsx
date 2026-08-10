"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ApproveRequestButton({
  memberId,
  email,
}: {
  memberId: string;
  email: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const approve = async () => {
    setLoading("approve");
    const supabase = createClient();
    await supabase.from("team_members").update({ status: "approved" }).eq("id", memberId);
    router.refresh();
  };

  const reject = async () => {
    setLoading("reject");
    const supabase = createClient();
    await supabase.from("team_members").delete().eq("id", memberId);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{email}</span>
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={loading !== null}
          className="rounded bg-foreground px-2 py-1 text-background disabled:opacity-50"
        >
          승인
        </button>
        <button
          onClick={reject}
          disabled={loading !== null}
          className="rounded border border-black/[.15] px-2 py-1 dark:border-white/[.2]"
        >
          거절
        </button>
      </div>
    </div>
  );
}

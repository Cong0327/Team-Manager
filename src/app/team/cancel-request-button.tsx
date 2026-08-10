"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CancelRequestButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("team_members").delete().eq("id", memberId);
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
    >
      {loading ? "취소 중..." : "신청 취소"}
    </button>
  );
}

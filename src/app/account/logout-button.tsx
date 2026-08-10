"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleClick = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
    >
      로그아웃
    </button>
  );
}

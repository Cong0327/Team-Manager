"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 카카오톡 연동 해제 버튼. /api/kakao/unlink 호출 후 화면을 새로고침한다.
export default function UnlinkKakaoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm("카카오톡 연동을 해제할까요? 톡캘린더 연동 기능을 다시 쓰려면 재연동이 필요해요.")) {
      return;
    }
    setLoading(true);
    await fetch("/api/kakao/unlink", { method: "POST" });
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-zinc-500 underline disabled:opacity-50"
    >
      {loading ? "해제 중..." : "연동 해제"}
    </button>
  );
}

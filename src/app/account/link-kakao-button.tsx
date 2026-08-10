"use client";

import { createClient } from "@/lib/supabase/client";

// 이메일로 가입한 계정에 카카오 계정을 연동한다 (linkIdentity).
// Supabase 프로젝트의 Authentication 설정에서 "Manual Linking"을 켜야 동작한다.
export default function LinkKakaoButton() {
  const handleClick = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) alert(error.message);
  };

  return (
    <button
      onClick={handleClick}
      className="rounded bg-[#FEE500] px-3 py-2 text-sm text-black"
    >
      카카오 연동하기
    </button>
  );
}

import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

// preferred_foot: 주발. 'left'(왼발) | 'right'(오른발).
export type PreferredFoot = "left" | "right";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  // age는 예전 데이터 호환용으로만 남긴다. 실제 나이는 birth_date로 계산한다(@/lib/age).
  age: number | null;
  birth_date: string | null;
  preferred_foot: PreferredFoot | null;
};

// 계정 페이지(이름/생년월일/주발 직접 입력)와 명단관리 표시에서 함께 쓰는 내 프로필 조회.
// cache()로 감쌌다 — 루트 레이아웃(상단바 이름 표시)과 /account 페이지가 같은 요청 안에서
// 각자 호출해 중복 실행되고 있었다.
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, age, birth_date, preferred_foot")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
});

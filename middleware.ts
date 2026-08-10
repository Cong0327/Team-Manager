import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 모든 요청에서 Supabase 로그인 세션을 갱신한다 (정적 파일 제외).
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

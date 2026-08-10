import { createBrowserClient } from "@supabase/ssr";

// 브라우저(클라이언트 컴포넌트)에서 Supabase에 접근할 때 사용하는 클라이언트.
// 요청마다 새로 만들어도 비용이 적으므로 호출 시점에 생성한다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

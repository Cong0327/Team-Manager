import { createClient } from "@/lib/supabase/server";

const KAKAO_AUTH_BASE = "https://kauth.kakao.com";
const KAKAO_API_BASE = "https://kapi.kakao.com";

// talk_calendar만 요청한다 — account_email과 무관해 카카오 비즈 앱 심사 없이 바로 쓸 수 있다.
// (Supabase Auth의 카카오 로그인/연동은 account_email을 강제로 붙여서 지금 막혀있음 — CLAUDE.md 참고.
// 이 연동은 Supabase를 거치지 않고 카카오 OAuth 엔드포인트를 직접 호출하는 별개 흐름이다.)
const KAKAO_SCOPE = "talk_calendar";

export function getKakaoAuthorizeUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: KAKAO_SCOPE,
  });
  return `${KAKAO_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

type KakaoTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // access token 만료(초). 보통 21600(6시간).
  refresh_token_expires_in: number;
};

// 클라이언트 시크릿은 카카오 앱에서 "사용함"으로 켜져 있으면 필수, 꺼져 있으면 안 보내도 된다.
// 환경변수가 있을 때만 실어 보내서 두 경우 다 대응한다.
function withClientSecret(body: URLSearchParams) {
  if (process.env.KAKAO_CLIENT_SECRET) body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  return body;
}

export async function exchangeKakaoCode(code: string, redirectUri: string): Promise<KakaoTokenResponse> {
  const body = withClientSecret(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY!,
      redirect_uri: redirectUri,
      code,
    })
  );

  const res = await fetch(`${KAKAO_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(`카카오 토큰 교환 실패: ${await res.text()}`);
  return res.json();
}

export async function refreshKakaoToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const body = withClientSecret(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.KAKAO_REST_API_KEY!,
      refresh_token: refreshToken,
    })
  );

  const res = await fetch(`${KAKAO_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(`카카오 토큰 갱신 실패: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getKakaoUserId(accessToken: string): Promise<string> {
  const res = await fetch(`${KAKAO_API_BASE}/v2/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`카카오 사용자 정보 조회 실패: ${await res.text()}`);
  const data = (await res.json()) as { id: number };
  return String(data.id);
}

export type KakaoLinkStatus = { linked: boolean; kakaoUserId: string | null };

// 마이페이지에서 연동 여부만 확인할 때 쓴다(토큰 자체는 노출하지 않는다).
export async function getKakaoLinkStatus(userId: string): Promise<KakaoLinkStatus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kakao_links")
    .select("kakao_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return { linked: !!data, kakaoUserId: data?.kakao_user_id ?? null };
}

// 유효한(만료 안 된) access token을 가져온다. 만료됐으면(1분 여유를 두고 판단) 자동 갱신 후
// 저장한다. 나중에 만들 톡캘린더 동기화 기능은 이 함수만 쓰면 토큰 만료를 신경 안 써도 된다.
export async function getValidKakaoAccessToken(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kakao_links")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) {
    return data.access_token;
  }

  const refreshed = await refreshKakaoToken(data.refresh_token);
  const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
  await supabase
    .from("kakao_links")
    .update({ access_token: refreshed.accessToken, expires_at: expiresAt })
    .eq("user_id", userId);

  return refreshed.accessToken;
}

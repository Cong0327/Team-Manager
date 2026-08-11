import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyTeamMemberships, ACTIVE_TEAM_COOKIE } from "@/lib/teams";
import { getMyProfile } from "@/lib/profile";
import { cookies } from "next/headers";
import AppShell from "./app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Team Manager",
  description: "축구 팀 관리 - 명단, 투표, 일정, 사진첩",
  manifest: "/manifest.webmanifest",
  // iOS는 매니페스트만으로는 "홈 화면에 추가"가 앱처럼(standalone) 안 열려서 별도 메타 태그가 필요하다.
  // Android/Chrome은 manifest.ts의 display: "standalone"만으로 충분하다.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Team Manager",
  },
};

// viewport-fit: cover + safe-area-inset 패딩(app-shell.tsx)을 짝지어야 노치/상태바 있는 기기에서
// 홈 화면 설치 앱(standalone)으로 열었을 때 상단 고정 헤더/사이드바가 상태바에 안 가려진다.
export const viewport: Viewport = {
  // width/initialScale은 Next.js 기본값인데, viewport export를 커스텀으로 정의하면
  // 기본값과 합쳐지지 않고 완전히 대체된다 — 빠뜨리면 모바일에서 뷰포트가 device-width로
  // 안 맞춰져서 화면이 확대/축소된 채로 렌더되고, 보이는 위치와 실제 터치 좌표가 어긋난다.
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // 매 요청마다 로그인 상태를 확인해 상단바에 계정/로그인 UI를 다르게 보여준다.
  const user = await getCurrentUser();
  // 상단바 표시 이름: 마이페이지에서 이름을 등록했으면 이름, 안 했으면 이메일(AccountMenu에서 결정).
  const profile = user ? await getMyProfile() : null;

  const memberships = user ? await getMyTeamMemberships() : [];
  const approvedTeams = memberships
    .filter((m) => m.status === "approved")
    .map((m) => ({ id: m.team.id, name: m.team.name }));
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE)?.value ?? approvedTeams[0]?.id ?? null;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppShell
          user={user?.email ? { email: user.email, name: profile?.name ?? null } : null}
          teams={approvedTeams}
          activeTeamId={activeTeamId}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}

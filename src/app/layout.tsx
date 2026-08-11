import type { Metadata } from "next";
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

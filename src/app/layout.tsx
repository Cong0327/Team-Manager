import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/supabase/server";
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

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppShell user={user?.email ? { email: user.email } : null}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/supabase/server";

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

const NAV_ITEMS = [
  { href: "/roster", label: "명단관리" },
  { href: "/votes", label: "투표관리" },
  { href: "/schedule", label: "일정관리" },
  { href: "/gallery", label: "사진첩" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // 매 요청마다 로그인 상태를 확인해 네비게이션에 계정/로그인 링크를 다르게 보여준다.
  const user = await getCurrentUser();

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center gap-4 border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
          <a href="/" className="font-semibold">
            Team Manager
          </a>
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="text-sm text-zinc-600 dark:text-zinc-400">
              {item.label}
            </a>
          ))}
          <a
            href={user ? "/account" : "/login"}
            className="ml-auto text-sm text-zinc-600 dark:text-zinc-400"
          >
            {user ? "계정" : "로그인"}
          </a>
        </nav>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}

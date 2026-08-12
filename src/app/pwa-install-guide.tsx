"use client";

import { useState } from "react";

type Platform = "android" | "ios";

const GUIDES: Record<Platform, { label: string; browser: string; steps: string[] }> = {
  android: {
    label: "Android",
    browser: "Chrome에서 진행",
    steps: [
      "Chrome으로 Team Manager를 엽니다.",
      "오른쪽 위 ⋮ 메뉴를 누릅니다.",
      "앱 설치 또는 홈 화면에 추가를 선택합니다.",
    ],
  },
  ios: {
    label: "iOS",
    browser: "Chrome에서 진행",
    steps: [
      "Chrome으로 Team Manager를 엽니다.",
      "주소 표시줄 오른쪽의 공유 버튼(□↑)을 누릅니다.",
      "홈 화면에 추가를 선택하고 추가를 누릅니다.",
    ],
  },
};

export default function PwaInstallGuide() {
  const [platform, setPlatform] = useState<Platform>("android");

  const guide = GUIDES[platform];

  return (
    <section className="pwa-install-guide mx-auto w-full max-w-4xl rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 shadow-sm sm:hidden dark:border-blue-900/50 dark:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">＋</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">앱처럼 사용하기</h2>
              <p className="mt-0.5 text-xs text-zinc-500">홈 화면에 추가하면 전체 화면으로 빠르게 열려요.</p>
            </div>
            <div className="flex shrink-0 rounded-lg bg-white p-0.5 text-[11px] shadow-sm dark:bg-white/[.08]">
              {(Object.keys(GUIDES) as Platform[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPlatform(item)}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    platform === item ? "bg-blue-600 text-white" : "text-zinc-500"
                  }`}
                >
                  {GUIDES[item].label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[11px] font-semibold text-blue-700 dark:text-blue-300">{guide.browser}</p>
          <ol className="mt-1.5 space-y-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-blue-600">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

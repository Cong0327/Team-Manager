"use client";

import { useState } from "react";

type Platform = "android" | "ios";
type BrowserVariant = { browser: string; steps: string[] };

// iOS는 브라우저에 따라 "홈 화면에 추가" 접근 경로가 달라서(둘 다 실제로 쓰는 사람이 있음)
// 플랫폼당 여러 브라우저 안내를 둘 수 있게 배열로 둔다. 안드로이드는 Chrome 하나면 충분하다.
const GUIDES: Record<Platform, { label: string; variants: BrowserVariant[] }> = {
  android: {
    label: "Android",
    variants: [
      {
        browser: "Chrome에서 진행",
        steps: [
          "Chrome으로 Team Manager를 엽니다.",
          "오른쪽 위 ⋮ 메뉴를 누릅니다.",
          "앱 설치 또는 홈 화면에 추가를 선택합니다.",
        ],
      },
    ],
  },
  ios: {
    label: "iOS",
    variants: [
      {
        browser: "Safari",
        steps: [
          "iOS는 링크를 열면 기본적으로 Safari로 접속돼요. Safari로 Team Manager를 엽니다.",
          "하단(아이패드는 상단) 공유 버튼(□↑)을 누릅니다.",
          "홈 화면에 추가를 선택하고 추가를 누릅니다.",
        ],
      },
      {
        browser: "Chrome",
        steps: [
          "Chrome으로 Team Manager를 엽니다.",
          "하단 공유 버튼(□↑, 또는 오른쪽 위 ⋮ 메뉴 안의 공유)을 누릅니다.",
          "홈 화면에 추가를 선택하고 추가를 누릅니다.",
        ],
      },
    ],
  },
};

export default function PwaInstallGuide() {
  const [platform, setPlatform] = useState<Platform>("android");
  const [variantIndex, setVariantIndex] = useState(0);

  const platformGuide = GUIDES[platform];
  // 플랫폼을 바꾸면 이전 플랫폼 기준 인덱스가 범위를 벗어날 수 있어 안전하게 0번째로 보정한다.
  const variant = platformGuide.variants[variantIndex] ?? platformGuide.variants[0];

  const selectPlatform = (next: Platform) => {
    setPlatform(next);
    setVariantIndex(0);
  };

  return (
    <section id="pwa-install" className="pwa-install-guide scroll-mt-20 mx-auto w-full max-w-4xl rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 shadow-sm sm:hidden dark:border-blue-900/50 dark:bg-blue-950/20">
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
                  onClick={() => selectPlatform(item)}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    platform === item ? "bg-blue-600 text-white" : "text-zinc-500"
                  }`}
                >
                  {GUIDES[item].label}
                </button>
              ))}
            </div>
          </div>

          {/* 브라우저가 2개 이상인 플랫폼(iOS)만 브라우저 선택 탭을 보여준다. */}
          {platformGuide.variants.length > 1 && (
            <div className="mt-2 flex gap-1.5 text-[11px]">
              {platformGuide.variants.map((v, index) => (
                <button
                  key={v.browser}
                  type="button"
                  onClick={() => setVariantIndex(index)}
                  className={`rounded-full border px-2 py-0.5 font-medium transition-colors ${
                    variantIndex === index
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300"
                  }`}
                >
                  {v.browser}
                </button>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] font-semibold text-blue-700 dark:text-blue-300">{variant.browser}에서 진행</p>
          <ol className="mt-1.5 space-y-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {variant.steps.map((step, index) => (
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

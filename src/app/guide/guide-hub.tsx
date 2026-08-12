"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = "member" | "staff";

export type OnboardingStep = {
  title: string;
  description: string;
  href: string;
  action: string;
  complete: boolean;
};

type GuideItem = {
  title: string;
  body: string;
  href: string;
  action: string;
  badge?: "감독·부주장" | "감독";
};

const MEMBER_LINKS = [
  ["/schedule", "경기일정", "경기·훈련 일정과 참석 현황"],
  ["/roster", "팀 명단", "팀원 역할, 포지션과 등번호"],
  ["/my-records", "개인 기록", "골·어시스트·MOM 기록"],
  ["/team-records", "팀 기록", "시즌별 팀 기록과 순위"],
  ["/dues", "회비", "납부 현황과 입금 계좌"],
  ["/rules", "회칙", "우리 팀의 전체 회칙"],
  ["/board", "게시판·사진첩", "팀 소식과 활동 사진"],
  ["/account#kakao", "카카오 연동", "카카오 계정 연결 관리"],
] as const;

const STAFF_LINKS = [
  ["/roster", "초대·명단 관리", "초대 링크와 팀원 정보 관리"],
  ["/schedule", "일정 관리", "경기·훈련·기타 일정 등록"],
  ["/my-records", "경기 기록", "골·어시스트와 MOM 관리"],
  ["/team-records", "시즌 관리", "시즌 기간과 팀 기록 관리"],
  ["/dues", "회비 관리", "금액·계좌·납부 상태 관리"],
  ["/rules", "회칙 관리", "팀 회칙 작성과 수정"],
] as const;

const MEMBER_GUIDES: GuideItem[] = [
  { title: "팀 가입과 전환", body: "감독이나 부주장이 보낸 초대 링크를 열고 로그인하면 팀에 참여할 수 있습니다. 여러 팀에 가입했다면 사이드바 상단에서 활성 팀을 바꿀 수 있습니다.", href: "/team", action: "내 팀 확인하기" },
  { title: "경기일정과 참석 응답", body: "캘린더에서 경기·훈련·기타 일정을 확인합니다. 다가오는 일정에서는 참석, 미정, 불참을 선택하고 일정 전까지 다시 변경할 수 있습니다.", href: "/schedule", action: "경기일정 보기" },
  { title: "내 정보와 명단", body: "이름과 생년월일은 마이페이지에서, 포지션과 등번호는 활성 팀 기준으로 설정합니다. 모바일 명단에서는 팀원을 누르면 상세 정보가 열립니다.", href: "/account#profile", action: "내 정보 설정하기" },
  { title: "개인·팀 기록과 MOM", body: "개인 기록에서는 내가 참여한 경기의 골, 어시스트와 MOM을 확인합니다. 팀 기록에서는 시즌별 전체 기록을 확인할 수 있습니다.", href: "/my-records", action: "내 기록 보기" },
  { title: "회비·회칙·게시판", body: "회비 납부 상태와 입금 계좌, 전체 회칙, 팀 공지와 활동 사진을 확인할 수 있습니다.", href: "/dues", action: "회비 확인하기" },
  { title: "앱으로 설치하기", body: "Android Chrome에서는 앱 설치 또는 홈 화면에 추가를, iPhone Chrome에서는 공유 후 홈 화면에 추가를 선택합니다.", href: "/#pwa-install", action: "설치 안내 보기" },
];

const STAFF_GUIDES: GuideItem[] = [
  { title: "초대 링크 발급", body: "팀 명단 상단에서 초대 링크를 생성하거나 복사합니다. 재발급하면 기존 링크는 즉시 무효화되며, 새 링크로 가입한 회원은 바로 승인 상태가 됩니다.", href: "/roster", action: "초대 링크 관리", badge: "감독·부주장" },
  { title: "역할과 명단 관리", body: "감독은 팀원을 부주장 또는 팀원으로 지정하고 포지션과 등번호를 관리할 수 있습니다.", href: "/roster", action: "팀 명단 관리", badge: "감독" },
  { title: "경기·훈련 일정 등록", body: "캘린더의 날짜에서 + 버튼을 눌러 경기, 훈련 또는 기타 일정을 등록합니다. 경기는 상대팀이 필수이며 종료 시간은 시작 시간보다 늦어야 합니다.", href: "/schedule", action: "일정 등록하기", badge: "감독·부주장" },
  { title: "경기 결과와 선수 기록", body: "종료된 경기에서 스코어와 경기 메모를 저장하고, 경기 상세에서 참석 선수의 골과 어시스트 기록을 입력합니다.", href: "/my-records", action: "경기 기록 입력", badge: "감독·부주장" },
  { title: "시즌 생성과 기간 설정", body: "팀 기록에서 시즌 이름과 시작·종료일을 등록합니다. 과거 경기도 날짜가 시즌 범위에 포함되면 자동 집계되며 시즌 기간은 서로 겹칠 수 없습니다.", href: "/team-records", action: "시즌 관리하기", badge: "감독·부주장" },
  { title: "회비 관리", body: "월 회비 금액, 납부 기한과 입금 계좌를 설정하고 팀원별 납부 상태를 관리합니다.", href: "/dues", action: "회비 관리하기", badge: "감독·부주장" },
  { title: "회칙 관리", body: "팀 회칙을 작성·수정·삭제합니다. 저장된 회칙은 모든 팀원에게 표시되고 메인 화면 카드에도 반영됩니다.", href: "/rules", action: "회칙 관리하기", badge: "감독" },
];

function LinkGrid({ items }: { items: readonly (readonly [string, string, string])[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([href, label, description]) => (
        <Link key={href} href={href} className="rounded-xl border border-black/[.08] p-3 transition-colors hover:bg-black/[.025] dark:border-white/[.1] dark:hover:bg-white/[.04]">
          <span className="block text-sm font-medium">{label} →</span>
          <span className="mt-1 block text-[11px] leading-4 text-zinc-500">{description}</span>
        </Link>
      ))}
    </div>
  );
}

function GuideList({ items }: { items: GuideItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.1]">
      {items.map((guide) => (
        <details key={guide.title} className="group border-b border-black/[.06] last:border-0 dark:border-white/[.08]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3.5 text-sm font-medium marker:content-none">
            <span>{guide.title}</span>
            {guide.badge && <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/[.08]">{guide.badge}</span>}
            <span className="ml-auto text-lg font-normal text-zinc-400 transition-transform group-open:rotate-45">＋</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{guide.body}</p>
            <Link href={guide.href} className="mt-3 inline-flex text-sm font-medium underline decoration-zinc-300 underline-offset-4">{guide.action} →</Link>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function GuideHub({ steps, defaultTab }: { steps: OnboardingStep[]; defaultTab: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const completedCount = steps.filter((step) => step.complete).length;

  return (
    <>
      <div className="grid grid-cols-2 rounded-xl bg-black/[.04] p-1 dark:bg-white/[.06]" role="tablist" aria-label="사용법 종류">
        <button type="button" role="tab" aria-selected={tab === "member"} onClick={() => setTab("member")} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === "member" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-500"}`}>팀원 사용법</button>
        <button type="button" role="tab" aria-selected={tab === "staff"} onClick={() => setTab("staff")} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === "staff" ? "bg-white shadow-sm dark:bg-zinc-900" : "text-zinc-500"}`}>감독·부주장 사용법</button>
      </div>

      {tab === "member" ? (
        <div className="flex flex-col gap-6" role="tabpanel">
          <section className="rounded-2xl border border-black/[.08] bg-foreground/[.025] p-4 sm:p-5 dark:border-white/[.1] dark:bg-white/[.03]">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><h2 className="font-semibold">필수 설정</h2><p className="mt-0.5 text-xs text-zinc-500">처음 사용하기 전에 내 정보를 완성해 주세요.</p></div>
              <span className="shrink-0 text-sm font-semibold">{completedCount}/{steps.length} 완료</span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.1]"><div className="h-full rounded-full bg-foreground" style={{ width: `${(completedCount / steps.length) * 100}%` }} /></div>
            <div className="flex flex-col gap-2">
              {steps.map((step) => (
                <Link key={step.title} href={step.href} className="group flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/[.06] dark:bg-zinc-950 dark:ring-white/[.08]">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.complete ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{step.complete ? "✓" : "!"}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{step.title}</span><span className="block truncate text-xs text-zinc-500">{step.description}</span></span>
                  <span className="shrink-0 text-xs font-medium text-zinc-500">{step.complete ? "수정" : step.action} →</span>
                </Link>
              ))}
            </div>
          </section>
          <section><h2 className="mb-3 font-semibold">바로가기</h2><LinkGrid items={MEMBER_LINKS} /></section>
          <section><h2 className="mb-3 font-semibold">기능별 도움말</h2><GuideList items={MEMBER_GUIDES} /></section>
        </div>
      ) : (
        <div className="flex flex-col gap-6" role="tabpanel">
          <section className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <h2 className="font-semibold">팀 운영 시작하기</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">운영 기능은 역할에 따라 다릅니다. 감독·부주장 공통 기능과 감독 전용 기능을 배지로 구분했어요.</p>
          </section>
          <section><h2 className="mb-3 font-semibold">운영 바로가기</h2><LinkGrid items={STAFF_LINKS} /></section>
          <section><h2 className="mb-3 font-semibold">운영 기능별 도움말</h2><GuideList items={STAFF_GUIDES} /></section>
        </div>
      )}
    </>
  );
}

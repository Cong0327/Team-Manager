import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { getActiveMembership } from "@/lib/teams";
import { getMyRosterEntry } from "@/lib/player-stats";

type Step = {
  title: string;
  description: string;
  href: string;
  action: string;
  complete: boolean;
};

const QUICK_LINKS = [
  { href: "/schedule", label: "경기일정", description: "경기·훈련 일정과 참석 현황" },
  { href: "/roster", label: "팀 명단", description: "팀원 역할, 포지션과 등번호" },
  { href: "/my-records", label: "개인 기록", description: "골·어시스트·MOM 기록" },
  { href: "/team-records", label: "팀 기록", description: "시즌별 팀 기록과 순위" },
  { href: "/dues", label: "회비", description: "납부 현황과 입금 계좌" },
  { href: "/rules", label: "회칙", description: "우리 팀의 전체 회칙" },
  { href: "/board", label: "게시판·사진첩", description: "팀 소식과 활동 사진" },
  { href: "/account#kakao", label: "카카오 연동", description: "카카오 계정 연결 관리" },
] as const;

const GUIDES = [
  {
    title: "팀 가입과 전환",
    body: "감독이나 부주장이 보낸 초대 링크를 열고 로그인하면 팀에 참여할 수 있습니다. 여러 팀에 가입했다면 사이드바 상단의 팀 이름을 눌러 활성 팀을 바꿀 수 있습니다. 일정이나 기록을 입력하기 전 현재 선택된 팀을 확인해 주세요.",
    href: "/team",
    action: "내 팀 확인하기",
  },
  {
    title: "경기일정과 참석 응답",
    body: "캘린더에서 경기·훈련·기타 일정을 확인할 수 있습니다. 다가오는 일정에서는 참석, 미정, 불참을 선택하고 일정 전까지 다시 변경할 수 있습니다. 감독과 부주장은 일정을 추가하거나 수정할 수 있습니다.",
    href: "/schedule",
    action: "경기일정 보기",
  },
  {
    title: "명단과 역할",
    body: "모바일에서는 팀원을 누르면 상세 정보가 아래에서 열립니다. 일반 팀원은 자신의 포지션과 등번호를 수정할 수 있습니다. 감독은 부주장과 팀원을 지정하며, 플랫폼 관리자는 감독도 지정할 수 있습니다.",
    href: "/roster",
    action: "팀 명단 보기",
  },
  {
    title: "개인·팀 기록과 MOM",
    body: "개인 기록에서는 내가 참여한 경기의 골, 어시스트와 MOM을 확인할 수 있습니다. 팀 기록에서는 시즌별 전체 기록을 확인합니다. MOM 투표는 해당 경기에 참석한 팀원을 대상으로 진행됩니다.",
    href: "/my-records",
    action: "내 기록 보기",
  },
  {
    title: "회비와 회칙",
    body: "회비 페이지에서 이번 달 납부 상태와 입금 계좌를 확인할 수 있습니다. 회칙 페이지에서는 팀의 전체 회칙을 확인합니다. 실제 납부 정보와 다르면 팀 운영진에게 문의해 주세요.",
    href: "/dues",
    action: "회비 확인하기",
  },
  {
    title: "게시판과 사진첩",
    body: "게시판에서 팀 공지와 게시물을 작성하고 여러 장의 사진을 첨부할 수 있습니다. 사진첩에는 팀 활동 사진을 올릴 수 있으며, 자신이 올린 사진은 직접 삭제할 수 있습니다.",
    href: "/board",
    action: "게시판으로 이동",
  },
  {
    title: "앱으로 설치하기",
    body: "Android Chrome에서는 우측 상단 메뉴의 앱 설치 또는 홈 화면에 추가를 선택합니다. iPhone Chrome에서는 공유 버튼을 누른 뒤 홈 화면에 추가를 선택합니다. 설치하면 일반 앱처럼 홈 화면에서 실행할 수 있습니다.",
    href: "/#pwa-install",
    action: "설치 안내 보기",
  },
  {
    title: "문제가 발생했을 때",
    body: "화면이 최신 상태로 바뀌지 않으면 새로고침하거나 PWA를 완전히 종료한 뒤 다시 실행해 주세요. 메뉴나 버튼이 보이지 않는다면 현재 팀과 내 역할을 확인하세요. 초대 링크가 만료됐다면 운영진에게 새 링크를 요청해 주세요.",
    href: "/account",
    action: "내 계정 확인하기",
  },
] as const;

export default async function GuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/guide");

  const [profile, membership] = await Promise.all([getMyProfile(), getActiveMembership()]);
  const entry = membership ? await getMyRosterEntry(membership.team.id) : null;

  const steps: Step[] = [
    {
      title: "이름과 생년월일",
      description: "명단과 경기 기록에 표시되는 기본 정보예요.",
      href: "/account#profile",
      action: "기본정보 설정",
      complete: Boolean(profile?.name && profile.birth_date),
    },
    {
      title: "포지션",
      description: membership ? `${membership.team.name} 명단에 표시됩니다.` : "팀 가입 후 설정할 수 있어요.",
      href: membership ? "/account#player-info" : "/team",
      action: membership ? "포지션 설정" : "팀 확인",
      complete: Boolean(entry?.positions.length),
    },
    {
      title: "등번호",
      description: "활성 팀마다 다른 등번호를 설정할 수 있어요.",
      href: membership ? "/account#player-info" : "/team",
      action: membership ? "등번호 설정" : "팀 확인",
      complete: entry?.jersey_number != null,
    },
  ];
  const completedCount = steps.filter((step) => step.complete).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Getting started</p>
        <h1 className="mt-1 text-2xl font-semibold">사용법</h1>
        <p className="mt-1 text-sm text-zinc-500">설명만 읽지 말고 필요한 기능으로 바로 이동해 보세요.</p>
      </div>

      <section className="rounded-2xl border border-black/[.08] bg-foreground/[.025] p-4 sm:p-5 dark:border-white/[.1] dark:bg-white/[.03]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">필수 설정</h2>
            <p className="mt-0.5 text-xs text-zinc-500">처음 사용하기 전에 내 정보를 완성해 주세요.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold">{completedCount}/{steps.length} 완료</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.1]">
          <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <Link key={step.title} href={step.href} className="group flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/[.06] transition-colors hover:bg-black/[.02] dark:bg-zinc-950 dark:ring-white/[.08] dark:hover:bg-white/[.05]">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.complete ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                {step.complete ? "✓" : "!"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{step.title}</span>
                <span className="block truncate text-xs text-zinc-500">{step.description}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-zinc-500 group-hover:text-foreground">{step.complete ? "수정" : step.action} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">바로가기</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-black/[.08] p-3 transition-colors hover:bg-black/[.025] dark:border-white/[.1] dark:hover:bg-white/[.04]">
              <span className="block text-sm font-medium">{item.label} →</span>
              <span className="mt-1 block text-[11px] leading-4 text-zinc-500">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">기능별 도움말</h2>
        <div className="overflow-hidden rounded-2xl border border-black/[.08] dark:border-white/[.1]">
          {GUIDES.map((guide) => (
            <details key={guide.title} className="group border-b border-black/[.06] last:border-0 dark:border-white/[.08]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium marker:content-none">
                {guide.title}
                <span className="text-lg font-normal text-zinc-400 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">{guide.body}</p>
                <Link href={guide.href} className="mt-3 inline-flex text-sm font-medium underline decoration-zinc-300 underline-offset-4">
                  {guide.action} →
                </Link>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

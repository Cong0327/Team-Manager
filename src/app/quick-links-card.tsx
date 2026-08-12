import Link from "next/link";

const QUICK_LINKS = [
  { href: "/schedule", label: "경기일정" },
  { href: "/team-records", label: "팀 기록" },
  { href: "/my-records", label: "개인 기록" },
  { href: "/dues", label: "내 회비" },
  { href: "/board", label: "게시판" },
];

// 카드5: 자주 쓰는 화면으로 바로 이동하는 버튼 모음. 2열(모바일)/5열(넓은 화면)로 배치한다.
export default function QuickLinksCard() {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">빠른 이동</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-black/[.1] px-3 py-4 text-center text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.15] dark:hover:bg-white/[.06]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

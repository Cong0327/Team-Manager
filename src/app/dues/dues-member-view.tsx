"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatWon, shiftMonth, type MonthlyPayRow } from "@/lib/dues";

type Props = {
  displayMonth: string;
  duesAccount: string | null;
  currentMonth: MonthlyPayRow | null;
  history: MonthlyPayRow[];
};

// 상태 배지 색은 요청대로 미납=빨강/납부=파랑으로 고정한다(관리자 화면의 초록/회색 토글과는 다른 용도 —
// 여기는 본인이 한눈에 위급도를 알아채야 하는 화면이라 경고색 대비를 더 뚜렷하게 쓴다).
function PaidBadge({ paid }: { paid: boolean }) {
  return (
    <span
      className={`rounded px-3 py-1.5 text-xs font-medium ${
        paid
          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {paid ? "납부" : "미납"}
    </span>
  );
}

function formatMonthLabel(yearMonth: string) {
  const [y, m] = yearMonth.split("-");
  return `${y}년 ${Number(m)}월`;
}

// 회원 화면: 본인 상태 확인 + 계좌 복사만 하면 되므로 관리자 화면(dues-manager.tsx)과 완전히 분리한다.
// 수정 액션이 없어 RLS 쓰기 정책과 맞출 필요가 없고, 그래서 supabase client도 가져오지 않는다.
export default function DuesMemberView({ displayMonth, duesAccount, currentMonth, history }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const previousMonth = shiftMonth(displayMonth, -1);
  const nextMonth = shiftMonth(displayMonth, 1);

  const copyAccount = async () => {
    if (!duesAccount) return;
    // 클립보드 API가 없는 환경(비보안 컨텍스트 등)에서도 에러로 페이지가 죽지 않게만 막는다.
    try {
      await navigator.clipboard.writeText(duesAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">내 납부상태 ({formatMonthLabel(displayMonth)})</h2>
            <PaidBadge paid={Boolean(currentMonth?.paid)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dues?month=${previousMonth}`}
              className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            >
              이전 달
            </Link>
            <input
              type="month"
              value={displayMonth}
              onChange={(e) => router.push(`/dues?month=${e.target.value}`)}
              className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            />
            <Link
              href={`/dues?month=${nextMonth}`}
              className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            >
              다음 달
            </Link>
          </div>
        </div>

        {currentMonth ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            회비 {formatWon(currentMonth.amount)} · 마감 {currentMonth.due_date}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">이 달은 아직 회비가 설정되지 않았습니다.</p>
        )}

        <div className="flex items-center gap-3 border-t border-black/[.06] pt-4 dark:border-white/[.08]">
          <div className="flex-1">
            <p className="text-xs text-zinc-500">납부 계좌</p>
            <p className="text-sm">{duesAccount ?? "아직 등록된 계좌번호가 없습니다."}</p>
          </div>
          <button
            onClick={copyAccount}
            disabled={!duesAccount}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {copied ? "복사됨" : "계좌번호 복사"}
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-500">매월 회비납부 내역</h3>

        {history.length === 0 ? (
          <p className="rounded-2xl border border-black/[.08] px-3 py-6 text-center text-sm text-zinc-400 dark:border-white/[.1]">
            아직 납부 이력이 없습니다.
          </p>
        ) : (
          <>
            {/* 모바일(sm 미만): 카드형 목록 */}
            <div className="flex flex-col gap-3 sm:hidden">
              {history.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-black/[.08] p-4 dark:border-white/[.1]"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatMonthLabel(row.year_month.slice(0, 7))}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatWon(row.amount)}</p>
                    <p className="text-xs text-zinc-400">
                      마감 {row.due_date}
                      {row.paid_at && ` · 납부일 ${row.paid_at.slice(0, 10)}`}
                    </p>
                  </div>
                  <PaidBadge paid={row.paid} />
                </div>
              ))}
            </div>

            {/* 데스크톱(sm 이상): 표 */}
            <div className="hidden overflow-x-auto rounded-2xl border border-black/[.08] sm:block dark:border-white/[.1]">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.1]">
                    <th className="px-3 py-2.5 font-medium">월</th>
                    <th className="px-3 py-2.5 font-medium">금액</th>
                    <th className="px-3 py-2.5 font-medium">마감일</th>
                    <th className="px-3 py-2.5 font-medium">상태</th>
                    <th className="px-3 py-2.5 font-medium">납부일</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-black/[.05] last:border-0 dark:border-white/[.06]">
                      <td className="px-3 py-2.5">{formatMonthLabel(row.year_month.slice(0, 7))}</td>
                      <td className="px-3 py-2.5">{formatWon(row.amount)}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{row.due_date}</td>
                      <td className="px-3 py-2.5">
                        <PaidBadge paid={row.paid} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">{row.paid_at ? row.paid_at.slice(0, 10) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

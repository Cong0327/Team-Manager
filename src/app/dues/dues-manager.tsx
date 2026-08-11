"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { defaultDueDateForMonth, formatWon, shiftMonth, type MonthlyDues } from "@/lib/dues";

type Props = {
  teamId: string;
  dues: MonthlyDues;
  canManage: boolean;
  // teams 테이블 update RLS가 owner 전용이라 계좌번호 편집은 owner만 가능하다(매니저는 읽기만).
  isOwner: boolean;
  duesAccount: string | null;
};

// 회비 관리는 월 이동과 납부 토글이 잦으므로 서버 조회 결과를 기준으로 최소 상태만 로컬에서 다룬다.
export default function DuesManager({ teamId, dues, canManage, isOwner, duesAccount }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(dues.amount?.toString() ?? "");
  const [dueDate, setDueDate] = useState(dues.dueDate ?? defaultDueDateForMonth(dues.displayMonth));
  const [account, setAccount] = useState(duesAccount ?? "");
  const [loading, setLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const percent = dues.totalCount > 0 ? Math.round((dues.paidCount / dues.totalCount) * 100) : 0;
  const previousMonth = shiftMonth(dues.displayMonth, -1);
  const nextMonth = shiftMonth(dues.displayMonth, 1);

  // SVG stroke 값은 같은 반지름 기준으로 계산해야 브라우저 확대/축소와 다크모드에서도 차트가 깨지지 않는다.
  const chart = useMemo(() => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    return {
      radius,
      circumference,
      paidLength: (circumference * percent) / 100,
      emptyLength: circumference - (circumference * percent) / 100,
    };
  }, [percent]);

  // 설정 저장은 기존 납부 상태를 보존해야 하므로 전체 upsert 대신 기존 행 갱신과 누락 행 보강을 나눈다.
  const saveSettings = async () => {
    const nextAmount = Number(amount);
    if (!Number.isInteger(nextAmount) || nextAmount < 0) {
      setError("회비 금액은 0원 이상의 정수로 입력해주세요.");
      return;
    }
    if (!dueDate) {
      setError("마감일을 선택해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 기존 납부 여부는 히스토리이므로 금액/마감일만 일괄 변경하고 paid 값은 건드리지 않는다.
    const { error: updateError } = await supabase
      .from("team_monthly_pay")
      .update({ amount: nextAmount, due_date: dueDate })
      .eq("team_id", teamId)
      .eq("year_month", dues.yearMonth);

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const existingUserIds = new Set(dues.members.filter((member) => member.pay).map((member) => member.user_id));
    const missingRows = dues.members
      .filter((member) => !existingUserIds.has(member.user_id))
      .map((member) => ({
        team_id: teamId,
        user_id: member.user_id,
        year_month: dues.yearMonth,
        amount: nextAmount,
        due_date: dueDate,
      }));

    if (missingRows.length > 0) {
      // 새로 승인된 멤버는 해당 월 행이 없을 수 있어 설정 저장 시 누락분만 추가한다.
      const { error: insertError } = await supabase
        .from("team_monthly_pay")
        .upsert(missingRows, { onConflict: "team_id,user_id,year_month", ignoreDuplicates: true });
      if (insertError) {
        setLoading(false);
        setError(insertError.message);
        return;
      }
    }

    setLoading(false);
    router.refresh();
  };

  // 납부 토글은 클릭한 멤버 1명만 바꿔야 하므로 월 설정 저장 로직과 분리해 실수로 전체 상태가 바뀌지 않게 한다.
  const togglePaid = async (member: MonthlyDues["members"][number]) => {
    if (!canManage || loadingUserId) return;
    if (dues.amount === null || dues.dueDate === null) {
      setError("먼저 이 달 회비와 마감일을 설정해주세요.");
      return;
    }

    setLoadingUserId(member.user_id);
    setError(null);
    const supabase = createClient();
    const nextPaid = !member.pay?.paid;
    const patch = { paid: nextPaid, paid_at: nextPaid ? new Date().toISOString() : null };

    // 설정 이후 가입한 멤버는 행이 없을 수 있으므로 토글 시에도 해당 멤버의 월 행을 보강한다.
    const { error: dbError } = member.pay
      ? await supabase.from("team_monthly_pay").update(patch).eq("id", member.pay.id)
      : await supabase.from("team_monthly_pay").insert({
          team_id: teamId,
          user_id: member.user_id,
          year_month: dues.yearMonth,
          amount: dues.amount,
          due_date: dues.dueDate,
          ...patch,
        });

    setLoadingUserId(null);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  };

  // 계좌번호는 월과 무관한 팀 설정이라 team_monthly_pay가 아니라 teams 테이블에 저장한다.
  // teams update RLS가 owner 전용이라 isOwner가 아니면 이 함수를 호출할 UI 자체를 보여주지 않는다.
  const saveAccount = async () => {
    setAccountLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("teams")
      .update({ dues_account: account.trim() || null })
      .eq("id", teamId);
    setAccountLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{dues.displayMonth} 회비</h2>
              <p className="text-sm text-zinc-500">
                {dues.amount === null
                  ? "이 달은 아직 회비가 설정되지 않았습니다."
                  : `회비 ${formatWon(dues.amount)} · 마감 ${dues.dueDate}`}
              </p>
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
                value={dues.displayMonth}
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

          {canManage && (
            <div className="grid gap-3 border-t border-black/[.06] pt-4 dark:border-white/[.08] sm:grid-cols-[1fr_1fr_auto]">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-zinc-500">회비 금액</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
                  placeholder="30000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-zinc-500">마감일</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
                />
              </label>
              <button
                onClick={saveSettings}
                disabled={loading}
                className="self-end rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {loading ? "저장 중..." : "이번 달 회비 설정"}
              </button>
            </div>
          )}

          {/* 계좌번호는 teams.update RLS가 owner 전용이라 매니저에게는 입력칸 없이 값만 보여준다. */}
          {(isOwner || duesAccount) && (
            <div className="border-t border-black/[.06] pt-4 dark:border-white/[.08]">
              {isOwner ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-zinc-500">회비 납부 계좌 안내(회원 화면에 그대로 노출)</span>
                    <input
                      type="text"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
                      placeholder="OO은행 000-0000-0000 (예금주: 홍길동)"
                    />
                  </label>
                  <button
                    onClick={saveAccount}
                    disabled={accountLoading}
                    className="self-end rounded border border-black/[.15] px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-white/[.2]"
                  >
                    {accountLoading ? "저장 중..." : "계좌 저장"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">납부 계좌: {duesAccount}</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-center rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
          <div className="relative size-40">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`납부율 ${percent}%`}>
              <circle
                cx="60"
                cy="60"
                r={chart.radius}
                fill="none"
                strokeWidth="12"
                className="stroke-zinc-200 dark:stroke-zinc-800"
              />
              <circle
                cx="60"
                cy="60"
                r={chart.radius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${chart.paidLength} ${chart.emptyLength}`}
                className="stroke-black dark:stroke-white"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold">{percent}%</span>
              <span className="text-xs text-zinc-500">
                {dues.paidCount}/{dues.totalCount}명
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-black/[.08] dark:border-white/[.1]">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.1]">
              <th className="px-3 py-2.5 font-medium">이름</th>
              <th className="px-3 py-2.5 font-medium">ID</th>
              <th className="px-3 py-2.5 font-medium">납부 여부</th>
              <th className="px-3 py-2.5 font-medium">납부일</th>
            </tr>
          </thead>
          <tbody>
            {dues.members.map((member) => {
              const busy = loadingUserId === member.user_id;
              return (
                <tr key={member.user_id} className="border-b border-black/[.05] last:border-0 dark:border-white/[.06]">
                  <td className="px-3 py-2.5">{member.name}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{member.email ?? "이메일 없음"}</td>
                  <td className="px-3 py-2.5">
                    {canManage ? (
                      <button
                        onClick={() => togglePaid(member)}
                        disabled={busy || dues.amount === null}
                        className={`rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                          member.pay?.paid
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {member.pay?.paid ? "납부 완료" : "미납"}
                      </button>
                    ) : (
                      <span>{member.pay?.paid ? "납부 완료" : "미납"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-500">{member.pay?.paid_at ? formatPaidAt(member.pay.paid_at) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 납부 시간은 정산 확인용이라 초 단위보다 한국 사용자가 읽기 쉬운 날짜·분 단위로 줄여 표시한다.
function formatPaidAt(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

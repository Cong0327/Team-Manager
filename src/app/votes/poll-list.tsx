"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Poll } from "@/lib/polls";

// 투표 목록 + 응답(투표하기/바꾸기) + 실시간 집계 막대 + (owner·manager) 삭제.
export default function PollList({
  polls,
  currentUserId,
  canManage,
}: {
  polls: Poll[];
  currentUserId: string;
  canManage: boolean;
}) {
  if (polls.length === 0) {
    return <p className="text-sm text-zinc-500">아직 등록된 투표가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          currentUserId={currentUserId}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

function PollCard({
  poll,
  currentUserId,
  canManage,
}: {
  poll: Poll;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 마감됐으면 투표를 바꿀 수 없다.
  const locked = poll.is_closed;

  const vote = async (optionId: string) => {
    if (locked || loading) return;
    // 같은 보기를 다시 누르면 아무 것도 하지 않는다.
    if (poll.my_option_id === optionId) return;

    setLoading(true);
    const supabase = createClient();

    // 1인 1표라 기존 표가 있으면 먼저 지우고 새 표를 넣는다(update 정책 없이 delete+insert로 처리).
    if (poll.my_option_id) {
      await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", currentUserId);
    }
    await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      option_id: optionId,
      user_id: currentUserId,
    });

    setLoading(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("이 투표를 삭제할까요? 응답도 함께 삭제됩니다.")) return;
    setLoading(true);
    const supabase = createClient();
    // poll_options / poll_votes는 on delete cascade라 poll만 지우면 함께 정리된다.
    await supabase.from("polls").delete().eq("id", poll.id);
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.1] p-5 dark:border-white/[.15]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{poll.question}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            총 {poll.total_votes}표
            {poll.closes_at &&
              ` · ${locked ? "마감됨" : `마감 ${formatDateTime(poll.closes_at)}`}`}
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="shrink-0 rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
          >
            삭제
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((option) => {
          // 득표율(0표면 0%)과 내 선택 여부를 계산한다.
          const percent =
            poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;
          const mine = poll.my_option_id === option.id;

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={locked || loading}
              className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${
                mine
                  ? "border-foreground/40 dark:border-white/40"
                  : "border-black/[.1] hover:border-black/[.25] dark:border-white/[.15] dark:hover:border-white/[.3]"
              }`}
            >
              {/* 득표율 막대 (배경) */}
              <span
                className="absolute inset-y-0 left-0 bg-foreground/[.08] dark:bg-white/[.1]"
                style={{ width: `${percent}%` }}
                aria-hidden
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className={mine ? "font-semibold" : ""}>
                  {mine && "✓ "}
                  {option.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {option.vote_count}표 · {percent}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {locked && <p className="text-xs text-zinc-400">마감된 투표입니다.</p>}
    </div>
  );
}

// 마감 시각을 "8월 15일 21:00" 형태로 간단히 표시한다.
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

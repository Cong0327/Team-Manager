"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// 투표 생성 폼(owner·manager 전용). 접었다 펼치는 형태로, 질문 + 보기 2개 이상 + 마감(선택)을 받는다.
export default function CreatePoll({
  teamId,
  currentUserId,
}: {
  teamId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  // 보기는 최소 2칸으로 시작하고 필요에 따라 추가/삭제한다.
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [closesAt, setClosesAt] = useState(""); // datetime-local 문자열, 비우면 상시 열림
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setClosesAt("");
    setError(null);
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => setOptions((prev) => [...prev, ""]);

  const removeOption = (index: number) => {
    // 보기는 최소 2개는 유지한다.
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      setError("질문을 입력하세요.");
      return;
    }
    if (validOptions.length < 2) {
      setError("보기는 2개 이상 입력하세요.");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 1) 투표(poll) 행을 먼저 만들고 id를 받는다.
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        team_id: teamId,
        question: trimmedQuestion,
        // datetime-local 값은 로컬 시간 기준이므로 Date로 감싸 ISO(UTC)로 변환한다.
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (pollError || !poll) {
      setError(pollError?.message ?? "투표 생성에 실패했습니다.");
      setLoading(false);
      return;
    }

    // 2) 보기들을 순서(sort_order)와 함께 한 번에 추가한다.
    const { error: optError } = await supabase.from("poll_options").insert(
      validOptions.map((label, i) => ({ poll_id: poll.id, label, sort_order: i }))
    );

    if (optError) {
      setError(optError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    reset();
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        + 투표 만들기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.1] p-5 dark:border-white/[.15]">
      <input
        placeholder="질문 (예: 이번 주 회식 장소는?)"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
      />

      <div className="flex flex-col gap-2">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              placeholder={`보기 ${i + 1}`}
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(i)}
                aria-label="보기 삭제"
                className="flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:bg-black/[.06] hover:text-foreground dark:hover:bg-white/[.1]"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addOption}
          className="self-start text-sm text-zinc-500 hover:text-foreground"
        >
          + 보기 추가
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        마감 시각 (선택 · 비우면 상시 열림)
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 text-sm text-foreground dark:border-white/[.2]"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "생성 중..." : "투표 등록"}
        </button>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={loading}
          className="rounded border border-black/[.15] px-4 py-2 text-sm dark:border-white/[.2]"
        >
          취소
        </button>
      </div>
    </div>
  );
}

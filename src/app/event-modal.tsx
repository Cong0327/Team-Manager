"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamEvent } from "@/lib/events";

type Props = {
  teamId: string;
  date: Date;
  event?: TeamEvent;
  canManage: boolean;
  currentUserId: string;
  onClose: () => void;
};

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndTime(date: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
}

// 일정 생성/조회/수정/삭제와 참여 토글을 한 모달에서 처리한다.
// event가 없으면 생성 모드, 있으면 조회 모드로 시작하고 canManage일 때만 수정으로 전환할 수 있다.
export default function EventModal({ teamId, date, event, canManage, currentUserId, onClose }: Props) {
  const router = useRouter();
  const isCreate = !event;
  const [editing, setEditing] = useState(isCreate);

  const [title, setTitle] = useState(event?.title ?? "");
  const [startTime, setStartTime] = useState(event ? toTimeInputValue(event.starts_at) : "19:00");
  const [endTime, setEndTime] = useState(event ? toTimeInputValue(event.ends_at) : "21:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(event?.participant_count ?? 0);
  const [isParticipating, setIsParticipating] = useState(event?.is_participating ?? false);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const starts_at = combineDateAndTime(date, startTime).toISOString();
    const ends_at = combineDateAndTime(date, endTime).toISOString();

    if (ends_at <= starts_at) {
      setError("종료 시간은 시작 시간보다 늦어야 합니다.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    if (isCreate) {
      const { error } = await supabase.from("events").insert({
        team_id: teamId,
        title,
        starts_at,
        ends_at,
        created_by: currentUserId,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("events")
        .update({ title, starts_at, ends_at })
        .eq("id", event.id);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.refresh();
    onClose();
  };

  const handleDelete = async () => {
    if (!event) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", event.id);
    router.refresh();
    onClose();
  };

  const toggleParticipate = async () => {
    if (!event) return;
    setLoading(true);
    const supabase = createClient();
    if (isParticipating) {
      await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", currentUserId);
      setParticipantCount((c) => c - 1);
      setIsParticipating(false);
    } else {
      await supabase
        .from("event_participants")
        .insert({ event_id: event.id, user_id: currentUserId });
      setParticipantCount((c) => c + 1);
      setIsParticipating(true);
    }
    setLoading(false);
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {date.getMonth() + 1}월 {date.getDate()}일 일정
          </h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-zinc-400 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              placeholder="일정 내용"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
              />
              <span className="text-zinc-400">~</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !title}
                className="flex-1 rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
              >
                {loading ? "저장 중..." : "저장"}
              </button>
              {!isCreate && (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900"
                >
                  삭제
                </button>
              )}
              {!isCreate && (
                <button
                  onClick={() => setEditing(false)}
                  className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          event && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {toTimeInputValue(event.starts_at)} ~ {toTimeInputValue(event.ends_at)}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                참여 인원: {participantCount}명
              </p>

              <div className="flex gap-2">
                <button
                  onClick={toggleParticipate}
                  disabled={loading}
                  className={`flex-1 rounded px-3 py-2 text-sm disabled:opacity-50 ${
                    isParticipating
                      ? "border border-black/[.15] dark:border-white/[.2]"
                      : "bg-foreground text-background"
                  }`}
                >
                  {isParticipating ? "참여 취소" : "참여하기"}
                </button>
                {canManage && (
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                  >
                    수정
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

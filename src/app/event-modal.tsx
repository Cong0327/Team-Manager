"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamEvent, EventType } from "@/lib/events";
import RsvpButtons from "./rsvp-buttons";

// 유형 표시 라벨 + 생성 폼 토글 순서.
const TYPE_LABEL: Record<EventType, string> = { match: "경기", training: "훈련", etc: "기타" };
const TYPE_ORDER: EventType[] = ["match", "training", "etc"];

type Props = {
  teamId: string;
  teamName: string;
  date: Date;
  event?: TeamEvent;
  canManage: boolean;
  currentUserId: string;
  onClose: () => void;
  // 새 일정 생성 시 기본 유형. 스케줄 화면에서 필터가 특정 유형일 때 그 유형으로 만들어 저장 후 사라지지 않게 한다.
  defaultEventType?: EventType;
};

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndTime(date: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
}

// 일정/경기 생성·조회·수정·삭제, 참석 응답(참석/미정/불참), 경기 결과 기록을 한 모달에서 처리한다.
// event가 없으면 생성 모드, 있으면 조회 모드로 시작하고 canManage일 때만 수정으로 전환할 수 있다.
export default function EventModal({
  teamId,
  teamName,
  date,
  event,
  canManage,
  currentUserId,
  onClose,
  defaultEventType,
}: Props) {
  const router = useRouter();
  const isCreate = !event;
  const [editing, setEditing] = useState(isCreate);

  const [title, setTitle] = useState(event?.title ?? "");
  // 수정 시엔 기존 유형을, 생성 시엔 호출부가 준 기본 유형(없으면 '경기')을 쓴다.
  const [eventType, setEventType] = useState<EventType>(event?.event_type ?? defaultEventType ?? "match");
  const [opponentName, setOpponentName] = useState(event?.opponent_name ?? "");
  const [startTime, setStartTime] = useState(event ? toTimeInputValue(event.starts_at) : "19:00");
  const [endTime, setEndTime] = useState(event ? toTimeInputValue(event.ends_at) : "21:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 수정 취소 시 폼 입력을 원래 event 값으로 되돌린다(닫지 않고 다시 수정 눌렀을 때 변경분이 남지 않게).
  const resetForm = () => {
    setTitle(event?.title ?? "");
    setEventType(event?.event_type ?? defaultEventType ?? "match");
    setOpponentName(event?.opponent_name ?? "");
    setStartTime(event ? toTimeInputValue(event.starts_at) : "19:00");
    setEndTime(event ? toTimeInputValue(event.ends_at) : "21:00");
    setError(null);
  };

  // 조회(읽기) 화면의 경기 여부는 저장된 값 기준, 폼(작성) 화면은 토글 상태(eventType) 기준으로 판단한다.
  const isMatch = event?.event_type === "match";
  // 경기는 상대팀명 필수, 그 외는 제목 필수.
  const canSave =
    eventType === "match" ? opponentName.trim() !== "" : title.trim() !== "";
  const isPast = event ? new Date(event.starts_at) < new Date() : false;
  const [resultEditing, setResultEditing] = useState(false);
  const [ourScore, setOurScore] = useState(event?.our_score?.toString() ?? "");
  const [opponentScore, setOpponentScore] = useState(event?.opponent_score?.toString() ?? "");
  const [matchNotes, setMatchNotes] = useState(event?.match_notes ?? "");

  const handleSave = async () => {
    const isMatchType = eventType === "match";

    // 유형별 필수값 검증.
    if (isMatchType && !opponentName.trim()) {
      setError("경기는 상대팀명이 필요합니다.");
      return;
    }
    if (!isMatchType && !title.trim()) {
      setError("일정 내용을 입력하세요.");
      return;
    }

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
    // 경기가 아니면 경기 전용 필드(상대팀명/스코어/메모)를 null로 정리한다
    // (수정으로 경기→훈련/기타 전환 시 옛 값이 남아 통계·카드에 잘못 잡히지 않도록).
    const payload: Record<string, unknown> = {
      title: title.trim(),
      event_type: eventType,
      starts_at,
      ends_at,
      opponent_name: isMatchType ? opponentName.trim() : null,
    };
    if (!isMatchType) {
      payload.our_score = null;
      payload.opponent_score = null;
      payload.match_notes = null;
    }

    if (isCreate) {
      const { error } = await supabase
        .from("events")
        .insert({ team_id: teamId, created_by: currentUserId, ...payload });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("events").update(payload).eq("id", event.id);
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

  const handleSaveResult = async () => {
    if (!event) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        our_score: ourScore === "" ? null : Number(ourScore),
        opponent_score: opponentScore === "" ? null : Number(opponentScore),
        match_notes: matchNotes.trim() || null,
      })
      .eq("id", event.id);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setResultEditing(false);
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
            {date.getMonth() + 1}월 {date.getDate()}일 {TYPE_LABEL[event?.event_type ?? eventType]}
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
            {/* 유형 선택: 경기 / 훈련 / 기타 */}
            <div className="flex gap-2">
              {TYPE_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEventType(t)}
                  className={`flex-1 rounded border px-3 py-2 text-sm transition-colors ${
                    eventType === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/[.15] dark:border-white/[.2]"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            {/* 상대팀명은 경기일 때만. 경기는 상대팀명이 필수다. */}
            {eventType === "match" && (
              <input
                placeholder="상대팀명"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
              />
            )}
            <input
              placeholder={eventType === "match" ? "제목/메모 (선택)" : "일정 내용"}
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
                disabled={loading || !canSave}
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
                  onClick={() => {
                    resetForm();
                    setEditing(false);
                  }}
                  className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ) : (
          event && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base font-semibold">
                  {isMatch ? `${teamName} vs ${event.opponent_name}` : event.title}
                </p>
                {isMatch && event.title && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{event.title}</p>
                )}
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {toTimeInputValue(event.starts_at)} ~ {toTimeInputValue(event.ends_at)}
                </p>
              </div>

              {isMatch && isPast && (
                <div className="flex flex-col gap-2 rounded border border-black/[.1] p-3 dark:border-white/[.15]">
                  {resultEditing ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          value={ourScore}
                          onChange={(e) => setOurScore(e.target.value)}
                          placeholder="우리"
                          className="w-16 rounded border border-black/[.15] px-2 py-1 text-center text-sm dark:border-white/[.2]"
                        />
                        <span className="text-zinc-400">:</span>
                        <input
                          type="number"
                          value={opponentScore}
                          onChange={(e) => setOpponentScore(e.target.value)}
                          placeholder="상대"
                          className="w-16 rounded border border-black/[.15] px-2 py-1 text-center text-sm dark:border-white/[.2]"
                        />
                      </div>
                      <textarea
                        placeholder="경기 메모 (선택)"
                        value={matchNotes}
                        onChange={(e) => setMatchNotes(e.target.value)}
                        rows={2}
                        className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveResult}
                          disabled={loading}
                          className="flex-1 rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
                        >
                          결과 저장
                        </button>
                        <button
                          onClick={() => setResultEditing(false)}
                          className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  ) : event.our_score !== null && event.opponent_score !== null ? (
                    <>
                      <p className="text-center text-lg font-semibold">
                        {event.our_score} : {event.opponent_score}
                      </p>
                      {event.match_notes && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{event.match_notes}</p>
                      )}
                      {canManage && (
                        <button
                          onClick={() => setResultEditing(true)}
                          className="self-start text-xs text-zinc-500 underline underline-offset-2 hover:text-foreground"
                        >
                          결과 수정
                        </button>
                      )}
                    </>
                  ) : canManage ? (
                    <button
                      onClick={() => setResultEditing(true)}
                      className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                    >
                      경기 결과 입력
                    </button>
                  ) : (
                    <p className="text-sm text-zinc-500">아직 결과가 등록되지 않았어요.</p>
                  )}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              )}

              <RsvpButtons
                eventId={event.id}
                currentUserId={currentUserId}
                initialStatus={event.my_status}
                initialCounts={{
                  attending: event.attending_count,
                  declined: event.declined_count,
                  undecided: event.undecided_count,
                }}
              />

              {canManage && (
                <button
                  onClick={() => setEditing(true)}
                  className="self-start rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
                >
                  일정 수정
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatSeasonRange, type Season } from "@/lib/seasons";

type Props = {
  teamId: string;
  currentUserId: string;
  seasons: Season[];
  selectedSeasonId: string | null;
  canManage: boolean;
};

// 두 날짜 구간(경계 포함)이 겹치는지 판단한다. 클라이언트에서 미리 걸러 헛걸음을 줄이지만,
// 최종 방어선은 DB의 prevent_team_seasons_overlap 트리거다(경쟁 상태·직접 API 호출 대비).
function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && aEnd >= bStart;
}

// 시즌 선택(전체 링크)과 시즌 관리(감독·매니저 전용 추가/수정/현재 지정/삭제)를 한 화면에서 처리한다.
// 선택은 ?season= 쿼리파라미터로 서버 컴포넌트(page.tsx)가 읽어 필터링한다.
export default function SeasonPicker({ teamId, currentUserId, seasons, selectedSeasonId, canManage }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateRange = (start: string, end: string, ignoreSeasonId: string | null) => {
    if (end < start) return "종료일은 시작일 이후여야 합니다.";
    const overlapping = seasons.some(
      (other) => other.id !== ignoreSeasonId && rangesOverlap(start, end, other.start_date, other.end_date)
    );
    if (overlapping) return "다른 시즌과 기간이 겹칩니다.";
    return null;
  };

  const addSeason = async () => {
    if (!name.trim() || !startDate || !endDate) {
      setError("시즌 이름과 시작일/종료일을 모두 입력해주세요.");
      return;
    }
    const rangeError = validateRange(startDate, endDate, null);
    if (rangeError) {
      setError(rangeError);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("team_seasons").insert({
      team_id: teamId,
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      // created_by는 not null 컬럼이고 DB 기본값이 없어 반드시 명시해야 한다(RLS도 이 값과
      // auth.uid()가 같은지 확인한다 — 실제로 빠뜨려서 insert가 막혔던 버그).
      created_by: currentUserId,
    });

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setName("");
    setStartDate("");
    setEndDate("");
    setShowForm(false);
    router.refresh();
  };

  const startEdit = (season: Season) => {
    setEditingId(season.id);
    setEditName(season.name);
    setEditStart(season.start_date);
    setEditEnd(season.end_date);
    setError(null);
  };

  const saveEdit = async (season: Season) => {
    if (!editName.trim() || !editStart || !editEnd) {
      setError("시즌 이름과 시작일/종료일을 모두 입력해주세요.");
      return;
    }
    const rangeError = validateRange(editStart, editEnd, season.id);
    if (rangeError) {
      setError(rangeError);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("team_seasons")
      .update({ name: editName.trim(), start_date: editStart, end_date: editEnd })
      .eq("id", season.id);

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setEditingId(null);
    router.refresh();
  };

  // 팀당 "현재 시즌"은 하나뿐이어야 해서(DB 부분 유니크 인덱스), 기존 현재 시즌부터 해제하고 새로 지정한다.
  // 두 번의 update가 순차 실행이라 완전한 원자성은 없지만, 첫 update가 실패하면 즉시 멈춰서
  // 최소한 "현재 시즌이 0개가 되는" 상황(두 번째 update만 실패)만 남도록 한다.
  const setCurrent = async (season: Season) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const previousCurrent = seasons.find((s) => s.is_current && s.id !== season.id);

    if (previousCurrent) {
      const { error: unsetError } = await supabase
        .from("team_seasons")
        .update({ is_current: false })
        .eq("id", previousCurrent.id);
      if (unsetError) {
        setLoading(false);
        setError(`기존 현재 시즌 해제 실패: ${unsetError.message}`);
        return;
      }
    }

    const { error: dbError } = await supabase
      .from("team_seasons")
      .update({ is_current: true })
      .eq("id", season.id);

    setLoading(false);
    if (dbError) {
      setError(`현재 시즌 지정 실패: ${dbError.message} (이전 시즌은 이미 해제됐으니 다시 시도해주세요)`);
      return;
    }
    router.refresh();
  };

  const deleteSeason = async (season: Season) => {
    if (!confirm(`"${season.name}" 시즌을 삭제할까요? 이 시즌으로 필터링된 기록 화면은 더 이상 안 보입니다.`)) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("team_seasons").delete().eq("id", season.id);

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* 시즌이 늘어나면 pill 여러 개보다 셀렉트박스가 한눈에 고르기 낫다. */}
        <select
          value={selectedSeasonId ?? ""}
          onChange={(e) => router.push(e.target.value ? `/team-records?season=${e.target.value}` : "/team-records")}
          className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
        >
          <option value="">전체 기간</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.is_current ? " ★" : ""}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full border border-dashed border-black/[.2] px-3 py-1.5 text-xs text-zinc-500 dark:border-white/[.25]"
          >
            + 시즌 추가
          </button>
        )}
      </div>

      {canManage && showForm && (
        <div className="grid gap-2 rounded-xl border border-black/[.08] p-3 dark:border-white/[.1] sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            type="text"
            placeholder="시즌 이름 (예: 2026 상반기)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
          />
          <button
            onClick={addSeason}
            disabled={loading}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            추가
          </button>
        </div>
      )}

      {canManage && seasons.length > 0 && (
        <div className="flex flex-col gap-1.5 text-xs text-zinc-500">
          {seasons.map((season) =>
            editingId === season.id ? (
              <div
                key={season.id}
                className="grid gap-2 rounded-xl border border-black/[.08] p-3 dark:border-white/[.1] sm:grid-cols-[1fr_auto_auto_auto_auto]"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded border border-black/[.15] px-3 py-2 text-sm text-zinc-900 dark:border-white/[.2] dark:text-zinc-100"
                />
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="rounded border border-black/[.15] px-3 py-2 text-sm text-zinc-900 dark:border-white/[.2] dark:text-zinc-100"
                />
                <input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="rounded border border-black/[.15] px-3 py-2 text-sm text-zinc-900 dark:border-white/[.2] dark:text-zinc-100"
                />
                <button
                  onClick={() => saveEdit(season)}
                  disabled={loading}
                  className="rounded bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  disabled={loading}
                  className="rounded border border-black/[.15] px-3 py-2 text-xs disabled:opacity-50 dark:border-white/[.2]"
                >
                  취소
                </button>
              </div>
            ) : (
              <div key={season.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{season.name}</span>
                <span>{formatSeasonRange(season)}</span>
                {season.is_current ? (
                  <span className="text-amber-600 dark:text-amber-400">현재 시즌</span>
                ) : (
                  <button onClick={() => setCurrent(season)} disabled={loading} className="underline">
                    현재 시즌으로 지정
                  </button>
                )}
                <button onClick={() => startEdit(season)} disabled={loading} className="underline">
                  수정
                </button>
                <button onClick={() => deleteSeason(season)} disabled={loading} className="text-red-500 underline">
                  삭제
                </button>
              </div>
            )
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

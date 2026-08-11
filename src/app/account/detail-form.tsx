"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAge } from "@/lib/age";
import { POSITIONS, MAX_POSITIONS } from "@/lib/positions";
import type { PreferredFoot } from "@/lib/profile";

// 상세정보 카드의 편집 폼. 본인이 자기 정보를 직접 수정한다.
//  - 이름/생년월일/주발 → profiles (개인 정보, 전 팀 공통)
//  - 포지션/등번호 → 활성 팀의 team_members 행 (팀별 정보). memberId가 없으면(활성 팀 없음) 이 두 항목은 숨긴다.
export default function DetailForm({
  userId,
  memberId,
  initialName,
  initialBirthDate,
  initialFoot,
  initialPositions,
  initialJersey,
}: {
  userId: string;
  memberId: string | null;
  initialName: string | null;
  initialBirthDate: string | null;
  initialFoot: PreferredFoot | null;
  initialPositions: string[];
  initialJersey: number | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? "");
  const [foot, setFoot] = useState<PreferredFoot | "">(initialFoot ?? "");
  const [positions, setPositions] = useState<string[]>(initialPositions);
  const [jersey, setJersey] = useState(initialJersey?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 생년월일을 입력하면 나이를 즉시 미리 보여준다.
  const previewAge = calcAge(birthDate || null);

  const togglePosition = (p: string) => {
    setPositions((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= MAX_POSITIONS) return prev; // 2개 초과 선택 방지
      return [...prev, p];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();

    // 1) 개인 정보(profiles) 저장. 빈 값은 null로.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        birth_date: birthDate || null,
        preferred_foot: foot || null,
      })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // 2) 팀별 정보(team_members) 저장 — 활성 팀이 있을 때만. 트리거가 positions/jersey_number만 허용한다.
    if (memberId) {
      const { error: teamError } = await supabase
        .from("team_members")
        .update({ positions, jersey_number: jersey ? Number(jersey) : null })
        .eq("id", memberId);

      if (teamError) {
        setError(teamError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">이름</span>
        <input
          placeholder="이름 (명단에 표시됩니다)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">
          생년월일{previewAge !== null && ` · 만 ${previewAge}세`}
        </span>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 text-foreground dark:border-white/[.2]"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-500">주발</span>
        <div className="flex gap-2">
          {(["left", "right"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFoot(foot === f ? "" : f)}
              className={`rounded border px-3 py-2 text-sm transition-colors ${
                foot === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/[.15] dark:border-white/[.2]"
              }`}
            >
              {f === "left" ? "왼발" : "오른발"}
            </button>
          ))}
        </div>
      </div>

      {/* 포지션/등번호는 활성 팀(team_members)이 있을 때만 노출/저장한다. */}
      {memberId ? (
        <>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">포지션 (최대 {MAX_POSITIONS}개)</span>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => {
                const active = positions.includes(p);
                const full = positions.length >= MAX_POSITIONS && !active;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePosition(p)}
                    disabled={full}
                    className={`rounded border px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/[.15] dark:border-white/[.2]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">등번호</span>
            <input
              type="number"
              placeholder="등번호"
              value={jersey}
              onChange={(e) => setJersey(e.target.value)}
              className="w-28 rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
            />
          </label>
        </>
      ) : (
        <p className="text-xs text-zinc-500">포지션·등번호는 팀에 가입한 뒤 설정할 수 있어요.</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        {saved && <span className="text-sm text-zinc-500">저장됨</span>}
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMatchRecordDate, formatMatchRecordScore, formatMatchRecordTime, getMatchResult } from "@/lib/records";
import type { TeamEvent } from "@/lib/events";

type Props = {
  teamName: string;
  matches: TeamEvent[];
  canManage: boolean;
};

// 팀 기록: 검색은 소규모 동호회 데이터량 기준으로 서버 왕복 없이 클라이언트에서 즉시 필터링한다.
export default function TeamRecordsManager({ teamName, matches, canManage }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return matches;
    return matches.filter((match) => (match.opponent_name ?? "").toLowerCase().includes(term));
  }, [search, matches]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="상대팀 검색"
        className="w-1/5 min-w-[140px] self-end rounded-lg border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
      />

      {matches.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">지난 경기 기록이 아직 없습니다.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">&quot;{search}&quot;와(과) 일치하는 경기가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((match) => (
            <MatchCard key={match.id} teamName={teamName} match={match} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

// 카드마다 "수정" 버튼을 눌러야 입력칸이 나오고 "저장"을 눌러야 반영되게 해서, 스코어를
// 보기만 할 때는 텍스트로 깔끔하게 보이고(개인 기록 카드와 톤이 맞음) 잘못 건드릴 일도 줄인다.
function MatchCard({ teamName, match, canManage }: { teamName: string; match: TeamEvent; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [ourScore, setOurScore] = useState(match.our_score?.toString() ?? "");
  const [opponentScore, setOpponentScore] = useState(match.opponent_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setOurScore(match.our_score?.toString() ?? "");
    setOpponentScore(match.opponent_score?.toString() ?? "");
    setError(null);
    setEditing(true);
  };

  const parseScore = (raw: string) => {
    if (raw.trim() === "") return { value: null, ok: true } as const;
    const value = Number(raw);
    return { value, ok: Number.isInteger(value) && value >= 0 } as const;
  };

  const save = async () => {
    const our = parseScore(ourScore);
    const opponent = parseScore(opponentScore);
    if (!our.ok || !opponent.ok) {
      setError("스코어는 0 이상의 정수로 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    // RLS로 update 대상이 0행이 될 수 있는데 그건 dbError가 아니라 data가 빈 배열로 온다 —
    // select()로 실제 반영된 행을 받아와야 "권한 없어서 조용히 실패"를 구분할 수 있다.
    const { data, error: dbError } = await supabase
      .from("events")
      .update({ our_score: our.value, opponent_score: opponent.value })
      .eq("id", match.id)
      .select("id");
    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("스코어를 저장하지 못했습니다(권한을 확인해주세요).");
      return;
    }

    setEditing(false);
    // 이 화면과 개인 기록/일정 화면이 같은 경기 데이터를 보여주므로, 저장 후 서버 데이터를
    // 다시 가져와 다른 화면으로 이동해도 오래된 스코어가 보이지 않게 한다.
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-zinc-500">
          {formatMatchRecordDate(match.starts_at)} · {formatMatchRecordTime(match.starts_at)}
        </p>
        {canManage && !editing && (
          <button
            onClick={startEdit}
            className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 underline hover:text-foreground"
          >
            수정
          </button>
        )}
      </div>

      <h2 className="text-base font-semibold">
        {teamName} vs {match.opponent_name ?? "상대 미입력"}
      </h2>

      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={ourScore}
              onChange={(e) => setOurScore(e.target.value)}
              disabled={saving}
              aria-label="우리팀 스코어"
              className="min-h-11 w-16 rounded border border-black/[.15] px-2 text-center text-sm disabled:opacity-50 dark:border-white/[.2]"
            />
            <span className="text-zinc-400">:</span>
            <input
              type="number"
              min={0}
              value={opponentScore}
              onChange={(e) => setOpponentScore(e.target.value)}
              disabled={saving}
              aria-label="상대팀 스코어"
              className="min-h-11 w-16 rounded border border-black/[.15] px-2 text-center text-sm disabled:opacity-50 dark:border-white/[.2]"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded border border-black/[.15] px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/[.2]"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-lg font-semibold">
          <ResultBadge result={getMatchResult(match)} />
          {formatMatchRecordScore(match)}
        </p>
      )}
    </div>
  );
}

// 승=파랑/패=빨강/무=회색. 스코어가 아직 없는 경기는 배지 없이 스코어만("스코어 미입력") 보여준다.
function ResultBadge({ result }: { result: "승" | "패" | "무" | null }) {
  if (!result) return null;
  const color =
    result === "승"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
      : result === "패"
        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{result}</span>;
}

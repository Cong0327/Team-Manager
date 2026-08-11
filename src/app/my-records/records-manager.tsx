"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatMatchRecordDate,
  formatMatchRecordScore,
  type MatchRecordAttendee,
  type TeamMatchRecord,
} from "@/lib/records";

type Props = {
  records: TeamMatchRecord[];
  currentUserId: string;
  canManage: boolean;
};

// 경기 기록 카드는 운영진 편집과 팀원 투표가 같은 화면에서 일어나므로 저장 중인 대상을 분리해 입력 잠김을 최소화한다.
export default function RecordsManager({ records, currentUserId, canManage }: Props) {
  const router = useRouter();
  const [savingStatKey, setSavingStatKey] = useState<string | null>(null);
  const [votingEventId, setVotingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveStat = async (
    eventId: string,
    attendee: MatchRecordAttendee,
    field: "goals" | "assists",
    rawValue: string
  ) => {
    if (!canManage) return;

    const next = Number(rawValue);
    if (!Number.isInteger(next) || next < 0) {
      setError("골/어시스트는 0 이상의 정수로 입력해 주세요.");
      router.refresh();
      return;
    }

    if (next === attendee[field]) return;

    const key = `${eventId}:${attendee.user_id}:${field}`;
    setSavingStatKey(key);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase.from("event_player_stats").upsert(
      {
        event_id: eventId,
        user_id: attendee.user_id,
        goals: field === "goals" ? next : attendee.goals,
        assists: field === "assists" ? next : attendee.assists,
      },
      { onConflict: "event_id,user_id" }
    );

    setSavingStatKey(null);
    if (dbError) {
      setError(dbError.message);
      router.refresh();
      return;
    }
    router.refresh();
  };

  const voteMom = async (eventId: string, votedForUserId: string) => {
    setVotingEventId(eventId);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase.from("event_mom_votes").upsert(
      {
        event_id: eventId,
        voter_user_id: currentUserId,
        voted_for_user_id: votedForUserId,
      },
      { onConflict: "event_id,voter_user_id" }
    );

    setVotingEventId(null);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">지난 경기 기록이 아직 없습니다.</p>
      ) : (
        records.map((record) => (
          <MatchRecordCard
            key={record.id}
            record={record}
            canManage={canManage}
            savingStatKey={savingStatKey}
            votingEventId={votingEventId}
            onSaveStat={saveStat}
            onVoteMom={voteMom}
          />
        ))
      )}
    </div>
  );
}

function MatchRecordCard({
  record,
  canManage,
  savingStatKey,
  votingEventId,
  onSaveStat,
  onVoteMom,
}: {
  record: TeamMatchRecord;
  canManage: boolean;
  savingStatKey: string | null;
  votingEventId: string | null;
  onSaveStat: (
    eventId: string,
    attendee: MatchRecordAttendee,
    field: "goals" | "assists",
    rawValue: string
  ) => Promise<void>;
  onVoteMom: (eventId: string, votedForUserId: string) => Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">{formatMatchRecordDate(record.starts_at)}</p>
          <h2 className="text-lg font-semibold">vs {record.opponent_name ?? "상대 미입력"}</h2>
        </div>
        <div className="rounded-lg bg-black/[.04] px-3 py-2 text-sm font-semibold dark:bg-white/[.06]">
          {formatMatchRecordScore(record)}
        </div>
      </header>

      {record.attendees.length === 0 ? (
        <p className="border-t border-black/[.06] pt-4 text-sm text-zinc-500 dark:border-white/[.08]">
          참여 기록이 없습니다.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-black/[.08] dark:border-white/[.1]">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.1]">
                  <th className="px-3 py-2.5 font-medium">이름</th>
                  <th className="px-3 py-2.5 font-medium">골</th>
                  <th className="px-3 py-2.5 font-medium">어시스트</th>
                  <th className="px-3 py-2.5 font-medium">MOM 득표</th>
                </tr>
              </thead>
              <tbody>
                {record.attendees.map((attendee) => (
                  <tr key={attendee.user_id} className="border-b border-black/[.05] last:border-0 dark:border-white/[.06]">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{attendee.name || attendee.email || "이름 없음"}</span>
                        {attendee.isMom && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            ⭐ MOM
                          </span>
                        )}
                      </div>
                      {attendee.name && attendee.email && <p className="text-xs text-zinc-500">{attendee.email}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatCell
                        value={attendee.goals}
                        disabled={!canManage || savingStatKey === `${record.id}:${attendee.user_id}:goals`}
                        editable={canManage}
                        onBlur={(value) => onSaveStat(record.id, attendee, "goals", value)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatCell
                        value={attendee.assists}
                        disabled={!canManage || savingStatKey === `${record.id}:${attendee.user_id}:assists`}
                        editable={canManage}
                        onBlur={(value) => onSaveStat(record.id, attendee, "assists", value)}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500">{attendee.voteCount}표</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {record.currentUserAttended && (
            <div className="flex flex-wrap items-center gap-2 border-t border-black/[.06] pt-4 dark:border-white/[.08]">
              <span className="text-sm text-zinc-500">MOM 투표</span>
              {record.attendees.map((attendee) => {
                const selected = record.myVoteForUserId === attendee.user_id;
                return (
                  <button
                    key={attendee.user_id}
                    onClick={() => onVoteMom(record.id, attendee.user_id)}
                    disabled={!record.canVote || votingEventId === record.id}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/[.15] text-zinc-700 dark:border-white/[.2] dark:text-zinc-200"
                    }`}
                  >
                    {attendee.name || attendee.email || "이름 없음"}
                  </button>
                );
              })}
              {!record.voteOpen && <span className="text-sm text-zinc-500">투표 마감</span>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatCell({
  value,
  disabled,
  editable,
  onBlur,
}: {
  value: number;
  disabled: boolean;
  editable: boolean;
  onBlur: (value: string) => void;
}) {
  if (!editable) return <span>{value}</span>;

  return (
    <input
      type="number"
      min={0}
      defaultValue={value}
      disabled={disabled}
      onBlur={(event) => onBlur(event.target.value)}
      className="w-16 rounded border border-black/[.15] px-2 py-1 text-sm disabled:opacity-50 dark:border-white/[.2]"
    />
  );
}

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
  record: TeamMatchRecord;
  currentUserId: string;
  canManage: boolean;
};

// 경기 상세 페이지(/my-records/[eventId]) 본문. 오늘의 참여자 표(골/어시스트는 감독·매니저만
// 수정 가능) + MOM 투표를 한 화면에서 처리한다. 저장/투표 중인 대상을 분리해 입력 잠김을 최소화한다.
export default function MatchRecordDetail({ record, currentUserId, canManage }: Props) {
  const router = useRouter();
  const [savingStatKey, setSavingStatKey] = useState<string | null>(null);
  const [votingEventId, setVotingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveStat = async (
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

    const key = `${attendee.user_id}:${field}`;
    setSavingStatKey(key);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase.from("event_player_stats").upsert(
      {
        event_id: record.id,
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

  const voteMom = async (votedForUserId: string) => {
    setVotingEventId(record.id);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase.from("event_mom_votes").upsert(
      {
        event_id: record.id,
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
            {/* 모바일(sm 미만): 카드형 목록 */}
            <div className="flex flex-col gap-3 sm:hidden">
              {record.attendees.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex flex-col gap-2 rounded-xl border border-black/[.08] p-3 dark:border-white/[.1]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{attendee.name || attendee.email || "이름 없음"}</span>
                    {attendee.isMom && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        ⭐ MOM
                      </span>
                    )}
                  </div>
                  {attendee.name && attendee.email && (
                    <p className="text-xs text-zinc-500">{attendee.email}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-zinc-500">골</span>
                      <StatCell
                        value={attendee.goals}
                        disabled={!canManage || savingStatKey === `${attendee.user_id}:goals`}
                        editable={canManage}
                        onBlur={(value) => saveStat(attendee, "goals", value)}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-zinc-500">어시스트</span>
                      <StatCell
                        value={attendee.assists}
                        disabled={!canManage || savingStatKey === `${attendee.user_id}:assists`}
                        editable={canManage}
                        onBlur={(value) => saveStat(attendee, "assists", value)}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-zinc-500">MOM 득표</span>
                      <span>{attendee.voteCount}표</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크톱(sm 이상): 표 */}
            <div className="hidden overflow-x-auto rounded-xl border border-black/[.08] sm:block dark:border-white/[.1]">
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
                        {attendee.name && attendee.email && (
                          <p className="text-xs text-zinc-500">{attendee.email}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatCell
                          value={attendee.goals}
                          disabled={!canManage || savingStatKey === `${attendee.user_id}:goals`}
                          editable={canManage}
                          onBlur={(value) => saveStat(attendee, "goals", value)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatCell
                          value={attendee.assists}
                          disabled={!canManage || savingStatKey === `${attendee.user_id}:assists`}
                          editable={canManage}
                          onBlur={(value) => saveStat(attendee, "assists", value)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">{attendee.voteCount}표</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {record.currentUserAttended && (
        <section className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm dark:border-white/[.1] dark:bg-white/[.03]">
          <h2 className="text-sm font-semibold text-zinc-500">MOM 투표</h2>
          <div className="flex flex-wrap items-center gap-2">
            {record.attendees.map((attendee) => {
              const selected = record.myVoteForUserId === attendee.user_id;
              return (
                <button
                  key={attendee.user_id}
                  onClick={() => voteMom(attendee.user_id)}
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
        </section>
      )}
    </div>
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

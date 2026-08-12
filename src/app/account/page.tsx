import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { getActiveMembership } from "@/lib/teams";
import { getMyRosterEntry, getMyMatchStats } from "@/lib/player-stats";
import { getMySeasonBreakdown } from "@/lib/season-stats-server";
import { getKakaoLinkStatus } from "@/lib/kakao";
import { calcAge } from "@/lib/age";
import LinkKakaoButton from "./link-kakao-button";
import UnlinkKakaoButton from "./unlink-kakao-button";
import LogoutButton from "./logout-button";
import DetailForm from "./detail-form";
import SeasonStatPicker from "./season-stat-picker";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const kakaoParam = Array.isArray(params.kakao) ? params.kakao[0] : params.kakao;

  // profile/membership/kakaoStatus는 서로 의존관계가 없어 동시에 조회한다.
  const [profile, membership, kakaoStatus] = await Promise.all([
    getMyProfile(),
    getActiveMembership(),
    getKakaoLinkStatus(user.id),
  ]);

  // 상세정보/기록 카드는 현재 활성 팀 기준이다. 활성 팀이 없으면 팀 관련 항목은 비활성으로 표시한다.
  // entry/matchStats/seasonBreakdown도 서로 의존관계가 없어 동시에 조회한다.
  const [entry, matchStats, seasonBreakdown] = membership
    ? await Promise.all([
        getMyRosterEntry(membership.team.id),
        getMyMatchStats(membership.team.id),
        getMySeasonBreakdown(membership.team.id, user.id),
      ])
    : [
        null,
        { totalMatches: 0, attendedCount: 0, attendanceRate: null, attendedMatches: [] },
        { seasons: [], total: { goals: 0, assists: 0, matchesPlayed: 0 }, bySeasonId: {} },
      ];

  // 나이는 생년월일로 계산하되, 예전 age만 있는 사용자는 그 값을 폴백으로 쓴다(명단 표와 동일).
  const age = calcAge(profile?.birth_date) ?? profile?.age ?? null;
  const displayName = profile?.name || user.email;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-6 py-10">
      <h1 className="text-xl font-semibold">마이페이지</h1>

      {/* 카드 1: 계정 (이메일 · 카카오톡 연동 · 로그아웃) */}
      <section id="kakao" className="scroll-mt-20 flex flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
        <h2 className="text-sm font-semibold text-zinc-500">계정</h2>

        {kakaoParam === "linked" && (
          <p className="text-sm text-green-600 dark:text-green-400">카카오톡 연동이 완료됐어요.</p>
        )}
        {kakaoParam === "error" && (
          <p className="text-sm text-red-600">카카오톡 연동에 실패했어요. 다시 시도해주세요.</p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">{user.email}</span>
          {kakaoStatus.linked ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#FEE500] px-2.5 py-1 text-xs text-black">
                카카오톡 연동됨
              </span>
              <UnlinkKakaoButton />
            </div>
          ) : (
            <LinkKakaoButton />
          )}
        </div>
        <LogoutButton />
      </section>

      {/* 카드 2: 상세정보 (본인이 직접 수정) */}
      <section id="profile" className="scroll-mt-20 flex flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-zinc-500">상세정보</h2>
          {membership && (
            <span className="text-xs text-zinc-400">{membership.team.name} 기준</span>
          )}
        </div>

        <div id="player-info" className="scroll-mt-20">
        <DetailForm
          userId={user.id}
          memberId={entry?.id ?? null}
          initialName={profile?.name ?? null}
          initialBirthDate={profile?.birth_date ?? null}
          initialFoot={profile?.preferred_foot ?? null}
          initialPositions={entry?.positions ?? []}
          initialJersey={entry?.jersey_number ?? null}
        />
        </div>

        {/* 출전 경기: 경기로 '참석'한 내역 (읽기 전용, 자동 집계) */}
        <div className="flex flex-col gap-2 border-t border-black/[.06] pt-4 dark:border-white/[.08]">
          <span className="text-sm text-zinc-500">
            출전 경기 · {matchStats.attendedCount}회
          </span>
          {matchStats.attendedMatches.length === 0 ? (
            <p className="text-xs text-zinc-400">참석한 경기가 아직 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {matchStats.attendedMatches.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">
                    {formatDate(m.starts_at)} · vs {m.opponent_name}
                  </span>
                  {m.our_score !== null && m.opponent_score !== null && (
                    <span className="text-zinc-500">
                      {m.our_score} : {m.opponent_score}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 카드 3: 선수 기록 (읽기 전용) */}
      <section className="flex flex-col gap-4 rounded-2xl border border-black/[.08] p-5 dark:border-white/[.1]">
        <h2 className="text-sm font-semibold text-zinc-500">선수 기록</h2>

        {membership ? (
          <>
            {/* 상단: 등번호 · 1순위 포지션 · 이름 */}
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[.08] text-xl font-bold dark:bg-white/[.1]">
                {entry?.jersey_number ?? "-"}
              </span>
              <div>
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="text-sm text-zinc-500">
                  {entry?.positions[0] ?? "포지션 미설정"}
                  {age !== null && ` · 만 ${age}세`}
                </p>
              </div>
            </div>

            {/* 골/어시스트는 시즌 선택에 따라 값이 바뀐다(기본값: 전체 기록). */}
            <SeasonStatPicker
              seasons={seasonBreakdown.seasons}
              total={seasonBreakdown.total}
              bySeasonId={seasonBreakdown.bySeasonId}
            />

            {/* MOM · 출석률 · 경기는 시즌 구분 없이 그대로 보여준다. */}
            <div className="grid grid-cols-3 gap-3">
              <Stat label="MOM" value={entry?.mom ?? 0} />
              <Stat
                label="출석률"
                value={matchStats.attendanceRate === null ? "-" : `${matchStats.attendanceRate}%`}
              />
              <Stat label="경기" value={matchStats.attendedCount} />
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">팀에 가입하면 선수 기록이 표시됩니다.</p>
        )}
      </section>
    </main>
  );
}

// 기록 카드의 스탯 한 칸 (MOM · 출석률 · 경기처럼 시즌 구분 없는 단일 값용).
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-black/[.02] py-3 dark:bg-white/[.03]">
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}

// 경기 날짜를 "8.15" 형태로 짧게 표시한다.
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAge } from "@/lib/age";
import { POSITIONS, MAX_POSITIONS } from "@/lib/positions";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/dev-admin";
import BottomSheet from "@/components/bottom-sheet";
import type { RosterMember, TeamMemberRole } from "@/lib/teams";
import type { Season } from "@/lib/seasons";

// 골/어시스트는 시즌 기준 합계(현재 시즌 지정 안 됐으면 0) + 전체 누적을 함께 보여준다.
type RosterMemberWithStats = RosterMember & {
  seasonGoals: number;
  seasonAssists: number;
  totalGoals: number;
  totalAssists: number;
};

// "5 +12" 형태: 앞쪽 큰 숫자는 현재 시즌 합계, 뒤쪽 작은 +N은 전체(통합) 누적.
// 지정된 현재 시즌이 없으면 "0 +N"처럼 헷갈리게 보이지 않도록 전체 누적값 하나만 보여준다.
function GoalAssistCell({
  seasonValue,
  totalValue,
  hasCurrentSeason,
}: {
  seasonValue: number;
  totalValue: number;
  hasCurrentSeason: boolean;
}) {
  if (!hasCurrentSeason) return <span>{totalValue}</span>;
  return (
    <span>
      {seasonValue}
      <span className="ml-1 text-xs text-zinc-400">+{totalValue}</span>
    </span>
  );
}

// "부주장"은 매니저(manager)의 새 표기다 — DB 값(team_member_role enum)은 그대로 'manager'다.
const ROLE_LABEL: Record<TeamMemberRole, string> = { owner: "감독", manager: "부주장", member: "팀원" };

// 실제 팀 감독은 "감독"으로, 개발자 겸 관리자 테스트 계정만 "관리자"로 구분해서 보여준다
// (권한은 동일 — 표기만 다름. @/lib/dev-admin 참고).
function roleLabel(member: RosterMember) {
  if (member.profile?.email === PLATFORM_ADMIN_EMAIL) return "관리자";
  return ROLE_LABEL[member.role];
}

function formatDate(iso: string) {
  // 가입일은 접속 기기의 현지 시간이 아니라 팀 운영 기준인 한국 날짜로 항상 고정한다.
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replaceAll(". ", ".")
    .replace(/\.$/, "");
}

// 명단관리 화면. 선수는 별도 등록 없이 팀에 가입 승인된 사람 그대로다.
// 이름/나이(생년월일)는 본인이 마이페이지에서 입력한 값을 보여줄 뿐 여기서 고치지 않는다.
// 여기서는 owner·manager 권한으로 포지션/등번호/골/어시스트/MOM/역할을 편집하고, 제명은 owner만 한다.
// (포지션·등번호는 본인도 마이페이지에서 수정 가능 — 컬럼별 권한은 DB 트리거로 강제.)
// 열이 11개라 좁은 화면에서 표로는 한눈에 안 들어와서, 모바일(sm 미만)은 카드형 목록,
// 데스크톱(sm 이상)은 기존 표로 같은 데이터를 다르게 보여준다(로직/상태는 공유).
export default function RosterTable({
  teamId,
  members,
  seasons,
  selectedSeasonId,
  viewerRole,
  viewerEmail,
  currentSeasonName,
}: {
  teamId: string;
  members: RosterMemberWithStats[];
  seasons: Season[];
  selectedSeasonId: string | null;
  viewerRole: TeamMemberRole;
  viewerEmail: string | null;
  currentSeasonName: string | null;
}) {
  const router = useRouter();
  const [editingPositionsId, setEditingPositionsId] = useState<string | null>(null);
  const [draftPositions, setDraftPositions] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  // 모바일 목록은 한 줄짜리 압축 리스트만 보여주고, 탭하면 이 id의 상세를 바텀시트로 연다.
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  // 관리자 계정(PLATFORM_ADMIN_EMAIL)은 어느 팀에서든 감독과 동일한 권한을 갖는다
  // (역할 변경/제명 — DB의 enforce_team_member_update 트리거·team_members_delete_self_or_owner
  // 정책도 같은 기준으로 확장돼 있다).
  const isViewerOwnerOrAdmin = viewerRole === "owner" || viewerEmail === PLATFORM_ADMIN_EMAIL;
  const isPlatformAdmin = viewerEmail === PLATFORM_ADMIN_EMAIL;

  // owner(+관리자)는 모든 행의 스탯을 고칠 수 있고, manager는 일반 팀원(role='member') 행만 고칠 수 있다.
  // (DB의 team_members_update_manager 정책과 짝이 맞아야 한다.)
  const canEditStats = (target: RosterMember) =>
    isViewerOwnerOrAdmin || (viewerRole === "manager" && target.role === "member");
  // 관리자는 새 감독까지 지정할 수 있고, 감독은 일반 구성원을 부주장/팀원으로 변경할 수 있다.
  // 현재 감독은 새 감독 지정 과정에서만 자동으로 팀원이 되므로 직접 강등 셀렉트는 열지 않는다.
  const canManageRole = (target: RosterMember) =>
    target.role !== "owner" && (isPlatformAdmin || viewerRole === "owner");
  // 제명은 감독·관리자만 가능하다(DB team_members_delete_self_or_owner 정책과 짝이 맞아야 한다).
  // 감독 행은 애초에 제명 대상이 아니다.
  const canKick = (target: RosterMember) => target.role !== "owner" && isViewerOwnerOrAdmin;

  const updateFields = async (memberId: string, patch: Record<string, unknown>) => {
    setLoadingId(memberId);
    const supabase = createClient();
    await supabase.from("team_members").update(patch).eq("id", memberId);
    setLoadingId(null);
    router.refresh();
  };

  const changeRole = async (member: RosterMember, nextRole: TeamMemberRole) => {
    if (nextRole === member.role) return;
    const label = member.profile?.name || member.profile?.email || "해당 팀원";
    if (
      nextRole === "owner" &&
      !confirm(`${label}님을 새 감독으로 지정할까요? 기존 감독은 팀원으로 변경됩니다.`)
    ) {
      return;
    }

    setLoadingId(member.id);
    setRoleError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("change_team_member_role", {
      p_team_id: teamId,
      p_member_id: member.id,
      p_role: nextRole,
    });
    setLoadingId(null);
    if (error) {
      setRoleError(error.message);
      return;
    }
    router.refresh();
  };

  const roleOptions = isPlatformAdmin
    ? (["owner", "manager", "member"] as const)
    : (["manager", "member"] as const);

  // 검색 대상은 이름만이다. 이메일, 포지션, 등번호는 의도적으로 포함하지 않는다.
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase("ko-KR");
  const filteredMembers = normalizedQuery
    ? members.filter((member) =>
        (member.profile?.name ?? "").toLocaleLowerCase("ko-KR").includes(normalizedQuery)
      )
    : members;

  const kick = async (member: RosterMember) => {
    const label = member.profile?.name || member.profile?.email || "이 팀원";
    if (!confirm(`${label}님을 팀에서 제명할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    setLoadingId(member.id);
    const supabase = createClient();
    await supabase.from("team_members").delete().eq("id", member.id);
    setLoadingId(null);
    router.refresh();
  };

  // 등번호 입력 — 카드형/표형 둘 다 이 셀을 그대로 쓴다(로직 중복 방지).
  const jerseyCell = (m: RosterMember, statsEditable: boolean, busy: boolean) =>
    statsEditable ? (
      <input
        type="number"
        defaultValue={m.jersey_number ?? ""}
        disabled={busy}
        onBlur={(e) => {
          // 빈 값이면 null, 아니면 숫자로 저장. 등번호는 본인·감독·매니저가 수정 가능.
          const raw = e.target.value;
          const next = raw === "" ? null : Number(raw);
          if (next !== (m.jersey_number ?? null)) updateFields(m.id, { jersey_number: next });
        }}
        className="w-16 rounded border border-black/[.15] px-1.5 py-1 text-sm dark:border-white/[.2]"
      />
    ) : (
      <span>{m.jersey_number ?? "-"}</span>
    );

  // 포지션 선택/표시 — 카드형/표형 둘 다 이 셀을 그대로 쓴다.
  const positionsCell = (m: RosterMember, statsEditable: boolean) =>
    editingPositionsId === m.id ? (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <label key={p} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={draftPositions.includes(p)}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (draftPositions.length >= MAX_POSITIONS) return;
                    setDraftPositions([...draftPositions, p]);
                  } else {
                    setDraftPositions(draftPositions.filter((x) => x !== p));
                  }
                }}
              />
              {p}
            </label>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={async () => {
              await updateFields(m.id, { positions: draftPositions });
              setEditingPositionsId(null);
            }}
            className="underline"
          >
            저장
          </button>
          <button onClick={() => setEditingPositionsId(null)} className="text-zinc-400">
            취소
          </button>
        </div>
      </div>
    ) : (
      <button
        onClick={() => {
          if (!statsEditable) return;
          setDraftPositions(m.positions);
          setEditingPositionsId(m.id);
        }}
        disabled={!statsEditable}
        className={statsEditable ? "underline decoration-dotted underline-offset-2" : ""}
      >
        {m.positions.length > 0 ? m.positions.join(", ") : "-"}
      </button>
    );

  const openMember = filteredMembers.find((m) => m.id === openMemberId) ?? null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <select
          value={selectedSeasonId ?? ""}
          onChange={(e) => router.push(e.target.value ? `/roster?season=${e.target.value}` : "/roster")}
          aria-label="기록 시즌 선택"
          className="min-w-0 rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
        >
          <option value="">전체 기간</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}{season.is_current ? " ★" : ""}
            </option>
          ))}
        </select>

        <label className="relative ml-auto w-full max-w-56">
          <span className="sr-only">이름 검색</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
            <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="m12.2 12.2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="이름 검색"
            className="w-full rounded border border-black/[.15] py-2 pl-9 pr-3 text-sm dark:border-white/[.2]"
          />
        </label>
      </div>

      {/* 모바일(sm 미만): 한 줄짜리 압축 목록. 탭하면 상세가 바텀시트로 열린다. */}
      <div className="flex flex-col gap-2 sm:hidden">
        {filteredMembers.map((m) => (
          <button
            key={m.id}
            onClick={() => setOpenMemberId(m.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/[.08] px-4 py-3 text-left dark:border-white/[.1]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{m.profile?.name}</span>
              <span className="shrink-0 text-xs text-zinc-500">{roleLabel(m)}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
              {m.jersey_number != null && <span>#{m.jersey_number}</span>}
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* 모바일 상세/편집 바텀시트 — 목록에서 탭한 사람 한 명의 전체 정보를 보여준다. */}
      <BottomSheet
        open={openMember !== null}
        onClose={() => setOpenMemberId(null)}
        title={openMember?.profile?.name ?? ""}
      >
        {openMember && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm text-zinc-500">{openMember.profile?.email ?? "알 수 없음"}</p>
              <span className="shrink-0 rounded-full bg-black/[.05] px-2 py-1 text-xs dark:bg-white/[.08]">
                {roleLabel(openMember)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-500">나이</span>
                <span>{calcAge(openMember.profile?.birth_date) ?? openMember.profile?.age ?? "-"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-500">등번호</span>
                {jerseyCell(openMember, canEditStats(openMember), loadingId === openMember.id)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-500">가입일</span>
                <span className="text-zinc-500">{formatDate(openMember.created_at)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-xs text-zinc-500">포지션</span>
              {positionsCell(openMember, canEditStats(openMember))}
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg bg-black/[.02] py-2 text-center text-sm dark:bg-white/[.03]">
              <div>
                <p className="text-xs text-zinc-500">골</p>
                <p className="font-medium">
                  <GoalAssistCell seasonValue={openMember.seasonGoals} totalValue={openMember.totalGoals} hasCurrentSeason={currentSeasonName !== null} />
                </p>
                <p className="text-[10px] text-zinc-400">{currentSeasonName ?? "전체 누적"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">어시스트</p>
                <p className="font-medium">
                  <GoalAssistCell seasonValue={openMember.seasonAssists} totalValue={openMember.totalAssists} hasCurrentSeason={currentSeasonName !== null} />
                </p>
                <p className="text-[10px] text-zinc-400">{currentSeasonName ?? "전체 누적"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">MOM</p>
                <p className="font-medium">{openMember.mom}</p>
              </div>
            </div>

            {(canManageRole(openMember) || canKick(openMember)) && (
              <div className="flex flex-col gap-2 border-t border-black/[.06] pt-3 dark:border-white/[.08]">
                {canManageRole(openMember) && (
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-zinc-500">역할</span>
                    <select
                      value={openMember.role}
                      onChange={(e) => changeRole(openMember, e.target.value as TeamMemberRole)}
                      disabled={loadingId === openMember.id}
                      className="rounded border border-black/[.15] px-3 py-2 text-sm disabled:opacity-50 dark:border-white/[.2]"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                      ))}
                    </select>
                  </label>
                )}
                {canKick(openMember) && (
                  <button
                    onClick={async () => {
                      await kick(openMember);
                      setOpenMemberId(null);
                    }}
                    disabled={loadingId === openMember.id}
                    className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
                  >
                    제명
                  </button>
                )}
              </div>
            )}
            {roleError && <p className="text-sm text-red-600">{roleError}</p>}
          </div>
        )}
      </BottomSheet>

      {/* 데스크톱(sm 이상): 표 */}
      <div className="hidden overflow-x-auto rounded-2xl border border-black/[.08] sm:block dark:border-white/[.1]">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.1]">
              <th className="px-3 py-2.5 font-medium">이름</th>
              <th className="px-3 py-2.5 font-medium">ID</th>
              <th className="px-3 py-2.5 font-medium">나이</th>
              <th className="px-3 py-2.5 font-medium">등번호</th>
              <th className="px-3 py-2.5 font-medium">포지션</th>
              <th className="px-3 py-2.5 font-medium">가입일</th>
              <th className="px-3 py-2.5 font-medium">
                골
                <span className="block text-[10px] font-normal normal-case text-zinc-400">
                  {currentSeasonName ?? "전체 누적"}
                </span>
              </th>
              <th className="px-3 py-2.5 font-medium">
                어시스트
                <span className="block text-[10px] font-normal normal-case text-zinc-400">
                  {currentSeasonName ?? "전체 누적"}
                </span>
              </th>
              <th className="px-3 py-2.5 font-medium">MOM</th>
              <th className="px-3 py-2.5 font-medium">역할</th>
              <th className="px-3 py-2.5 font-medium">제명</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => {
              const statsEditable = canEditStats(m);
              const roleEditable = canManageRole(m);
              const busy = loadingId === m.id;

              return (
                <tr key={m.id} className="border-b border-black/[.05] last:border-0 dark:border-white/[.06]">
                  <td className="px-3 py-2.5">{m.profile?.name}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{m.profile?.email ?? "알 수 없음"}</td>
                  <td className="px-3 py-2.5">{calcAge(m.profile?.birth_date) ?? m.profile?.age ?? "-"}</td>
                  <td className="px-3 py-2.5">{jerseyCell(m, statsEditable, busy)}</td>
                  <td className="px-3 py-2.5">{positionsCell(m, statsEditable)}</td>
                  <td className="px-3 py-2.5 text-zinc-500">{formatDate(m.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <GoalAssistCell seasonValue={m.seasonGoals} totalValue={m.totalGoals} hasCurrentSeason={currentSeasonName !== null} />
                  </td>
                  <td className="px-3 py-2.5">
                    <GoalAssistCell seasonValue={m.seasonAssists} totalValue={m.totalAssists} hasCurrentSeason={currentSeasonName !== null} />
                  </td>
                  <td className="px-3 py-2.5">{m.mom}</td>
                  <td className="px-3 py-2.5">
                    {roleEditable ? (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as TeamMemberRole)}
                        disabled={busy}
                        className="rounded border border-black/[.15] px-2 py-1 text-sm disabled:opacity-50 dark:border-white/[.2]"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{roleLabel(m)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {canKick(m) && (
                      <button
                        onClick={() => kick(m)}
                        disabled={busy}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
                      >
                        제명
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredMembers.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/[.12] px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/[.15]">
          해당 이름의 팀원이 없습니다.
        </p>
      )}
      {roleError && <p className="text-sm text-red-600">{roleError}</p>}
    </>
  );
}

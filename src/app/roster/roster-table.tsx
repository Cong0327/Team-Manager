"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAge } from "@/lib/age";
import { POSITIONS, MAX_POSITIONS } from "@/lib/positions";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/dev-admin";
import BottomSheet from "@/components/bottom-sheet";
import type { RosterMember, TeamMemberRole } from "@/lib/teams";

const ROLE_LABEL: Record<TeamMemberRole, string> = { owner: "감독", manager: "매니저", member: "팀원" };

// 실제 팀 감독은 "감독"으로, 개발자 겸 관리자 테스트 계정만 "관리자"로 구분해서 보여준다
// (권한은 동일 — 표기만 다름. @/lib/dev-admin 참고).
function roleLabel(member: RosterMember) {
  if (member.role === "owner" && member.profile?.email === PLATFORM_ADMIN_EMAIL) return "관리자";
  return ROLE_LABEL[member.role];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 명단관리 화면. 선수는 별도 등록 없이 팀에 가입 승인된 사람 그대로다.
// 이름/나이(생년월일)는 본인이 마이페이지에서 입력한 값을 보여줄 뿐 여기서 고치지 않는다.
// 여기서는 owner·manager 권한으로 포지션/등번호/골/어시스트/MOM/역할을 편집하고, 제명은 owner만 한다.
// (포지션·등번호는 본인도 마이페이지에서 수정 가능 — 컬럼별 권한은 DB 트리거로 강제.)
// 열이 11개라 좁은 화면에서 표로는 한눈에 안 들어와서, 모바일(sm 미만)은 카드형 목록,
// 데스크톱(sm 이상)은 기존 표로 같은 데이터를 다르게 보여준다(로직/상태는 공유).
export default function RosterTable({
  members,
  viewerRole,
}: {
  members: RosterMember[];
  viewerRole: TeamMemberRole;
}) {
  const router = useRouter();
  const [editingPositionsId, setEditingPositionsId] = useState<string | null>(null);
  const [draftPositions, setDraftPositions] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // 모바일 목록은 한 줄짜리 압축 리스트만 보여주고, 탭하면 이 id의 상세를 바텀시트로 연다.
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  // owner는 모든 행의 스탯을 고칠 수 있고, manager는 일반 팀원(role='member') 행만 고칠 수 있다.
  // (DB의 team_members_update_manager 정책과 짝이 맞아야 한다.)
  const canEditStats = (target: RosterMember) =>
    viewerRole === "owner" || (viewerRole === "manager" && target.role === "member");
  // 매니저 지정/해제는 owner·manager 모두 가능하지만(감독 행은 대상에서 제외).
  const canManageRole = (target: RosterMember) => target.role !== "owner" && canEditStats(target);
  // 제명은 감독(owner)만 가능하다 — 매니저는 더 이상 못 한다(DB team_members_delete_self_or_owner
  // 정책과 짝이 맞아야 한다). 감독 행은 애초에 제명 대상이 아니다.
  const canKick = (target: RosterMember) => target.role !== "owner" && viewerRole === "owner";

  const updateFields = async (memberId: string, patch: Record<string, unknown>) => {
    setLoadingId(memberId);
    const supabase = createClient();
    await supabase.from("team_members").update(patch).eq("id", memberId);
    setLoadingId(null);
    router.refresh();
  };

  const toggleManager = async (member: RosterMember) => {
    await updateFields(member.id, { role: member.role === "manager" ? "member" : "manager" });
  };

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

  const openMember = members.find((m) => m.id === openMemberId) ?? null;

  return (
    <>
      {/* 모바일(sm 미만): 한 줄짜리 압축 목록. 탭하면 상세가 바텀시트로 열린다. */}
      <div className="flex flex-col gap-2 sm:hidden">
        {members.map((m) => (
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
                <p className="font-medium">{openMember.goals}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">어시스트</p>
                <p className="font-medium">{openMember.assists}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">MOM</p>
                <p className="font-medium">{openMember.mom}</p>
              </div>
            </div>

            {(canManageRole(openMember) || canKick(openMember)) && (
              <div className="flex gap-2 border-t border-black/[.06] pt-3 dark:border-white/[.08]">
                {canManageRole(openMember) && (
                  <button
                    onClick={() => toggleManager(openMember)}
                    disabled={loadingId === openMember.id}
                    className="flex-1 rounded border border-black/[.15] px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/[.2]"
                  >
                    {openMember.role === "manager" ? "매니저 해제" : "매니저 지정"}
                  </button>
                )}
                {canKick(openMember) && (
                  <button
                    onClick={async () => {
                      await kick(openMember);
                      setOpenMemberId(null);
                    }}
                    disabled={loadingId === openMember.id}
                    className="flex-1 rounded border border-red-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
                  >
                    제명
                  </button>
                )}
              </div>
            )}
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
              <th className="px-3 py-2.5 font-medium">골</th>
              <th className="px-3 py-2.5 font-medium">어시스트</th>
              <th className="px-3 py-2.5 font-medium">MOM</th>
              <th className="px-3 py-2.5 font-medium">역할</th>
              <th className="px-3 py-2.5 font-medium">제명</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
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
                  <td className="px-3 py-2.5">{m.goals}</td>
                  <td className="px-3 py-2.5">{m.assists}</td>
                  <td className="px-3 py-2.5">{m.mom}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <span>{roleLabel(m)}</span>
                      {roleEditable && (
                        <button
                          onClick={() => toggleManager(m)}
                          disabled={busy}
                          className="text-xs text-zinc-500 underline disabled:opacity-50"
                        >
                          {m.role === "manager" ? "매니저 해제" : "매니저 지정"}
                        </button>
                      )}
                    </div>
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
    </>
  );
}

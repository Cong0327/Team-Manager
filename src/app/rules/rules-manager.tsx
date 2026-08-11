"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TeamPolicy } from "@/lib/policies";

type Props = {
  teamId: string;
  currentUserId: string;
  policies: TeamPolicy[];
  canManage: boolean; // 감독(owner)만 true
};

// 회칙 목록(카드형, 최신순) + 감독 전용 생성/수정/삭제.
// 저장은 클라이언트에서 Supabase로 직접 쓰고 RLS가 최종 권한을 검증한다.
export default function RulesManager({ teamId, currentUserId, policies, canManage }: Props) {
  const router = useRouter();
  // editingId: null=닫힘, "new"=신규 작성, 그 외=해당 회칙 수정.
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {canManage && editingId !== "new" && (
        <button
          onClick={() => setEditingId("new")}
          className="self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          + 회칙 생성
        </button>
      )}

      {/* 신규 작성 에디터 (목록 위) */}
      {editingId === "new" && (
        <PolicyEditor
          teamId={teamId}
          currentUserId={currentUserId}
          onDone={() => {
            setEditingId(null);
            router.refresh();
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      {policies.length === 0 && editingId !== "new" ? (
        <p className="text-sm text-zinc-500">아직 등록된 회칙이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {policies.map((policy) =>
            editingId === policy.id ? (
              <PolicyEditor
                key={policy.id}
                teamId={teamId}
                currentUserId={currentUserId}
                policy={policy}
                onDone={() => {
                  setEditingId(null);
                  router.refresh();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <PolicyCard
                key={policy.id}
                policy={policy}
                canManage={canManage}
                onEdit={() => setEditingId(policy.id)}
                onDeleted={() => router.refresh()}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// 회칙 카드 하나. 제목/본문(줄바꿈 보존)과 시각을 보여주고, 감독에게는 수정/삭제 버튼을 준다.
function PolicyCard({
  policy,
  canManage,
  onEdit,
  onDeleted,
}: {
  policy: TeamPolicy;
  canManage: boolean;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  // 수정된 적이 있으면(updated_at이 created_at보다 유의미하게 늦으면) 수정 시각을 함께 보여준다.
  const edited = new Date(policy.updated_at).getTime() - new Date(policy.created_at).getTime() > 1000;

  const handleDelete = async () => {
    if (!confirm("이 회칙을 삭제할까요?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("team_policy").delete().eq("id", policy.id);
    setLoading(false);
    onDeleted();
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-black/[.1] p-5 dark:border-white/[.15]">
      <div className="flex items-start justify-between gap-3">
        <div>
          {policy.title && <h2 className="font-semibold">{policy.title}</h2>}
          <p className="text-xs text-zinc-400">
            {formatDate(policy.created_at)}
            {edited && ` · 수정됨 ${formatDate(policy.updated_at)}`}
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={onEdit}
              className="rounded border border-black/[.15] px-2 py-1 text-xs dark:border-white/[.2]"
            >
              수정
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-900"
            >
              삭제
            </button>
          </div>
        )}
      </div>
      {/* 본문: 입력한 줄바꿈/공백을 그대로 살려 보여준다. */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{policy.content}</p>
    </article>
  );
}

// 회칙 작성/수정 에디터. policy가 있으면 수정 모드, 없으면 생성 모드.
function PolicyEditor({
  teamId,
  currentUserId,
  policy,
  onDone,
  onCancel,
}: {
  teamId: string;
  currentUserId: string;
  policy?: TeamPolicy;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isCreate = !policy;
  const [title, setTitle] = useState(policy?.title ?? "");
  const [content, setContent] = useState(policy?.content ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError("내용을 입력하세요.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    let dbError;
    if (isCreate) {
      ({ error: dbError } = await supabase.from("team_policy").insert({
        team_id: teamId,
        title: title.trim() || null,
        content: content.trim(),
        created_by: currentUserId,
      }));
    } else {
      // updated_at은 DB 트리거가 자동으로 갱신한다.
      ({ error: dbError } = await supabase
        .from("team_policy")
        .update({ title: title.trim() || null, content: content.trim() })
        .eq("id", policy.id));
    }

    setLoading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.15] p-5 dark:border-white/[.2]">
      <input
        placeholder="제목 (선택)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-black/[.15] px-3 py-2 text-sm font-medium dark:border-white/[.2]"
      />
      <textarea
        placeholder="회칙 내용을 입력하세요. 줄바꿈은 그대로 보존됩니다."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        className="resize-y rounded border border-black/[.15] px-3 py-2 text-sm leading-relaxed dark:border-white/[.2]"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "저장 중..." : isCreate ? "등록" : "저장"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="rounded border border-black/[.15] px-4 py-2 text-sm dark:border-white/[.2]"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// 등록/수정 시각을 "2026.8.11" 형태로 표시한다.
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

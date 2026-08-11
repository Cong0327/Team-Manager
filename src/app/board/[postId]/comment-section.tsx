"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BoardComment, BoardCommentThread } from "@/lib/board";

// 댓글 + 대댓글(답글) 목록/작성/삭제. 답글은 최상위 댓글에만 달 수 있다(DB 트리거로도 강제).
// 삭제는 작성자 본인 또는 팀 owner·manager. 수정 기능은 없음(삭제 후 다시 작성).
export default function CommentSection({
  postId,
  currentUserId,
  canModerate,
  initialComments,
}: {
  postId: string;
  currentUserId: string;
  canModerate: boolean;
  initialComments: BoardCommentThread[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = initialComments.reduce((sum, c) => sum + 1 + c.replies.length, 0);
  const canDelete = (comment: BoardComment) => comment.author_id === currentUserId || canModerate;

  const submitComment = async (parentCommentId: string | null, text: string) => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("board_comments").insert({
      post_id: postId,
      parent_comment_id: parentCommentId,
      author_id: currentUserId,
      content: text.trim(),
    });
    setSubmitting(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    if (parentCommentId) {
      setReplyContent("");
      setReplyTarget(null);
    } else {
      setContent("");
    }
    router.refresh();
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    const supabase = createClient();
    await supabase.from("board_comments").delete().eq("id", commentId);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 border-t border-black/[.08] pt-4 dark:border-white/[.1]">
      <h2 className="text-sm font-semibold text-zinc-500">댓글 {totalCount}개</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          rows={2}
          className="resize-y rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2] dark:bg-white/[.05]"
        />
        <button
          type="button"
          onClick={() => submitComment(null, content)}
          disabled={submitting || !content.trim()}
          className="self-start rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          등록
        </button>
      </div>

      {initialComments.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 댓글이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {initialComments.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-2">
              <CommentRow
                comment={comment}
                canDelete={canDelete(comment)}
                onDelete={() => handleDelete(comment.id)}
                isReplying={replyTarget === comment.id}
                onToggleReply={() =>
                  setReplyTarget((prev) => (prev === comment.id ? null : comment.id))
                }
              />

              {replyTarget === comment.id && (
                <div className="ml-6 flex flex-col gap-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 입력하세요"
                    rows={2}
                    className="resize-y rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2] dark:bg-white/[.05]"
                  />
                  <button
                    type="button"
                    onClick={() => submitComment(comment.id, replyContent)}
                    disabled={submitting || !replyContent.trim()}
                    className="self-start rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2] disabled:opacity-50"
                  >
                    답글 등록
                  </button>
                </div>
              )}

              {comment.replies.length > 0 && (
                <div className="ml-6 flex flex-col gap-3 border-l border-black/[.08] pl-3 dark:border-white/[.1]">
                  {comment.replies.map((reply) => (
                    <CommentRow
                      key={reply.id}
                      comment={reply}
                      canDelete={canDelete(reply)}
                      onDelete={() => handleDelete(reply.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
  isReplying,
  onToggleReply,
}: {
  comment: BoardComment;
  canDelete: boolean;
  onDelete: () => void;
  isReplying?: boolean;
  onToggleReply?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {comment.author?.name ?? comment.author?.email ?? "알 수 없음"}
        </span>
        <span className="text-xs text-zinc-400">
          {new Date(comment.created_at).toLocaleString("ko-KR")}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
      <div className="flex gap-3 text-xs text-zinc-500">
        {onToggleReply && (
          <button type="button" onClick={onToggleReply} className="hover:text-foreground hover:underline">
            {isReplying ? "답글 취소" : "답글"}
          </button>
        )}
        {canDelete && (
          <button type="button" onClick={onDelete} className="hover:text-red-600 hover:underline">
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

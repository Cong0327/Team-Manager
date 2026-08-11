"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// board-post-form.tsx와 동일 — 사진첩과 같은 버킷을 재사용한다.
const BOARD_IMAGE_BUCKET = "gallery";

export default function DeletePostButton({
  postId,
  imagePaths,
}: {
  postId: string;
  imagePaths: string[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("이 게시글을 삭제할까요?")) return;
    setDeleting(true);
    const supabase = createClient();
    // 첨부 사진 파일과 게시글 행을 함께 지운다.
    if (imagePaths.length > 0) await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(imagePaths);
    await supabase.from("board_posts").delete().eq("id", postId);
    router.push("/board");
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
    >
      {deleting ? "삭제 중..." : "삭제"}
    </button>
  );
}

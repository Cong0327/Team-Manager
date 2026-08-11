"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BoardPost } from "@/lib/board";

// Storage 버킷 이름. 클라이언트에서만 쓰므로 여기에 둔다
// (서버 전용 모듈 @/lib/board에서 런타임 값을 import하면 클라이언트 번들로 끌려온다).
const BOARD_IMAGE_BUCKET = "gallery";

type ExistingImage = { path: string; url: string };
type NewImage = { file: File; url: string };

// 게시글 작성/수정 공용 폼. post가 없으면 새 글, 있으면 수정 모드로 동작한다.
export default function BoardPostForm({
  teamId,
  currentUserId,
  post,
}: {
  teamId: string;
  currentUserId: string;
  post?: BoardPost;
}) {
  const router = useRouter();
  const isEdit = Boolean(post);
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(
    post ? post.image_paths.map((path, i) => ({ path, url: post.image_urls[i] })) : []
  );
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새로 첨부한 파일의 미리보기 objectURL은 폼을 떠날 때 반드시 해제한다(메모리 누수 방지).
  useEffect(() => {
    return () => {
      newImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [newImages]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...images]);
  };

  const removeExisting = (path: string) => {
    setExistingImages((prev) => prev.filter((img) => img.path !== path));
    setRemovedPaths((prev) => [...prev, path]);
  };

  const removeNew = (url: string) => {
    setNewImages((prev) => prev.filter((img) => img.url !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const postId = post?.id ?? crypto.randomUUID();

    // 새로 첨부한 파일을 team_id/board/post_id 폴더에 올린다.
    const uploadedPaths: string[] = [];
    for (const { file } of newImages) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${teamId}/board/${postId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BOARD_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (uploadError) {
        if (uploadedPaths.length > 0) await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(uploadedPaths);
        setError(uploadError.message);
        setSaving(false);
        return;
      }
      uploadedPaths.push(path);
    }

    const image_paths = [...existingImages.map((img) => img.path), ...uploadedPaths];

    const { error: dbError } = isEdit
      ? await supabase
          .from("board_posts")
          .update({ title: title.trim(), content: content.trim(), image_paths })
          .eq("id", postId)
      : await supabase.from("board_posts").insert({
          id: postId,
          team_id: teamId,
          author_id: currentUserId,
          title: title.trim(),
          content: content.trim(),
          image_paths,
        });

    if (dbError) {
      // 방금 올린 새 파일이 고아로 남지 않게 되돌린다.
      if (uploadedPaths.length > 0) await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(uploadedPaths);
      setError(dbError.message);
      setSaving(false);
      return;
    }

    // 저장이 성공한 뒤에만 수정 중 제거한 기존 이미지를 실제로 지운다.
    if (removedPaths.length > 0) await supabase.storage.from(BOARD_IMAGE_BUCKET).remove(removedPaths);

    router.push(`/board/${postId}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        maxLength={200}
        className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2] dark:bg-white/[.05]"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        rows={10}
        className="resize-y rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2] dark:bg-white/[.05]"
      />

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="self-start rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
        >
          + 사진 첨부
        </button>

        {(existingImages.length > 0 || newImages.length > 0) && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingImages.map((img) => (
              <div
                key={img.path}
                className="group relative aspect-square overflow-hidden rounded border border-black/[.08] dark:border-white/[.1]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(img.path)}
                  aria-label="사진 제거"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
            {newImages.map((img) => (
              <div
                key={img.url}
                className="group relative aspect-square overflow-hidden rounded border border-black/[.08] dark:border-white/[.1]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNew(img.url)}
                  aria-label="사진 제거"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "저장 중..." : isEdit ? "수정 완료" : "등록"}
      </button>
    </form>
  );
}

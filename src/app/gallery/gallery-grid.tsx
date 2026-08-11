"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GalleryItem } from "@/lib/gallery";

// Storage 버킷 이름. 클라이언트에서만 쓰므로 여기에 둔다
// (서버 전용 모듈 @/lib/gallery에서 런타임 값을 import하면 클라이언트 번들로 끌려온다).
const GALLERY_BUCKET = "gallery";

type Props = {
  teamId: string;
  items: GalleryItem[];
  currentUserId: string;
  canModerate: boolean; // owner·manager는 다른 사람 사진도 삭제 가능
};

// 사진/동영상 업로드 + 그리드 표시 + 삭제.
// 실제 파일은 Supabase Storage에 올리고, 메타데이터 행을 gallery_items에 남긴다.
export default function GalleryGrid({ teamId, items, currentUserId, canModerate }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    // 여러 파일을 순차 업로드한다(소량 업로드 기준 단순함 우선).
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        setError("이미지 또는 동영상 파일만 올릴 수 있습니다.");
        continue;
      }

      // 경로 첫 폴더를 team_id로 두면 Storage 정책이 팀 단위 권한을 검사할 수 있다.
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${teamId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      // 메타데이터 행 저장. 실패하면 방금 올린 파일을 되돌려(고아 파일 방지) 정리한다.
      const { error: dbError } = await supabase.from("gallery_items").insert({
        team_id: teamId,
        storage_path: path,
        media_type: isImage ? "image" : "video",
        uploaded_by: currentUserId,
      });

      if (dbError) {
        await supabase.storage.from(GALLERY_BUCKET).remove([path]);
        setError(dbError.message);
      }
    }

    setUploading(false);
    // input 값을 비워 같은 파일을 다시 선택해도 change 이벤트가 나도록 한다.
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    const supabase = createClient();
    // Storage 파일과 메타데이터 행을 함께 지운다.
    await supabase.storage.from(GALLERY_BUCKET).remove([item.storage_path]);
    await supabase.from("gallery_items").delete().eq("id", item.id);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {uploading ? "업로드 중..." : "+ 사진/동영상 올리기"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 올라온 사진이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => {
            // 올린 사람 본인이거나 owner·manager면 삭제 버튼을 보여준다.
            const canDelete = item.uploaded_by === currentUserId || canModerate;
            return (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-black/[.08] bg-black/[.02] dark:border-white/[.1] dark:bg-white/[.03]"
              >
                {item.media_type === "image" ? (
                  // 원본 이미지를 그대로 보여준다(Storage 공개 URL). next/image 대신 <img> 사용 —
                  // 외부 Storage 도메인 최적화 설정 없이도 바로 동작시키기 위함.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.caption ?? "사진"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video src={item.url} controls className="h-full w-full object-cover" />
                )}

                {canDelete && (
                  <button
                    onClick={() => handleDelete(item)}
                    aria-label="삭제"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";

export const GALLERY_BUCKET = "gallery";

export type GalleryItem = {
  id: string;
  team_id: string;
  storage_path: string;
  media_type: "image" | "video";
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  url: string; // Storage 공개 URL(표시용)
};

// 팀 사진첩 항목을 최신순으로 가져오면서 각 파일의 공개 URL을 붙인다.
// 'gallery' 버킷이 public이라 getPublicUrl로 바로 볼 수 있는 주소를 만든다.
export async function getGalleryItems(teamId: string): Promise<GalleryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, team_id, storage_path, media_type, caption, uploaded_by, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item) => {
    const { data: pub } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(item.storage_path);
    return { ...item, url: pub.publicUrl } as GalleryItem;
  });
}

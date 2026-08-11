import { createClient } from "@/lib/supabase/server";

// 사진첩과 같은 버킷을 쓴다 — 'gallery' 버킷의 RLS가 team_id 폴더 기준으로
// 이미 "팀 승인 멤버만 업로드/삭제" 를 강제하므로 board 하위 경로도 그대로 재사용된다.
export const BOARD_IMAGE_BUCKET = "gallery";

export type BoardPost = {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string;
  image_paths: string[];
  created_at: string;
  updated_at: string;
  author: { email: string; name: string | null } | null;
  image_urls: string[]; // image_paths와 같은 순서의 공개 URL(표시용)
};

type BoardPostRow = {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string;
  image_paths: string[] | null;
  created_at: string;
  updated_at: string;
  author: { email: string; name: string | null } | { email: string; name: string | null }[] | null;
};

function toBoardPost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: BoardPostRow
): BoardPost {
  const author = Array.isArray(row.author) ? row.author[0] ?? null : row.author;
  const image_paths = row.image_paths ?? [];
  const image_urls = image_paths.map(
    (path) => supabase.storage.from(BOARD_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
  );
  return { ...row, image_paths, author, image_urls };
}

// 게시판 목록: 최신순. 목록에서 작성자/첨부 사진 수를 바로 보여주기 위해 author를 함께 가져온다.
export async function getBoardPosts(teamId: string): Promise<BoardPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .select(
      "id, team_id, author_id, title, content, image_paths, created_at, updated_at, author:profiles(email, name)"
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => toBoardPost(supabase, row as BoardPostRow));
}

export async function getBoardPost(postId: string): Promise<BoardPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_posts")
    .select(
      "id, team_id, author_id, title, content, image_paths, created_at, updated_at, author:profiles(email, name)"
    )
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;
  return toBoardPost(supabase, data as BoardPostRow);
}

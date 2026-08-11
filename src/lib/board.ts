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

export type BoardComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  author: { email: string; name: string | null } | null;
};

// 최상위 댓글 + 그 댓글에 달린 답글(대댓글) 목록. DB 트리거가 2단계까지만 허용하므로
// replies는 항상 최상위 댓글에만 매달린다.
export type BoardCommentThread = BoardComment & { replies: BoardComment[] };

type BoardCommentRow = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  author: { email: string; name: string | null } | { email: string; name: string | null }[] | null;
};

// 시간순으로 전부 가져와서 최상위/답글로 나눈다(글당 댓글 수가 적은 소규모 팀 앱 전제).
export async function getBoardComments(postId: string): Promise<BoardCommentThread[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_comments")
    .select("id, post_id, parent_comment_id, author_id, content, created_at, author:profiles(email, name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const rows: BoardComment[] = (data as BoardCommentRow[]).map((row) => ({
    ...row,
    author: Array.isArray(row.author) ? row.author[0] ?? null : row.author,
  }));

  const repliesByParent = new Map<string, BoardComment[]>();
  for (const row of rows) {
    if (!row.parent_comment_id) continue;
    const list = repliesByParent.get(row.parent_comment_id) ?? [];
    list.push(row);
    repliesByParent.set(row.parent_comment_id, list);
  }

  return rows
    .filter((row) => !row.parent_comment_id)
    .map((row) => ({ ...row, replies: repliesByParent.get(row.id) ?? [] }));
}

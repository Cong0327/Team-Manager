import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getBoardComments, getBoardPost } from "@/lib/board";
import DeletePostButton from "./delete-post-button";
import CommentSection from "./comment-section";

export default async function BoardPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const post = await getBoardPost(postId);
  // 다른 팀 게시글이거나 존재하지 않으면 404. (RLS로도 다른 팀 글은 애초에 안 읽힘)
  if (!post || post.team_id !== membership.team.id) notFound();

  const isAuthor = post.author_id === user.id;
  const isTeamManager = membership.role === "owner" || membership.role === "manager";
  const canModeratePost = isAuthor || isTeamManager;
  const comments = await getBoardComments(post.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <Link href="/board" className="text-sm text-zinc-500 hover:text-foreground">
        ← 게시판으로
      </Link>

      <div className="flex flex-col gap-2 border-b border-black/[.08] pb-4 dark:border-white/[.1]">
        <h1 className="text-xl font-semibold">{post.title}</h1>
        <p className="text-sm text-zinc-500">
          {post.author?.name ?? post.author?.email ?? "알 수 없음"} ·{" "}
          {new Date(post.created_at).toLocaleString("ko-KR")}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

      {post.image_urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.image_urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="aspect-square w-full rounded object-cover" />
          ))}
        </div>
      )}

      {canModeratePost && (
        <div className="flex gap-2 pt-2">
          {isAuthor && (
            <Link
              href={`/board/${post.id}/edit`}
              className="rounded border border-black/[.15] px-3 py-2 text-sm dark:border-white/[.2]"
            >
              수정
            </Link>
          )}
          <DeletePostButton postId={post.id} imagePaths={post.image_paths} />
        </div>
      )}

      <CommentSection
        postId={post.id}
        currentUserId={user.id}
        canModerate={isTeamManager}
        initialComments={comments}
      />
    </main>
  );
}

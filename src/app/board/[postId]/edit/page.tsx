import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getBoardPost } from "@/lib/board";
import BoardPostForm from "../../board-post-form";

export default async function EditBoardPostPage({
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
  if (!post || post.team_id !== membership.team.id) notFound();
  // 수정은 작성자 본인만(RLS와 동일한 규칙). 다른 사람이 URL로 직접 들어오면 상세로 돌려보낸다.
  if (post.author_id !== user.id) redirect(`/board/${postId}`);

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="mx-auto w-full max-w-2xl text-xl font-semibold">글 수정</h1>
      <BoardPostForm teamId={membership.team.id} currentUserId={user.id} post={post} />
    </main>
  );
}

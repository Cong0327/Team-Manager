import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import BoardPostForm from "../board-post-form";

export default async function NewBoardPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="mx-auto w-full max-w-2xl text-xl font-semibold">글쓰기</h1>
      <BoardPostForm teamId={membership.team.id} currentUserId={user.id} />
    </main>
  );
}

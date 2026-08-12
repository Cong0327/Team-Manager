import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getBoardPosts } from "@/lib/board";

// 게시판: 승인된 팀원 전원 조회/작성 가능, 수정은 작성자 본인, 삭제는 작성자 본인 또는
// owner·manager (RLS로도 강제). 상세/작성/수정은 각각 [postId], new, [postId]/edit 페이지.
export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team } = membership;
  const posts = await getBoardPosts(team.id);

  return (
    <main className="app-page flex flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <div>
          <p className="page-eyebrow">Community</p><h1 className="page-title">게시판</h1>
          <p className="page-subtitle">
            {team.name} · {posts.length}개 ·{" "}
            <Link href="/gallery" className="underline hover:text-foreground">
              사진첩 보기
            </Link>
          </p>
        </div>
        <Link
          href="/board/new"
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          + 글쓰기
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="mx-auto w-full max-w-2xl text-sm text-zinc-500">아직 게시글이 없습니다.</p>
      ) : (
        <div className="content-card mx-auto w-full max-w-4xl overflow-x-auto p-2 sm:p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[.1] text-left text-xs text-zinc-500 dark:border-white/[.15]">
                <th className="px-3 py-2 font-medium">제목</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">작성자</th>
                <th className="px-3 py-2 text-right font-medium">작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-black/[.06] transition-colors hover:bg-black/[.02] dark:border-white/[.08] dark:hover:bg-white/[.03]"
                >
                  <td className="max-w-0 px-3 py-2.5">
                    <Link href={`/board/${post.id}`} className="flex items-center gap-1.5 hover:underline">
                      <span className="truncate">{post.title}</span>
                      {post.image_urls.length > 0 && (
                        <svg
                          viewBox="0 0 20 20"
                          aria-label={`사진 ${post.image_urls.length}장 첨부`}
                          className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                          fill="none"
                        >
                          <path
                            d="M4 6.5a1.5 1.5 0 0 1 1.5-1.5h.88a1.5 1.5 0 0 0 1.28-.72l.42-.68A1.5 1.5 0 0 1 9.36 3h1.28a1.5 1.5 0 0 1 1.28.6l.42.68a1.5 1.5 0 0 0 1.28.72h.88A1.5 1.5 0 0 1 16 6.5v6A1.5 1.5 0 0 1 14.5 14h-9A1.5 1.5 0 0 1 4 12.5v-6Z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                          <circle cx="10" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                      )}
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-zinc-500 sm:table-cell">
                    {post.author?.name ?? post.author?.email ?? "알 수 없음"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-500">
                    {new Date(post.created_at).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

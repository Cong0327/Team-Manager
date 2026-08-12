import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/teams";
import { getGalleryItems } from "@/lib/gallery";
import GalleryGrid from "./gallery-grid";

// 사진첩: 업로드/조회는 팀원 전원, 삭제는 올린 사람 또는 owner·manager(RLS로도 강제).
export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getActiveMembership();
  if (!membership) redirect("/team");

  const { team, role } = membership;
  const items = await getGalleryItems(team.id);
  const canModerate = role === "owner" || role === "manager";

  return (
    <main className="app-page flex flex-1 flex-col gap-5 px-3 py-4 sm:px-6 sm:py-8">
      <div>
        <p className="page-eyebrow">Gallery</p><h1 className="page-title">사진첩</h1>
        <p className="page-subtitle">
          {team.name} · {items.length}개 ·{" "}
          <Link href="/board" className="underline hover:text-foreground">
            게시판 보기
          </Link>
        </p>
      </div>

      <GalleryGrid
        teamId={team.id}
        items={items}
        currentUserId={user.id}
        canModerate={canModerate}
      />
    </main>
  );
}

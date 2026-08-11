"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveTeam } from "@/lib/team-actions";

export default function CreateTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        description: description || null,
        region: region || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (teamError || !team) {
      setError(teamError?.message ?? "팀 생성에 실패했습니다.");
      setLoading(false);
      return;
    }

    // 팀 생성자는 별도 승인 없이 owner+approved 멤버로 바로 등록된다.
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
      status: "approved",
    });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    // 새로 만든 팀을 바로 활성 팀으로 전환한다 (기존에 다른 팀이 있어도 방금 만든 팀을 보여준다).
    await setActiveTeam(team.id);
    router.push("/");
    router.refresh();
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-xl font-semibold">팀 생성하기</h1>
        <input
          required
          placeholder="팀명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        <input
          placeholder="활동 지역 (선택)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        <textarea
          placeholder="팀 소개 (선택)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {loading ? "생성 중..." : "생성하기"}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/lib/teams";

export default function JoinTeamPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(10);

    if (error) {
      setError(error.message);
    } else {
      setResults(data ?? []);
    }
    setSearching(false);
  };

  const handleJoinRequest = async (teamId: string) => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      team_id: teamId,
      user_id: user.id,
      role: "member",
      status: "pending",
    });

    if (error) {
      setError(error.message);
      return;
    }

    setRequestedId(teamId);
    router.push("/team");
    router.refresh();
  };

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-xl font-semibold">팀 가입하기</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            placeholder="팀명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded border border-black/[.15] px-3 py-2 dark:border-white/[.2]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
          >
            검색
          </button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col gap-2">
          {results.map((team) => (
            <li
              key={team.id}
              className="flex items-center justify-between gap-3 rounded border border-black/[.1] px-3 py-2 dark:border-white/[.15]"
            >
              <div>
                <p className="text-sm font-medium">{team.name}</p>
                {team.region && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{team.region}</p>
                )}
              </div>
              <button
                onClick={() => handleJoinRequest(team.id)}
                disabled={requestedId === team.id}
                className="rounded border border-black/[.15] px-3 py-1 text-sm dark:border-white/[.2]"
              >
                {requestedId === team.id ? "신청됨" : "가입 신청"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

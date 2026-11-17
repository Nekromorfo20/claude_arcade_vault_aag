import { createClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/lib/data";
export interface RealGame {
  id: string;
  title: string;
}
export async function getRealGames(): Promise<RealGame[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title")
    .order("title", { ascending: true });
  if (error || !data) return [];
  return data;
}
export async function saveScore(gameId: string, userId: string, score: number) {
  const supabase = createClient();
  return supabase
    .from("scores")
    .insert({ game_id: gameId, user_id: userId, score });
}
export async function getTopScores(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("score, created_at, profiles(username)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row, i) => ({
    rank: i + 1,
    name:
      (row.profiles as unknown as { username: string } | null)?.username ??
      "???",
    score: row.score,
    date: new Date(row.created_at).toLocaleDateString("es-ES"),
  }));
}
export interface GameStats {
  best: number;
  plays: number;
}
export async function getGameStats(gameId: string): Promise<GameStats> {
  const supabase = createClient();
  const { data, count } = await supabase
    .from("scores")
    .select("score", { count: "exact" })
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(1);
  return { best: data?.[0]?.score ?? 0, plays: count ?? 0 };
}
export async function getMyBestRank(
  gameId: string,
  userId: string,
): Promise<ScoreRow | null> {
  const supabase = createClient();
  const { data: best } = await supabase
    .from("scores")
    .select("score, created_at, profiles(username)")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!best) return null;
  const { count } = await supabase
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .gt("score", best.score);
  return {
    rank: (count ?? 0) + 1,
    name:
      (best.profiles as unknown as { username: string } | null)?.username ??
      "???",
    score: best.score,
    date: new Date(best.created_at).toLocaleDateString("es-ES"),
  };
}

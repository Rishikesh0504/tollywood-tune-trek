import { supabase } from "./supabase";

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  attemptLength: number;
  era: string;
  songTitle: string;
  date: string;
  updated_at?: string;
}

export interface GameStats {
  played: number;
  wins: number;
  totalScore: number;
  streak: number;
  bestStreak: number;
  lastPlayedDay: string | null;
  distribution: number[];
}

const STATS_KEY = "gtt-stats-v2";
export const PLAYER_NAME_KEY = "gtt-player-name";

export const emptyStats: GameStats = {
  played: 0,
  wins: 0,
  totalScore: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  distribution: [0, 0, 0, 0, 0],
};

export function loadStats(): GameStats {
  if (typeof window === "undefined") return emptyStats;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats;
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      ...emptyStats,
      ...parsed,
      distribution: parsed.distribution ?? [...emptyStats.distribution],
    };
  } catch {
    return emptyStats;
  }
}

export function saveStats(stats: GameStats) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordResult(
  prev: GameStats,
  outcome: {
    won: boolean;
    attemptIndex: number;
    pointsEarned: number;
    day: string;
  },
): GameStats {
  const distribution = [...prev.distribution];
  if (outcome.won && outcome.attemptIndex < distribution.length) {
    distribution[outcome.attemptIndex] =
      (distribution[outcome.attemptIndex] ?? 0) + 1;
  }

  let streak = 0;
  if (outcome.won) {
    streak = prev.streak + 1;
  }

  return {
    played: prev.played + 1,
    wins: prev.wins + (outcome.won ? 1 : 0),
    totalScore: prev.totalScore + outcome.pointsEarned,
    streak,
    bestStreak: Math.max(prev.bestStreak, streak),
    lastPlayedDay: outcome.day,
    distribution,
  };
}

export async function fetchGlobalLeaderboard(
  timeframe: "weekly" | "monthly" | "all",
): Promise<LeaderboardEntry[]> {
  try {
    let query = supabase
      .from("leaderboard")
      .select("id, name, points, attempt_length, era, song_title, updated_at")
      .order("points", { ascending: false })
      .limit(50);

    const now = new Date();
    if (timeframe === "weekly") {
      const oneWeekAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      query = query.gte("updated_at", oneWeekAgo);
    } else if (timeframe === "monthly") {
      const oneMonthAgo = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      query = query.gte("updated_at", oneMonthAgo);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Supabase fetch error:", error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      points: row.points,
      attemptLength: Number(row.attempt_length),
      era: row.era,
      songTitle: row.song_title,
      date: new Date(row.updated_at).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
    return [];
  }
}

export async function syncScoreToSupabase(entry: {
  name: string;
  points: number;
  attemptLength: number;
  era: string;
  songTitle: string;
}) {
  if (!entry.name.trim()) return;

  console.log("🚀 Syncing score to Supabase for:", entry.name, entry.points);

  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .upsert(
        {
          name: entry.name.trim(),
          points: entry.points,
          attempt_length: entry.attemptLength,
          era: entry.era,
          song_title: entry.songTitle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "name" },
      )
      .select();

    if (error) {
      console.error("❌ Supabase Insert Error:", error.message, error.details);
    } else {
      console.log("✅ Supabase Sync Succeeded!", data);
    }
  } catch (err) {
    console.error("Failed to sync score:", err);
  }
}

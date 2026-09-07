export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  attemptLength: number;
  era: string;
  songTitle: string;
  date: string;
  timestamp: number; // Unix timestamp for Weekly/Monthly filtering
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
const LEADERBOARD_KEY = "gtt-leaderboard-v4";
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

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Automatically inserts new players or updates existing players with their latest score
export function addOrUpdateLeaderboardEntry(
  entry: Omit<LeaderboardEntry, "id" | "timestamp" | "date"> & {
    date?: string;
  },
): LeaderboardEntry[] {
  const current = loadLeaderboard();
  const now = Date.now();
  const normalizedName = entry.name.trim();

  const existingIndex = current.findIndex(
    (e) => e.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );

  let updated: LeaderboardEntry[];

  if (existingIndex !== -1) {
    // Update existing user entry
    const existing = current[existingIndex];
    const updatedEntry: LeaderboardEntry = {
      ...existing,
      name: normalizedName,
      points: Math.max(existing.points, entry.points),
      attemptLength: entry.attemptLength,
      era: entry.era,
      songTitle: entry.songTitle,
      date: entry.date ?? "Just now",
      timestamp: now,
    };
    updated = [...current];
    updated[existingIndex] = updatedEntry;
  } else {
    // Add new user entry
    const newEntry: LeaderboardEntry = {
      ...entry,
      name: normalizedName,
      id: now.toString(),
      date: entry.date ?? "Just now",
      timestamp: now,
    };
    updated = [newEntry, ...current];
  }

  updated.sort((a, b) => b.points - a.points);
  const sliced = updated.slice(0, 50);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sliced));
  }
  return sliced;
}

export function winPercentage(stats: GameStats) {
  return stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
}

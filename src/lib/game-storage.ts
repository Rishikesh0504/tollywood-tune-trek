export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  attemptLength: number; // e.g., 0.1, 0.5, 2...
  era: string;
  songTitle: string;
  date: string;
}

export interface GameStats {
  played: number;
  wins: number;
  totalScore: number;
  streak: number;
  bestStreak: number;
  lastPlayedDay: string | null;
  distribution: number[]; // 5 indices for 0.1s, 0.5s, 2s, 8s, 15s
}

const STATS_KEY = "gtt-stats-v2";
const LEADERBOARD_KEY = "gtt-leaderboard-v2";

export const emptyStats: GameStats = {
  played: 0,
  wins: 0,
  totalScore: 0,
  streak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  distribution: [0, 0, 0, 0, 0],
};

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: "1", name: "ChiranjeeviFan99", points: 100, attemptLength: 0.1, era: "Vintage Golden Era", songTitle: "Abbanee Teeyani Dhebba", date: "Today" },
  { id: "2", name: "MaheshBabuCult", points: 100, attemptLength: 0.1, era: "Latest Bangers", songTitle: "Kurchi Madathapetti", date: "Today" },
  { id: "3", name: "TarakArmy", points: 50, attemptLength: 0.5, era: "All Eras (Shuffle)", songTitle: "Fear Song", date: "Yesterday" },
  { id: "4", name: "PrabhasDevotee", points: 25, attemptLength: 2, era: "Modern Hits", songTitle: "Cinema Choopistha Mava", date: "Yesterday" },
  { id: "5", name: "DSP_Maniac", points: 10, attemptLength: 8, era: "90s & 2000s Nostalgia", songTitle: "Ringa Ringa", date: "2 days ago" },
];

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
  outcome: { won: boolean; attemptIndex: number; pointsEarned: number; day: string },
): GameStats {
  const distribution = [...prev.distribution];
  if (outcome.won && outcome.attemptIndex < distribution.length) {
    distribution[outcome.attemptIndex] = (distribution[outcome.attemptIndex] ?? 0) + 1;
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
  if (typeof window === "undefined") return DEFAULT_LEADERBOARD;
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return DEFAULT_LEADERBOARD;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LEADERBOARD;
  }
}

export function addLeaderboardEntry(entry: Omit<LeaderboardEntry, "id">): LeaderboardEntry[] {
  const current = loadLeaderboard();
  const newEntry: LeaderboardEntry = { ...entry, id: Date.now().toString() };
  const updated = [newEntry, ...current].sort((a, b) => b.points - a.points).slice(0, 25);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function winPercentage(stats: GameStats) {
  return stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
}
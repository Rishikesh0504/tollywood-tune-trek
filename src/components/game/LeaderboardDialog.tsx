import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy,
  Award,
  Calendar,
  CheckCircle2,
  UserCheck,
  Edit3,
} from "lucide-react";
import {
  loadLeaderboard,
  addOrUpdateLeaderboardEntry,
  PLAYER_NAME_KEY,
  type LeaderboardEntry,
  type GameStats,
} from "@/lib/game-storage";

type Timeframe = "weekly" | "monthly" | "all";

interface Props {
  stats: GameStats;
  lastPointsEarned?: number;
  lastSongTitle?: string;
  lastAttemptDuration?: number;
  lastEra?: string;
}

export function LeaderboardDialog({
  stats,
  lastPointsEarned,
  lastSongTitle,
  lastAttemptDuration,
  lastEra,
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("weekly");
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PLAYER_NAME_KEY) || "";
    }
    return "";
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedName, setSavedName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(PLAYER_NAME_KEY) || "";
    }
    return "";
  });

  const pointsToPost =
    lastPointsEarned && lastPointsEarned > 0
      ? lastPointsEarned
      : stats.totalScore;
  const songLabel = lastSongTitle ?? `${stats.wins} Solved`;
  const eraLabel = lastEra ?? "All Eras";
  const durationLabel = lastAttemptDuration ?? 0.1;

  // Initial load and live auto-sync if name is already set
  useEffect(() => {
    if (savedName && pointsToPost > 0) {
      const updated = addOrUpdateLeaderboardEntry({
        name: savedName,
        points: pointsToPost,
        attemptLength: durationLabel,
        era: eraLabel,
        songTitle: songLabel,
      });
      setEntries(updated);
    } else {
      setEntries(loadLeaderboard());
    }
  }, [savedName, pointsToPost, songLabel, eraLabel, durationLabel]);

  // Filter entries based on the selected timeframe
  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

    return entries.filter((entry) => {
      const entryTime = entry.timestamp || now; // fallback for older entries
      if (timeframe === "weekly") return now - entryTime <= oneWeekMs;
      if (timeframe === "monthly") return now - entryTime <= oneMonthMs;
      return true;
    });
  }, [entries, timeframe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pointsToPost <= 0) return;

    const trimmed = name.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    }
    setSavedName(trimmed);
    setIsEditingName(false);

    const updated = addOrUpdateLeaderboardEntry({
      name: trimmed,
      points: pointsToPost,
      attemptLength: durationLabel,
      era: eraLabel,
      songTitle: songLabel,
      date: "Just now",
    });
    setEntries(updated);
  };

  return (
    <Dialog>
      <DialogTrigger
        aria-label="View Leaderboard"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-gold"
      >
        <Trophy className="size-4 text-gold" />
        <span className="hidden sm:inline">Leaderboard</span>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-extrabold">
            <Trophy className="size-6 text-gold" /> Tollywood Hall of Fame
          </DialogTitle>
        </DialogHeader>

        {/* Player Stats Summary */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-raised p-4 text-center">
          <div>
            <p className="text-3xl font-black text-gold">{stats.totalScore}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Your Total Points
            </p>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{stats.wins}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Songs Solved
            </p>
          </div>
        </div>

        {/* Username Registration or Auto-Sync Status */}
        {!savedName || isEditingName ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-3"
          >
            <p className="text-xs font-semibold text-gold">
              Set your nickname for live score updates:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter cinephile nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-gold text-foreground"
                maxLength={20}
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-hot px-4 text-xs font-bold text-primary-foreground shadow-glow transition hover:opacity-90"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              <UserCheck className="size-4 text-emerald-400" />
              <span className="text-muted-foreground">Playing as:</span>
              <span className="font-bold text-foreground">{savedName}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
                Live Syncing
              </span>
            </div>
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-gold transition"
            >
              <Edit3 className="size-3" /> Edit
            </button>
          </div>
        )}

        {/* Timeframe Filter Tabs */}
        <div className="flex rounded-lg border border-border bg-surface-raised p-1 text-xs font-semibold">
          {(["weekly", "monthly", "all"] as Timeframe[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              className={`flex-1 py-1.5 rounded-md capitalize transition-all ${
                timeframe === tab
                  ? "bg-gold text-black shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" ? "All Time" : `${tab}`}
            </button>
          ))}
        </div>

        {/* High Score Table */}
        <div className="space-y-2">
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
            {filteredEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No scores recorded for this period yet.
              </div>
            ) : (
              filteredEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 text-center font-extrabold shrink-0 ${
                        idx === 0
                          ? "text-gold"
                          : idx === 1
                            ? "text-muted-foreground"
                            : "text-foreground/60"
                      }`}
                    >
                      {idx === 0 ? (
                        <Award className="inline size-4 text-gold" />
                      ) : (
                        `#${idx + 1}`
                      )}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">
                        {entry.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {entry.songTitle} ({entry.attemptLength}s) • {entry.era}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <span className="rounded-md bg-gold/10 px-2 py-1 font-mono text-xs font-black text-gold">
                      {entry.points} pts
                    </span>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {entry.date}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Award } from "lucide-react";
import { loadLeaderboard, addLeaderboardEntry, type LeaderboardEntry, type GameStats } from "@/lib/game-storage";

interface Props {
  stats: GameStats;
  lastPointsEarned?: number;
  lastSongTitle?: string;
  lastAttemptDuration?: number;
  lastEra?: string;
}

export function LeaderboardDialog({ stats, lastPointsEarned, lastSongTitle, lastAttemptDuration, lastEra }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(loadLeaderboard());
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lastPointsEarned || !lastSongTitle) return;
    const updated = addLeaderboardEntry({
      name: name.trim(),
      points: lastPointsEarned,
      attemptLength: lastAttemptDuration ?? 0.1,
      era: lastEra ?? "All Eras",
      songTitle: lastSongTitle,
      date: "Just now",
    });
    setEntries(updated);
    setSubmitted(true);
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
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Total Points</p>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{stats.wins}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Songs Solved</p>
          </div>
        </div>

        {/* Submit Last Round Score */}
        {lastPointsEarned !== undefined && lastPointsEarned > 0 && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-3">
            <p className="text-xs font-semibold text-gold">Submit your {lastPointsEarned} pts to the leaderboard:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter your cinephile nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-gold"
                maxLength={20}
              />
              <button
                type="submit"
                className="rounded-lg bg-hot px-4 text-xs font-bold text-primary-foreground shadow-glow"
              >
                Post Score
              </button>
            </div>
          </form>
        )}

        {/* High Score Table */}
        <div className="mt-2 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Rankers</p>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
            {entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-5 text-center font-extrabold ${idx === 0 ? "text-gold" : idx === 1 ? "text-muted-foreground" : "text-foreground/60"}`}>
                    {idx === 0 ? <Award className="inline size-4 text-gold" /> : `#${idx + 1}`}
                  </span>
                  <div>
                    <p className="font-bold text-foreground">{entry.name}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.songTitle} ({entry.attemptLength}s) • {entry.era}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-md bg-gold/10 px-2 py-1 font-mono text-xs font-black text-gold">
                    +{entry.points} pts
                  </span>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{entry.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
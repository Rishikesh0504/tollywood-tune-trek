import { memo } from "react";
import { REVEAL_STEPS, POINTS_BY_STEP } from "@/data/songs";
import { Lock } from "lucide-react";

const TOTAL: number = REVEAL_STEPS[REVEAL_STEPS.length - 1] ?? 15;
const BAR_COUNT = 56;

const HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const wave =
    Math.sin(i * 0.55) * 0.32 +
    Math.sin(i * 1.7) * 0.18 +
    Math.cos(i * 0.23) * 0.2;
  return 26 + Math.abs(wave) * 74;
});

interface Props {
  unlocked: number;
  progress: number;
  playing: boolean;
}

export const SnippetWave = memo(function SnippetWave({
  unlocked,
  progress,
  playing,
}: Props) {
  const unlockedRatio = unlocked / TOTAL;
  const playedRatio = Math.min(progress / TOTAL, unlockedRatio);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between text-xs font-medium text-muted-foreground">
        <span>
          Unlocked: <span className="font-bold text-gold">{unlocked}s</span>
        </span>
        <span className="flex items-center gap-1 font-medium">
          <Lock className="size-3" /> Max {TOTAL}s snippet
        </span>
      </div>

      <div className="relative flex h-24 items-center gap-[3px] overflow-hidden rounded-xl border border-border bg-surface-raised/60 px-3">
        {HEIGHTS.map((h, i) => {
          const pos = (i + 0.5) / BAR_COUNT;
          const isUnlocked = pos <= unlockedRatio;
          const isPlayed = pos <= playedRatio;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors duration-75 ${
                playing && isUnlocked ? "animate-pulse" : ""
              }`}
              style={{
                height: `${h}%`,
                background: isPlayed
                  ? "var(--gradient-hot)"
                  : isUnlocked
                    ? "color-mix(in oklab, var(--gold) 48%, transparent)"
                    : "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
              }}
            />
          );
        })}

        {/* 0ms Latency Playhead Line */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-gold shadow-[0_0_8px_rgba(255,190,0,0.8)]"
          style={{
            left: `${playedRatio * 100}%`,
            opacity: playing ? 1 : 0,
            transition: "opacity 120ms ease",
          }}
        />
      </div>

      {/* 5 Scoring Steps */}
      <div className="grid grid-cols-5 gap-1.5">
        {REVEAL_STEPS.map((step) => {
          const isOpen = step <= unlocked;
          const points = POINTS_BY_STEP[step];
          return (
            <div
              key={step}
              className={`rounded-lg py-1.5 text-center transition-colors ${
                isOpen
                  ? "bg-hot text-primary-foreground shadow-glow"
                  : "border border-border bg-surface-raised text-muted-foreground"
              }`}
            >
              <p className="text-xs font-bold">{step}s</p>
              <p
                className={`text-[10px] font-semibold ${
                  isOpen ? "text-primary-foreground/90" : "text-gold"
                }`}
              >
                {points} pts
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

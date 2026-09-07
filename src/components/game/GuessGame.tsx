import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Flame,
  Music2,
  Music4,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Star,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  MAX_ATTEMPTS,
  POINTS_BY_STEP,
  REVEAL_STEPS,
  type CategoryId,
  type Song,
  songsForCategory,
  todayKey,
} from "@/data/songs";
import { fetchTeluguTrack, type SongTrackResult } from "@/lib/audio";
import { HowToPlayDialog } from "@/components/game/HowToPlayDialog";
import { SnippetWave } from "@/components/game/SnippetWave";
import { ThemeToggle } from "@/components/game/ThemeToggle";
import { LeaderboardDialog } from "@/components/game/LeaderboardDialog";
import {
  emptyStats,
  loadStats,
  recordResult,
  saveStats,
  syncScoreToSupabase,
  PLAYER_NAME_KEY,
  type GameStats,
} from "@/lib/game-storage";

type Attempt =
  | { kind: "skip" }
  | { kind: "wrong"; label: string }
  | { kind: "correct"; label: string };
type Status = "playing" | "won" | "lost";

const FULL = REVEAL_STEPS[REVEAL_STEPS.length - 1] ?? 15;

function unlockedFor(attemptCount: number) {
  return REVEAL_STEPS[Math.min(attemptCount, MAX_ATTEMPTS - 1)] ?? FULL;
}

export function GuessGame() {
  const [category, setCategory] = useState<CategoryId>("twenty-twenties");
  const [songIndex, setSongIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState<GameStats>(emptyStats);
  const [shake, setShake] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);

  // Live stream & artwork metadata
  const [liveAudioUrl, setLiveAudioUrl] = useState<string>("");
  const [trackMeta, setTrackMeta] = useState<SongTrackResult | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Synchronous refs to prevent React state closure lag inside RAF
  const statusRef = useRef<Status>("playing");
  const unlockedRef = useRef<number>(FULL);

  // Filter pool by chosen category
  const pool = useMemo(() => songsForCategory(category), [category]);

  const unlocked = status === "playing" ? unlockedFor(attempts.length) : FULL;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    setProgress(0);
  }, []);

  // Guaranteed random track picker
  const shuffleTrack = useCallback(() => {
    stopAudio();
    setAttempts([]);
    statusRef.current = "playing";
    setStatus("playing");
    setQuery("");
    setPointsEarned(0);
    setLiveAudioUrl("");
    setTrackMeta(null);

    setSongIndex((prev) => {
      if (pool.length <= 1) return 0;
      let next = Math.floor(Math.random() * pool.length);
      while (next === prev) {
        next = Math.floor(Math.random() * pool.length);
      }
      return next;
    });
  }, [pool.length, stopAudio]);

  // Randomize track on category change
  useEffect(() => {
    if (!pool.length) return;
    setSongIndex(Math.floor(Math.random() * pool.length));
    stopAudio();
    setAttempts([]);
    statusRef.current = "playing";
    setStatus("playing");
    setQuery("");
    setPointsEarned(0);
    setLiveAudioUrl("");
    setTrackMeta(null);
  }, [category, pool.length, stopAudio]);

  // Current active song
  const song: Song | undefined = useMemo(() => {
    if (!pool.length) return undefined;
    return pool[songIndex % pool.length];
  }, [pool, songIndex]);

  // Live volume synchronization
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Fetch verified preview & artwork directly from iTunes CDN
  useEffect(() => {
    if (!song) return;

    let active = true;
    setLiveAudioUrl("");
    setTrackMeta(null);
    setLoadingAudio(true);

    fetchTeluguTrack(song.title, song.movie).then((result) => {
      if (!active) return;
      setLoadingAudio(false);

      if (result?.audioUrl) {
        console.log(`🎵 [iTunes CDN] ${result.title} (${result.album})`);
        setLiveAudioUrl(result.audioUrl);
        setTrackMeta(result);
      } else {
        console.warn(`⚠️ Could not find audio for: ${song.title}`);
      }
    });

    return () => {
      active = false;
    };
  }, [song?.id, song?.title, song?.movie]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);

    // Stop at snippet mark only during active guessing
    if (
      statusRef.current === "playing" &&
      audio.currentTime >= unlockedRef.current - 0.02
    ) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setProgress(0);
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !liveAudioUrl) return;
    if (playing) {
      stopAudio();
      return;
    }
    audio.currentTime = 0;
    audio.volume = muted ? 0 : volume;
    void audio
      .play()
      .then(() => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setPlaying(false));
  }, [playing, stopAudio, tick, muted, volume, liveAudioUrl]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.movie.toLowerCase().includes(q) ||
          s.singers.toLowerCase().includes(q) ||
          s.composer.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [pool, query]);

  const finish = useCallback(
    (won: boolean, attemptIndex: number) => {
      statusRef.current = won ? "won" : "lost";
      setStatus(won ? "won" : "lost");

      const earned = won
        ? (POINTS_BY_STEP[REVEAL_STEPS[attemptIndex] ?? 15] ?? 5)
        : 0;
      setPointsEarned(earned);

      setStats((prev) => {
        const next = recordResult(prev, {
          won,
          attemptIndex,
          pointsEarned: earned,
          day: todayKey(),
        });
        saveStats(next);

        // Live background update using cumulative total points
        if (won && typeof window !== "undefined") {
          const savedName = localStorage.getItem(PLAYER_NAME_KEY);
          if (savedName && song) {
            void syncScoreToSupabase({
              name: savedName,
              points: next.totalScore,
              attemptLength: REVEAL_STEPS[attemptIndex] ?? 0.1,
              era:
                CATEGORIES.find((c) => c.id === category)?.label ?? "All Eras",
              songTitle: song.title,
            });
          }
        }

        return next;
      });

      // Autoplay full song on completion (both Won and Lost/Skipped)
      const audio = audioRef.current;
      if (audio) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        audio.currentTime = 0;
        audio.volume = muted ? 0 : volume;
        void audio
          .play()
          .then(() => {
            setPlaying(true);
            rafRef.current = requestAnimationFrame(tick);
          })
          .catch((err) => {
            console.warn("Autoplay blocked by browser:", err);
            setPlaying(false);
          });
      }
    },
    [muted, volume, tick, song, category],
  );

  const submitGuess = useCallback(
    (guessed: Song | undefined) => {
      if (!song || status !== "playing") return;
      const label = guessed
        ? `${guessed.title} - ${guessed.movie}`
        : query.trim();
      if (!label) return;

      if (guessed && guessed.id === song.id) {
        setAttempts((prev) => [...prev, { kind: "correct", label }]);
        finish(true, attempts.length);
        setQuery("");
        return;
      }

      const next: Attempt[] = [...attempts, { kind: "wrong", label }];
      setAttempts(next);
      setQuery("");
      setShake((s) => s + 1);
      stopAudio();
      if (next.length >= MAX_ATTEMPTS) finish(false, MAX_ATTEMPTS);
    },
    [song, status, query, attempts, finish, stopAudio],
  );

  const skip = useCallback(() => {
    if (status !== "playing") return;
    const next: Attempt[] = [...attempts, { kind: "skip" }];
    setAttempts(next);
    stopAudio();
    if (next.length >= MAX_ATTEMPTS) finish(false, MAX_ATTEMPTS);
  }, [attempts, status, stopAudio, finish]);

  if (!song) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:pt-8">
      {/* CDN Audio Stream */}
      {liveAudioUrl && (
        <audio
          key={liveAudioUrl}
          ref={audioRef}
          src={liveAudioUrl}
          preload="auto"
          onEnded={stopAudio}
        />
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-hot text-primary-foreground shadow-glow">
            <Music4 className="size-6" />
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold sm:text-xl">
              Guess That <span className="text-hot">Tollywood</span>
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Telugu song trivia
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Total Points Badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm font-bold">
            <Star className="size-4 text-gold" />
            <span className="text-gold">{stats.totalScore}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              pts
            </span>
          </div>

          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm font-bold">
            <Flame className="size-4 text-crimson" />
            {stats.streak}
          </div>

          {/* Leaderboard Modal */}
          <LeaderboardDialog
            stats={stats}
            lastPointsEarned={pointsEarned}
            lastSongTitle={song.title}
            lastAttemptDuration={
              REVEAL_STEPS[Math.max(0, attempts.length - 1)] ?? 0.1
            }
            lastEra={CATEGORIES.find((c) => c.id === category)?.label}
          />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* How To Play */}
          <HowToPlayDialog />
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="-mx-4 mt-6 overflow-x-auto px-4 pb-1">
        <div className="flex min-w-max gap-2">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (category === c.id) {
                    shuffleTrack();
                  } else {
                    setCategory(c.id);
                  }
                }}
                className={`relative rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "text-primary-foreground"
                    : "bg-surface-raised text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="category-pill"
                    className="absolute inset-0 rounded-full bg-hot shadow-glow"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{c.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <p className="mt-2 text-xs text-muted-foreground">
        {CATEGORIES.find((c) => c.id === category)?.subtitle}
      </p>

      {/* Main Layout: Game on Left (2 cols), Result on Right (1 col) */}
      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Left Column: Game Player & Inputs */}
        <div className="relative z-20 lg:col-span-2">
          <motion.section
            key={shake}
            animate={shake ? { x: [0, -9, 8, -5, 0] } : { x: 0 }}
            transition={{ duration: 0.34 }}
            className="panel space-y-6 p-4 shadow-card sm:p-6"
          >
            <SnippetWave
              unlocked={unlocked}
              progress={progress}
              playing={playing}
            />

            <div className="flex flex-col items-center gap-3">
              {/* Play Button */}
              <motion.button
                onClick={togglePlay}
                disabled={!liveAudioUrl || loadingAudio}
                whileTap={{ scale: 0.93 }}
                className={`grid size-20 place-items-center rounded-full bg-hot text-primary-foreground shadow-glow sm:size-24 disabled:cursor-not-allowed disabled:opacity-40 ${
                  playing ? "" : "pulse-ring"
                }`}
                aria-label={playing ? "Pause snippet" : "Play snippet"}
              >
                {loadingAudio ? (
                  <span className="animate-pulse text-[10px] font-black uppercase tracking-wider">
                    Loading
                  </span>
                ) : playing ? (
                  <Pause className="size-9" />
                ) : (
                  <Play className="ml-1 size-9" />
                )}
              </motion.button>

              <p className="text-xs text-muted-foreground">
                {status === "playing"
                  ? `Attempt ${Math.min(attempts.length + 1, MAX_ATTEMPTS)} of ${MAX_ATTEMPTS} • ${POINTS_BY_STEP[unlocked]} points available`
                  : "Round Over"}
              </p>

              {/* Volume Controls */}
              <div className="mt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="size-4 text-crimson" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setMuted(false);
                  }}
                  className="h-1.5 w-28 cursor-pointer appearance-none rounded-lg bg-surface-raised accent-hot sm:w-36"
                  aria-label="Volume slider"
                />

                <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                  {muted ? "0%" : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Predictive Autocomplete Search */}
            {status === "playing" && (
              <div className="space-y-3">
                <div className="relative z-30">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlight(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlight((h) =>
                          Math.min(h + 1, suggestions.length - 1),
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlight((h) => Math.max(h - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        submitGuess(suggestions[highlight]);
                      }
                    }}
                    placeholder="Search song, movie, singer, or composer..."
                    className="h-14 w-full rounded-xl border border-input bg-surface-raised pl-11 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-gold"
                  />
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl"
                      >
                        {suggestions.map((s, i) => (
                          <li key={s.id}>
                            <button
                              onMouseEnter={() => setHighlight(i)}
                              onClick={() => submitGuess(s)}
                              className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                                i === highlight
                                  ? "bg-surface-raised text-gold"
                                  : "text-foreground"
                              }`}
                            >
                              <div className="flex w-full items-baseline justify-between gap-2">
                                <span className="font-semibold">{s.title}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {s.movie} ({s.year})
                                </span>
                              </div>
                              <span className="truncate text-xs text-muted-foreground/80">
                                🎤 {s.singers}
                              </span>
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={skip}
                    className="h-13 flex-1 rounded-xl border border-border bg-surface-raised py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <SkipForward className="mr-1.5 inline size-4" />
                    Skip snippet
                  </button>

                  <button
                    type="button"
                    onClick={() => submitGuess(suggestions[highlight])}
                    disabled={suggestions.length === 0}
                    className="h-13 flex-1 rounded-xl bg-hot py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-opacity disabled:opacity-40"
                  >
                    Submit Guess
                  </button>
                </div>
              </div>
            )}

            {/* Attempts History */}
            {attempts.length > 0 && (
              <ul className="space-y-2">
                {attempts.map((a, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                      a.kind === "correct"
                        ? "border-gold/50 bg-gold/10 text-gold"
                        : a.kind === "wrong"
                          ? "border-crimson/40 bg-crimson/10 text-foreground"
                          : "border-border bg-surface-raised text-muted-foreground"
                    }`}
                  >
                    {a.kind === "correct" ? (
                      <Check className="size-4" />
                    ) : a.kind === "wrong" ? (
                      <X className="size-4 text-crimson" />
                    ) : (
                      <SkipForward className="size-4" />
                    )}
                    <span className="truncate">
                      {a.kind === "skip" ? "Skipped" : a.label}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>

        {/* Right Column: Song Reveal Card (or Mystery placeholder during play) */}
        <div className="relative z-10 lg:col-span-1">
          <AnimatePresence mode="wait">
            {status !== "playing" ? (
              <motion.section
                key="result-revealed"
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="panel space-y-4 p-5 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      status === "won"
                        ? "bg-gold/20 text-gold"
                        : "bg-crimson/20 text-crimson"
                    }`}
                  >
                    {status === "won"
                      ? `+${pointsEarned} Points Earned!`
                      : "Round Over"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {song.year}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/50 bg-surface-raised">
                  <img
                    src={
                      trackMeta?.posterUrl || "https://picsum.photos/500/500"
                    }
                    alt={`${song.movie} poster`}
                    className="aspect-square w-full object-cover shadow-inner"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold leading-tight">
                    {song.title}
                  </h2>
                  <p className="mt-0.5 text-sm font-medium text-hot">
                    {song.movie}
                  </p>
                </div>

                <dl className="space-y-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <div>
                    <span className="text-foreground/70">Composer: </span>
                    <span className="font-semibold text-foreground">
                      {song.composer}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground/70">Singers: </span>
                    <span className="font-semibold text-foreground">
                      {song.singers}
                    </span>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={shuffleTrack}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-hot py-3 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-90"
                >
                  <RotateCcw className="size-4" /> Next Track
                </button>
              </motion.section>
            ) : (
              <motion.section
                key="mystery-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="panel flex flex-col items-center justify-center p-6 text-center shadow-card"
              >
                <div className="grid size-20 place-items-center rounded-2xl border border-border/40 bg-surface-raised text-muted-foreground/60">
                  <Music2 className="size-10" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground">
                  Mystery Track
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Guess the song correctly to unveil the official cover art,
                  singers, and full track!
                </p>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

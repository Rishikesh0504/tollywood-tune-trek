import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, User } from "lucide-react";
import { PLAYER_NAME_KEY } from "@/lib/game-storage";

interface Props {
  onNameSet?: (name: string) => void;
}

export function UsernamePromptDialog({ onNameSet }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = localStorage.getItem(PLAYER_NAME_KEY);
    if (!existing || !existing.trim()) {
      setIsOpen(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();

    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Name must be under 20 characters.");
      return;
    }

    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    onNameSet?.(trimmed);
    setIsOpen(false);
  };

  const handleSkip = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2 }}
            className="panel w-full max-w-md space-y-5 p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-hot/15 text-hot shadow-glow">
                <Trophy className="size-7 text-gold" />
              </div>
              <h2 className="mt-3 text-xl font-extrabold text-foreground">
                Join the Leaderboard
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your name to track your scores, maintain streaks, and
                compete on the Tollywood leaderboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter nickname (e.g. Megastar_Fan)"
                    maxLength={20}
                    className="h-12 w-full rounded-xl border border-input bg-surface-raised pl-10 pr-4 text-sm font-medium outline-none transition focus:border-gold"
                  />
                </div>
                {error && (
                  <p className="text-xs font-semibold text-crimson">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="h-11 flex-1 rounded-xl border border-border bg-surface-raised text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Play as Guest
                </button>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="h-11 flex-1 rounded-xl bg-hot text-xs font-bold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-40"
                >
                  Save & Play
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

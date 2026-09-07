import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { REVEAL_STEPS } from "@/data/songs";
import { HelpCircle } from "lucide-react";

export function HowToPlayDialog() {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="How to play"
        className="grid size-10 place-items-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:text-gold"
      >
        <HelpCircle className="size-5" />
      </DialogTrigger>
      <DialogContent className="border-border bg-surface">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to play</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Name the Telugu song from the shortest possible snippet.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">1.</span> Hit play — you start with just{" "}
            <span className="text-gold">0.5 seconds</span> of the intro.
          </li>
          <li>
            <span className="font-semibold text-foreground">2.</span> Search by song title or movie name and submit your
            guess.
          </li>
          <li>
            <span className="font-semibold text-foreground">3.</span> A wrong guess or a skip unlocks more audio:{" "}
            {REVEAL_STEPS.map((s) => `${s}s`).join(" → ")}.
          </li>
          <li>
            <span className="font-semibold text-foreground">4.</span> Six attempts per round. Win to grow your daily
            streak and share your emoji grid.
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}

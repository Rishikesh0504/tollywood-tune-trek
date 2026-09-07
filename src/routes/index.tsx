import { createFileRoute } from "@tanstack/react-router";
import { GuessGame } from "@/components/game/GuessGame";

const TITLE = "Guess That Tollywood — Telugu Song Trivia Game";
const DESCRIPTION =
  "Name the Telugu movie song from a 0.5-second snippet. Six attempts, four eras of Tollywood music, daily streaks and shareable emoji scores.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen">
      <GuessGame />
    </main>
  );
}

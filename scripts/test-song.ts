import { exec } from "node:child_process";
import * as readline from "node:readline";

interface iTunesItem {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  previewUrl?: string;
}

interface iTunesResponse {
  resultCount: number;
  results: iTunesItem[];
}

function sanitizeText(str: string): string {
  return (str || "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitleWords(str: string): string[] {
  return sanitizeText(str)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function isWrongLanguageDub(item: iTunesItem): boolean {
  const metadata =
    `${item.trackName ?? ""} ${item.collectionName ?? ""}`.toLowerCase();
  const badLanguageTags = [
    "hindi",
    "tamil",
    "kannada",
    "malayalam",
    "bhojpuri",
    "punjabi",
  ];
  return badLanguageTags.some((lang) => metadata.includes(lang));
}

function isThemeTrap(trackName: string, targetTitle: string): boolean {
  const lowerTrack = (trackName || "").toLowerCase();
  const lowerTarget = (targetTitle || "").toLowerCase();
  const themeKeywords = [
    "soul of",
    "theme",
    "bgm",
    "instrumental",
    "teaser",
    "trailer",
  ];

  for (const keyword of themeKeywords) {
    if (lowerTrack.includes(keyword) && !lowerTarget.includes(keyword)) {
      return true;
    }
  }
  return false;
}

async function queryiTunes(searchTerm: string): Promise<iTunesItem[]> {
  try {
    const params = new URLSearchParams({
      term: searchTerm,
      country: "IN",
      media: "music",
      entity: "song",
      limit: "8",
    });

    const res = await fetch(
      `https://itunes.apple.com/search?${params.toString()}`,
    );
    if (!res.ok) return [];

    const data: iTunesResponse = await res.json();
    return (data.results || []).filter((track) => Boolean(track.previewUrl));
  } catch {
    return [];
  }
}

function openInPlayer(url: string) {
  const startCmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err)
      console.error("Could not automatically launch player:", err.message);
  });
}

async function verifyAndPlay(titleInput: string, movieInput: string = "") {
  const cleanT = sanitizeText(titleInput);
  const cleanM = sanitizeText(movieInput);

  console.log(
    `\n🔎 Searching iTunes for: "${cleanT}" ${cleanM ? `(${cleanM})` : ""}...`,
  );

  const queries = cleanM
    ? [`${cleanT} ${cleanM} Telugu`, `${cleanT} ${cleanM}`, `${cleanT}`]
    : [`${cleanT} Telugu`, `${cleanT}`];

  let candidates: iTunesItem[] = [];

  for (const q of queries) {
    const results = await queryiTunes(q);
    if (results.length > 0) {
      candidates = results;
      break;
    }
  }

  if (candidates.length === 0) {
    console.log("❌ No iTunes audio tracks found for this title.");
    return;
  }

  const targetWords = getTitleWords(titleInput);

  const scoredCandidates = candidates.map((item) => {
    let score = 0;
    const trackLower = (item.trackName || "").toLowerCase();

    for (const word of targetWords) {
      if (trackLower.includes(word)) score += 10;
    }

    if (isThemeTrap(item.trackName || "", titleInput)) score -= 25;
    if (isWrongLanguageDub(item)) score -= 20;

    return { item, score };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  console.log(`\nFound ${candidates.length} candidate(s):`);
  scoredCandidates.forEach(({ item, score }, index) => {
    console.log(
      `  [${index + 1}] Score: ${score.toString().padStart(3)} | "${item.trackName}" — ${item.artistName} (${item.collectionName})`,
    );
  });

  const best = scoredCandidates[0]?.item;
  if (!best?.previewUrl) {
    console.log("❌ No playable preview URL found.");
    return;
  }

  console.log(`\n🎵 Now Playing Top Match:`);
  console.log(`   Title:   ${best.trackName}`);
  console.log(`   Movie:   ${best.collectionName}`);
  console.log(`   Singer:  ${best.artistName}`);
  console.log(`   Preview: ${best.previewUrl}\n`);

  openInPlayer(best.previewUrl);
}

// Support CLI arguments: npx tsx scripts/test-song.ts "Title" "Movie"
const args = process.argv.slice(2);

if (args.length > 0) {
  const [cliTitle, cliMovie] = args;
  verifyAndPlay(cliTitle, cliMovie || "");
} else {
  // Interactive Prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter Song Title: ", (title) => {
    rl.question(
      "Enter Movie Name (optional, press Enter to skip): ",
      (movie) => {
        rl.close();
        verifyAndPlay(title, movie);
      },
    );
  });
}

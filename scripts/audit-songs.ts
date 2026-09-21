import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Song {
  id: string;
  title: string;
  movie: string;
  year: number;
  composer: string;
  singers: string;
  category: string;
}

interface iTunesItem {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  previewUrl?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeText(str: string): string {
  return (str || "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAlpha(str: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getMeaningfulWords(str: string): string[] {
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

function scoreCandidate(
  item: iTunesItem,
  rawTitle: string,
  rawMovie: string,
): number {
  if (!item.previewUrl || !item.trackName) return -1;
  if (isWrongLanguageDub(item)) return -1;

  const trackLower = item.trackName.toLowerCase();
  const collectionLower = (item.collectionName || "").toLowerCase();
  const titleWords = getMeaningfulWords(rawTitle);
  const movieWords = getMeaningfulWords(rawMovie);

  const normCandidate = normalizeAlpha(item.trackName);
  const normTarget = normalizeAlpha(rawTitle);

  let score = 0;

  if (normCandidate === normTarget) {
    score += 30;
  } else if (
    normCandidate.includes(normTarget) ||
    normTarget.includes(normCandidate)
  ) {
    score += 20;
  }

  let matchedTitleWords = 0;
  for (const word of titleWords) {
    if (trackLower.includes(word)) matchedTitleWords++;
  }

  // Reject if not a single word matches
  if (titleWords.length > 0 && matchedTitleWords === 0) return -1;

  score += matchedTitleWords * 6;

  for (const word of movieWords) {
    if (collectionLower.includes(word) || trackLower.includes(word)) score += 4;
  }

  const noiseKeywords = [
    "theme",
    "bgm",
    "instrumental",
    "score",
    "teaser",
    "trailer",
    "soul of",
  ];
  const targetLower = rawTitle.toLowerCase();
  for (const noise of noiseKeywords) {
    if (trackLower.includes(noise) && !targetLower.includes(noise)) score -= 15;
  }

  return score;
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

    const data = await res.json();
    return (data.results || []).filter((track: any) =>
      Boolean(track.previewUrl),
    );
  } catch {
    return [];
  }
}

async function runAudit() {
  const songsPath = resolve("public/songs.json");
  const songs: Song[] = JSON.parse(readFileSync(songsPath, "utf-8"));

  console.log(`🔍 Starting iTunes audit for ${songs.length} songs...`);

  const failedSongs: Array<{
    id: string;
    title: string;
    movie: string;
    year: number;
    reason: string;
    bestCandidateFound?: string;
    score: number;
  }> = [];

  let passed = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const title = sanitizeText(song.title);
    const movie = sanitizeText(song.movie);

    const queries = [
      `${title} ${movie} Telugu`,
      `${title} ${movie}`,
      `${title} Telugu`,
    ];

    let highestScore = -1;
    let bestMatch: iTunesItem | null = null;

    for (const q of queries) {
      const results = await queryiTunes(q);
      for (const item of results) {
        const score = scoreCandidate(item, song.title, song.movie);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = item;
        }
      }
      if (highestScore >= 18) break;
    }

    if (highestScore >= 6 && bestMatch?.previewUrl) {
      passed++;
      process.stdout.write(
        `\r✅ [${i + 1}/${songs.length}] Checked: "${song.title}" (Score: ${highestScore})`,
      );
    } else {
      console.log(
        `\n❌ [FAIL] "${song.title}" from "${song.movie}" (Score: ${highestScore})`,
      );
      failedSongs.push({
        id: song.id,
        title: song.title,
        movie: song.movie,
        year: song.year,
        reason:
          highestScore < 0
            ? "No keywords matched / Unrelated album track"
            : "Low confidence match",
        bestCandidateFound: bestMatch?.trackName || "None",
        score: highestScore,
      });
    }

    // 250ms cooldown between requests to avoid iTunes 429 rate-limiting
    await sleep(250);
  }

  console.log(`\n\n Audit complete:`);
  console.log(`Passed: ${passed}/${songs.length}`);
  console.log(`Failed / Low-match: ${failedSongs.length}/${songs.length}`);

  const outputPath = resolve("failed-songs.json");
  writeFileSync(outputPath, JSON.stringify(failedSongs, null, 2), "utf-8");
  console.log(`📁 Saved failed songs list to: ${outputPath}`);
}

runAudit();

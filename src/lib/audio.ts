export interface SongTrackResult {
  audioUrl: string;
  posterUrl: string;
  title: string;
  album: string;
  artist: string;
}

interface iTunesItem {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
}

interface iTunesResponse {
  resultCount: number;
  results: iTunesItem[];
}

// Clean titles/movies to remove brackets and punctuation
function sanitizeText(str: string): string {
  return (str || "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract meaningful words (> 2 chars) for matching
function getTitleWords(str: string): string[] {
  return sanitizeText(str)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Filter out tracks explicitly tagged as other language dubs
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

// Detect instrumental themes, scores, or soundbites (e.g. "Soul of Baby")
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout prevents hanging

    const params = new URLSearchParams({
      term: searchTerm,
      country: "IN",
      media: "music",
      entity: "song",
      limit: "8",
    });

    const res = await fetch(
      `https://itunes.apple.com/search?${params.toString()}`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data: iTunesResponse = await res.json();
    return (data.results || []).filter((track) => Boolean(track.previewUrl));
  } catch {
    return [];
  }
}

export async function fetchTeluguTrack(
  rawTitle: string,
  rawMovie: string,
): Promise<SongTrackResult | null> {
  const title = sanitizeText(rawTitle);
  const movie = sanitizeText(rawMovie);

  const queries = [`${title} ${movie} Telugu`, `${title} ${movie}`, `${title}`];

  let candidates: iTunesItem[] = [];

  for (const q of queries) {
    const results = await queryiTunes(q);
    if (results.length > 0) {
      candidates = results;
      break;
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const targetWords = getTitleWords(rawTitle);

  // 1. Sort candidates by relevance:
  //    - Candidates whose trackName contains words from the actual title come FIRST.
  //    - Instrumental/Theme traps (e.g., "Soul of Baby") are pushed to the very bottom.
  //    - Wrong language dubs are pushed to the bottom.
  const scoredCandidates = candidates.map((item) => {
    let score = 0;
    const trackLower = (item.trackName || "").toLowerCase();

    // Reward title word matches
    for (const word of targetWords) {
      if (trackLower.includes(word)) score += 10;
    }

    // Heavy penalty for theme/OST traps like "Soul of Baby"
    if (isThemeTrap(item.trackName || "", rawTitle)) score -= 25;

    // Penalty for wrong language dubs
    if (isWrongLanguageDub(item)) score -= 20;

    return { item, score };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  // Pick highest scoring candidate, or safely fall back to the first available track
  const best = scoredCandidates[0]?.item ?? candidates[0];

  if (!best?.previewUrl) {
    return null;
  }

  const hiResPoster = best.artworkUrl100
    ? best.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
    : "";

  return {
    audioUrl: best.previewUrl,
    posterUrl: hiResPoster,
    title: best.trackName || rawTitle,
    album: best.collectionName || rawMovie,
    artist: best.artistName || "",
  };
}

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
  const metadata = `${item.trackName ?? ""} ${item.collectionName ?? ""}`.toLowerCase();
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

// Bypasses iOS Safari ITP blocks and mobile redirects
async function queryiTunes(searchTerm: string): Promise<iTunesItem[]> {
  const baseParams = new URLSearchParams({
    term: searchTerm,
    country: "IN",
    media: "music",
    entity: "song",
    limit: "8",
  });
  const targetUrl = `https://itunes.apple.com/search?${baseParams.toString()}`;

  // 1. Direct fetch (desktop / permissive networks)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data: iTunesResponse = await res.json();
      const valid = (data.results || []).filter((t) => Boolean(t.previewUrl));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Falls through to proxy on iPhone
  }

  // 2. High-speed CORS proxy (bypasses iOS WebKit CORS & mobile 302 redirects)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data: iTunesResponse = await res.json();
      const valid = (data.results || []).filter((t) => Boolean(t.previewUrl));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Falls through to secondary backup
  }

  // 3. Secondary proxy fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const backupUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(backupUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data: iTunesResponse = await res.json();
      const valid = (data.results || []).filter((t) => Boolean(t.previewUrl));
      if (valid.length > 0) return valid;
    }
  } catch {
    // All sources exhausted
  }

  return [];
}

export async function fetchTeluguTrack(
  rawTitle: string,
  rawMovie: string,
): Promise<SongTrackResult | null> {
  const title = sanitizeText(rawTitle);
  const movie = sanitizeText(rawMovie);

  const queries = [`${title} ${movie}`, title];
  let candidates: iTunesItem[] = [];

  for (const q of queries) {
    const results = await queryiTunes(q);
    if (results.length > 0) {
      candidates = results;
      break;
    }
  }

  if (candidates.length === 0) return null;

  const targetWords = getTitleWords(rawTitle);

  const scoredCandidates = candidates.map((item) => {
    let score = 0;
    const trackLower = (item.trackName || "").toLowerCase();

    for (const word of targetWords) {
      if (trackLower.includes(word)) score += 10;
    }

    if (isThemeTrap(item.trackName || "", rawTitle)) score -= 25;
    if (isWrongLanguageDub(item)) score -= 20;

    return { item, score };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);

  const best = scoredCandidates[0]?.item ?? candidates[0];

  if (!best?.previewUrl) return null;

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
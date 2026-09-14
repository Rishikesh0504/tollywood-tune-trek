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

// Clean titles/movies to remove clutter like brackets, OST tags, and punctuation
function sanitizeText(str: string): string {
  return str
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deprioritize or reject tracks clearly tagged as other language dubs
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

async function queryiTunes(searchTerm: string): Promise<iTunesItem[]> {
  try {
    const params = new URLSearchParams({
      term: searchTerm,
      country: "IN",
      media: "music",
      entity: "song",
      limit: "6",
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

export async function fetchTeluguTrack(
  rawTitle: string,
  rawMovie: string,
): Promise<SongTrackResult | null> {
  const title = sanitizeText(rawTitle);
  const movie = sanitizeText(rawMovie);

  // Cascading search strategies:
  // 1. Exact Title + Movie + "Telugu" (Strict match to prioritize original Telugu audio)
  // 2. Exact Title + Movie (In case album metadata does not contain the word 'Telugu')
  // 3. Exact Title + "Telugu" (In case film name transliteration differs on Apple Music)
  const queries = [
    `${title} ${movie} Telugu`,
    `${title} ${movie}`,
    `${title} Telugu`,
  ];

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

  // Filter out tracks that are explicitly labeled as Hindi/Tamil dubs
  const preferred =
    candidates.find((item) => !isWrongLanguageDub(item)) ?? candidates[0];

  if (!preferred?.previewUrl) {
    return null;
  }

  // Upscale default 100x100 preview poster to 600x600 for sharp cover art
  const hiResPoster = preferred.artworkUrl100
    ? preferred.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
    : "";

  return {
    audioUrl: preferred.previewUrl,
    posterUrl: hiResPoster,
    title: preferred.trackName || rawTitle,
    album: preferred.collectionName || rawMovie,
    artist: preferred.artistName || "",
  };
}

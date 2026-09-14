export type CategoryId =
  | "all"
  | "twenty-twenties"
  | "two-thousands-tens"
  | "nineties-two-thousands"
  | "classics";

export interface Category {
  id: CategoryId;
  label: string;
  subtitle: string;
  badge: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "all",
    label: "All Eras (Shuffle)",
    subtitle: "Random shuffle across 1,000+ tracks from Tollywood history",
    badge: "All",
  },
  {
    id: "twenty-twenties",
    label: "2020s Bangers",
    subtitle: "Anirudh, Thaman S, Devi Sri Prasad, Hesham, Santhosh Narayanan",
    badge: "2020s",
  },
  {
    id: "two-thousands-tens",
    label: "2000s–10s Nostalgia",
    subtitle: "DSP, Mani Sharma, Harris Jayaraj, Mickey J Meyer, Gopi Sundar",
    badge: "2000–2019",
  },
  {
    id: "nineties-two-thousands",
    label: "90s Golden Era",
    subtitle:
      "M.M. Keeravani, Koti, Raj-Koti, Deva, Sandeep Chowtha, Ilaiyaraaja",
    badge: "1990–1999",
  },
  {
    id: "classics",
    label: "Vintage Classics",
    subtitle: "Ilaiyaraaja, K.V. Mahadevan, Chakravarthy, Ghantasala, S.P.B.",
    badge: "Pre-1990",
  },
];

export interface Song {
  id: string;
  title: string;
  movie: string;
  year: number;
  composer: string;
  singers: string;
  category: Exclude<CategoryId, "all">;
}

export const REVEAL_STEPS = [0.1, 0.5, 2, 8, 15] as const;
export const MAX_ATTEMPTS = REVEAL_STEPS.length;

export const POINTS_BY_STEP: Record<number, number> = {
  0.1: 100,
  0.5: 50,
  2: 25,
  8: 10,
  15: 5,
};

// Emergency fallback songs in case public/songs.json is not yet created or unreachable
const FALLBACK_SONGS: Song[] = [
  {
    id: "fb_t1",
    title: "Chuttamalle",
    movie: "Devara",
    year: 2024,
    composer: "Anirudh Ravichander",
    singers: "Shilpa Rao",
    category: "twenty-twenties",
  },
  {
    id: "fb_t2",
    title: "Naatu Naatu",
    movie: "RRR",
    year: 2022,
    composer: "M.M. Keeravani",
    singers: "Rahul Sipligunj, Kaala Bhairava",
    category: "twenty-twenties",
  },
  {
    id: "fb_m1",
    title: "Inkem Inkem Inkem Kaavaale",
    movie: "Geetha Govindam",
    year: 2018,
    composer: "Gopi Sundar",
    singers: "Sid Sriram",
    category: "two-thousands-tens",
  },
  {
    id: "fb_m2",
    title: "Ringa Ringa",
    movie: "Arya 2",
    year: 2009,
    composer: "Devi Sri Prasad",
    singers: "Priya Himesh",
    category: "two-thousands-tens",
  },
  {
    id: "fb_n1",
    title: "Jaamu Rathiri",
    movie: "Kshana Kshanam",
    year: 1991,
    composer: "M.M. Keeravani",
    singers: "S.P. Balasubrahmanyam, K.S. Chithra",
    category: "nineties-two-thousands",
  },
  {
    id: "fb_c1",
    title: "Omkaara Naadaanusandhaanam",
    movie: "Sankarabharanam",
    year: 1980,
    composer: "K.V. Mahadevan",
    singers: "S.P. Balasubrahmanyam, S. Janaki",
    category: "classics",
  },
];

let cachedSongs: Song[] | null = null;
let fetchPromise: Promise<Song[]> | null = null;

export async function fetchAllSongs(): Promise<Song[]> {
  if (cachedSongs && cachedSongs.length > 0) {
    return cachedSongs;
  }

  // Prevent multiple parallel network calls during React Strict Mode mounting
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch("/songs.json", { cache: "force-cache" });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to load songs.json`);
      const data: Song[] = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid or empty songs catalog");
      }

      cachedSongs = data;
      return data;
    } catch (err) {
      console.warn(
        "Could not load /songs.json, using emergency offline pool:",
        err,
      );
      cachedSongs = FALLBACK_SONGS;
      return FALLBACK_SONGS;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function filterSongsByCategory(songs: Song[], cat: CategoryId): Song[] {
  if (cat === "all") return songs;
  const filtered = songs.filter((s) => s.category === cat);
  return filtered.length > 0 ? filtered : songs;
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

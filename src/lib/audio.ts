export interface SongTrackResult {
  title: string;
  artist: string;
  album: string;
  audioUrl: string;
  posterUrl: string;
}

const audioCache = new Map<string, SongTrackResult>();

export async function fetchTeluguTrack(
  songTitle: string,
  movieName: string,
): Promise<SongTrackResult | null> {
  const cacheKey = `${songTitle}-${movieName}`.toLowerCase();
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  try {
    // Search iTunes India catalog for the song + movie
    const query = encodeURIComponent(`${songTitle} ${movieName}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&country=IN&entity=song&limit=1`,
    );

    if (!res.ok) throw new Error(`iTunes API returned status ${res.status}`);

    const data = await res.json();

    // Fallback: If "Song + Movie" was too specific, search by song title alone
    let track = data.results?.[0];
    if (!track) {
      const fallbackRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(songTitle)}&country=IN&entity=song&limit=1`,
      );
      const fallbackData = await fallbackRes.json();
      track = fallbackData.results?.[0];
    }

    if (!track || !track.previewUrl) {
      console.warn("No audio preview found on CDN");
      return null;
    }

    const result: SongTrackResult = {
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      audioUrl: track.previewUrl, // Direct HTTPS 30s stream on audio-ssl.itunes.apple.com
      posterUrl: track.artworkUrl100
        ? track.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg")
        : "",
    };

    audioCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Failed to load track from iTunes:", error);
    return null;
  }
}

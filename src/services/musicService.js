// iTunes Search API service

const ITUNES_API = "https://itunes.apple.com/search";

export const searchMusic = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      term: query,
      media: "music",
      entity: "song",
      limit: limit.toString(),
    });

    const response = await fetch(`${ITUNES_API}?${params}`);
    const data = await response.json();

    return data.results.map((track) => ({
      id: track.trackId,
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      albumArt: track.artworkUrl100?.replace("100x100", "300x300") || null,
      previewUrl: track.previewUrl || null,
      duration: track.trackTimeMillis,
    }));
  } catch (error) {
    console.error("Error searching iTunes:", error);
    return [];
  }
};

// Format duration from milliseconds to mm:ss
export const formatDuration = (ms) => {
  if (!ms) return "";
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// iTunes Search API service using JSONP for iOS compatibility

const ITUNES_API = "https://itunes.apple.com/search";

// JSONP helper for cross-origin requests (required for iOS Safari)
const fetchJSONP = (url) => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");

    // Cleanup function
    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    // Set timeout for the request
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timeout"));
    }, 10000);

    // Define the callback
    window[callbackName] = (data) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    // Handle script errors
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    // Add callback parameter and load script
    script.src = `${url}&callback=${callbackName}`;
    document.head.appendChild(script);
  });
};

export const searchMusic = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      term: query,
      media: "music",
      entity: "song",
      limit: limit.toString(),
    });

    // Use JSONP for iOS Safari compatibility
    const data = await fetchJSONP(`${ITUNES_API}?${params}`);

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

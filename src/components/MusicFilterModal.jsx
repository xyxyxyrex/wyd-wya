import { useState, useEffect, useRef, useMemo } from "react";
import { searchMusic } from "../services/musicService";
import "./MusicFilterModal.css";

const MusicFilterModal = ({
  isOpen,
  onClose,
  onSelectFilter,
  currentFilter,
  notes = [],
  userLocation = null,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [radius, setRadius] = useState(1); // km
  const [showPopular, setShowPopular] = useState(true);
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Calculate distance between two coordinates in km
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get popular music from nearby notes
  const popularMusic = useMemo(() => {
    if (!userLocation) return [];

    // Filter notes within radius that have music
    const nearbyNotesWithMusic = notes.filter((note) => {
      if (!note.music || !note.location?.lat || !note.location?.lng)
        return false;
      const distance = getDistance(
        userLocation.lat,
        userLocation.lng,
        note.location.lat,
        note.location.lng,
      );
      return distance <= radius;
    });

    // Count music occurrences
    const musicCount = {};
    nearbyNotesWithMusic.forEach((note) => {
      const key = `${note.music.title}-${note.music.artist}`;
      if (!musicCount[key]) {
        musicCount[key] = {
          ...note.music,
          count: 0,
        };
      }
      musicCount[key].count += 1;
    });

    // Sort by count and return
    return Object.values(musicCount).sort((a, b) => b.count - a.count);
  }, [notes, userLocation, radius]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMusic(searchQuery, 8);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop audio when modal closes
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      setPreviewAudio(null);
    }
  }, [isOpen]);

  const handlePreview = (track) => {
    if (!track.previewUrl) return;

    if (previewAudio === track.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPreviewAudio(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      audioRef.current.onended = () => setPreviewAudio(null);
      setPreviewAudio(track.id);
    }
  };

  const handleSelectTrack = (track) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPreviewAudio(null);
    onSelectFilter(track);
    onClose();
  };

  const handleClearFilter = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPreviewAudio(null);
    onSelectFilter(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="music-filter-overlay" onClick={onClose}>
      <div className="music-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="music-filter-header">
          <h3>Filter by Music</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {currentFilter && (
          <div className="current-filter">
            <div className="current-filter-info">
              <img
                src={currentFilter.albumArt}
                alt={currentFilter.album}
                className="current-filter-art"
              />
              <div className="current-filter-text">
                <span className="current-filter-title">
                  {currentFilter.title}
                </span>
                <span className="current-filter-artist">
                  {currentFilter.artist}
                </span>
              </div>
            </div>
            <button className="clear-filter-btn" onClick={handleClearFilter}>
              Clear Filter
            </button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${showPopular ? "active" : ""}`}
            onClick={() => setShowPopular(true)}
          >
            Popular Nearby
          </button>
          <button
            className={`filter-tab ${!showPopular ? "active" : ""}`}
            onClick={() => setShowPopular(false)}
          >
            Search
          </button>
        </div>

        {/* Popular section with radius */}
        {showPopular && (
          <>
            <div className="radius-control">
              <label>Radius: {radius} km</label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
              />
            </div>

            <div className="music-filter-results">
              {!userLocation && (
                <p className="no-results">
                  Enable location to see popular music nearby
                </p>
              )}
              {userLocation && popularMusic.length === 0 && (
                <p className="no-results">
                  No music posts nearby. Try increasing the radius.
                </p>
              )}
              {popularMusic.map((track) => (
                <div
                  key={`${track.title}-${track.artist}`}
                  className={`music-filter-item ${currentFilter?.title === track.title && currentFilter?.artist === track.artist ? "active" : ""}`}
                >
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className="filter-item-art"
                  />
                  <div className="filter-item-info">
                    <span className="filter-item-title">{track.title}</span>
                    <span className="filter-item-artist">{track.artist}</span>
                    <span className="filter-item-count">
                      {track.count} {track.count === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  <div className="filter-item-actions">
                    {track.previewUrl && (
                      <button
                        className={`preview-btn ${previewAudio === track.id ? "playing" : ""}`}
                        onClick={() => handlePreview(track)}
                        title={previewAudio === track.id ? "Stop" : "Preview"}
                      >
                        {previewAudio === track.id ? (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      className="select-btn"
                      onClick={() => handleSelectTrack(track)}
                    >
                      Filter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Search section */}
        {!showPopular && (
          <>
            <div className="music-filter-search">
              <input
                type="text"
                placeholder="Search for a song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && <div className="search-spinner" />}
            </div>

            <div className="music-filter-results">
              {searchResults.length === 0 &&
                searchQuery.length >= 2 &&
                !isSearching && <p className="no-results">No results found</p>}
              {searchResults.length === 0 && searchQuery.length < 2 && (
                <p className="no-results hint">Type to search for music</p>
              )}
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  className={`music-filter-item ${currentFilter?.id === track.id ? "active" : ""}`}
                >
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className="filter-item-art"
                  />
                  <div className="filter-item-info">
                    <span className="filter-item-title">{track.title}</span>
                    <span className="filter-item-artist">{track.artist}</span>
                  </div>
                  <div className="filter-item-actions">
                    {track.previewUrl && (
                      <button
                        className={`preview-btn ${previewAudio === track.id ? "playing" : ""}`}
                        onClick={() => handlePreview(track)}
                        title={previewAudio === track.id ? "Stop" : "Preview"}
                      >
                        {previewAudio === track.id ? (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      className="select-btn"
                      onClick={() => handleSelectTrack(track)}
                    >
                      Filter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="filter-hint">
          Select a song to highlight posts with that music
        </p>
      </div>
    </div>
  );
};

export default MusicFilterModal;

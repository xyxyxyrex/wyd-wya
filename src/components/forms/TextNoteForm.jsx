import { useState, useEffect, useRef } from "react";
import { searchMusic } from "../../services/musicService";
import "./Forms.css";

const MAX_CHAR = 280;
const MAX_THREADS = 5;

const TextNoteForm = ({ onSubmit, defaultAuthor = "" }) => {
  const [threads, setThreads] = useState([""]);
  const [author, setAuthor] = useState(defaultAuthor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isThreaded, setIsThreaded] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [textStyle, setTextStyle] = useState(null); // null, 'quote', or 'bold'
  const [showModal, setShowModal] = useState(false);
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);

  // Music state
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(null);

  // Debounced music search
  useEffect(() => {
    if (!musicQuery.trim() || musicQuery.length < 2) {
      setMusicResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMusic(musicQuery);
      setMusicResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [musicQuery]);

  // Stop audio when closing music search
  useEffect(() => {
    if (!showMusicSearch && audioRef.current) {
      audioRef.current.pause();
      setPlayingPreview(null);
    }
  }, [showMusicSearch]);

  const handleThreadChange = (index, value) => {
    if (value.length <= MAX_CHAR) {
      const newThreads = [...threads];
      newThreads[index] = value;
      setThreads(newThreads);
    }
  };

  const addThread = () => {
    if (threads.length < MAX_THREADS) {
      setThreads([...threads, ""]);
      setActiveThreadIndex(threads.length);
    }
  };

  const removeThread = (index) => {
    if (threads.length > 1) {
      const newThreads = threads.filter((_, i) => i !== index);
      setThreads(newThreads);
      if (activeThreadIndex >= newThreads.length) {
        setActiveThreadIndex(newThreads.length - 1);
      }
    }
  };

  const toggleThreaded = () => {
    if (isThreaded) {
      // Switching off - keep only first thread
      setThreads([threads[0]]);
      setActiveThreadIndex(0);
    }
    setIsThreaded(!isThreaded);
  };

  const selectMusic = (track) => {
    setSelectedMusic(track);
    setShowMusicSearch(false);
    setMusicQuery("");
    setMusicResults([]);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingPreview(null);
  };

  const removeMusic = () => {
    setSelectedMusic(null);
  };

  const togglePreview = (track) => {
    if (playingPreview === track.id) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.previewUrl;
        audioRef.current.play();
        setPlayingPreview(track.id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validThreads = threads.filter((t) => t.trim());
    if (validThreads.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: "text",
        content: isThreaded ? validThreads : validThreads[0],
        isThreaded: isThreaded && validThreads.length > 1,
        author: author.trim() || "Anonymous",
        isSpoiler,
        textStyle,
        music: selectedMusic
          ? {
              id: selectedMusic.id,
              title: selectedMusic.title,
              artist: selectedMusic.artist,
              album: selectedMusic.album,
              albumArt: selectedMusic.albumArt,
              previewUrl: selectedMusic.previewUrl,
            }
          : null,
      });
      setThreads([""]);
      setAuthor("");
      setIsThreaded(false);
      setIsSpoiler(false);
      setTextStyle(null);
      setActiveThreadIndex(0);
      setShowModal(false);
      setSelectedMusic(null);
    } catch (error) {
      console.error("Error creating note:", error);
    }
    setIsSubmitting(false);
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const currentContent = threads[activeThreadIndex] || "";
  const hasContent = threads.some((t) => t.trim());

  return (
    <>
      <audio ref={audioRef} onEnded={() => setPlayingPreview(null)} />

      <form className="note-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="textarea-trigger" onClick={openModal}>
            <span className="trigger-placeholder">
              {currentContent || "Write something..."}
            </span>
            <span className="trigger-expand">↗</span>
          </div>
          {isThreaded && (
            <div className="thread-indicator">
              {threads.length} thread{threads.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Selected Music Preview */}
        {selectedMusic && (
          <div className="selected-music">
            <img
              src={selectedMusic.albumArt}
              alt={selectedMusic.album}
              className="music-art-small"
            />
            <div className="music-info-small">
              <span className="music-title-small">{selectedMusic.title}</span>
              <span className="music-artist-small">{selectedMusic.artist}</span>
            </div>
            <button
              type="button"
              className="remove-music-btn"
              onClick={removeMusic}
            >
              ✕
            </button>
          </div>
        )}

        {/* Add Music Button */}
        <button
          type="button"
          className="add-music-btn"
          onClick={() => setShowMusicSearch(true)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          {selectedMusic ? "CHANGE MUSIC" : "ADD MUSIC"}
        </button>

        <div className="form-row toggles-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isThreaded}
              onChange={toggleThreaded}
              className="toggle-input"
            />
            <span className="toggle-switch"></span>
            <span className="toggle-text">THREAD</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={() => setIsSpoiler(!isSpoiler)}
              className="toggle-input"
            />
            <span className="toggle-switch spoiler"></span>
            <span className="toggle-text">SPOILER</span>
          </label>
        </div>

        <div className="form-group">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Name (optional)"
            maxLength={30}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!hasContent || isSubmitting}
        >
          {isSubmitting ? "POSTING..." : "POST"}
        </button>
      </form>

      {/* Modal for writing */}
      {showModal && (
        <div className="text-modal-overlay" onClick={closeModal}>
          <div className="text-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {isThreaded
                  ? `THREAD ${activeThreadIndex + 1}/${threads.length}`
                  : "WRITE"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            {isThreaded && (
              <div className="thread-tabs">
                {threads.map((_, index) => (
                  <button
                    key={index}
                    className={`thread-tab ${index === activeThreadIndex ? "active" : ""}`}
                    onClick={() => setActiveThreadIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
                {threads.length < MAX_THREADS && (
                  <button className="thread-tab add-tab" onClick={addThread}>
                    +
                  </button>
                )}
              </div>
            )}

            <div className="modal-body">
              <div className="text-style-toggles">
                <button
                  type="button"
                  className={`style-toggle-btn ${textStyle === "quote" ? "active" : ""}`}
                  onClick={() =>
                    setTextStyle(textStyle === "quote" ? null : "quote")
                  }
                  title="Quote style"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="18"
                    height="18"
                  >
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`style-toggle-btn ${textStyle === "bold" ? "active" : ""}`}
                  onClick={() =>
                    setTextStyle(textStyle === "bold" ? null : "bold")
                  }
                  title="Bold style"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="18"
                    height="18"
                  >
                    <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
                  </svg>
                </button>
              </div>
              <textarea
                value={threads[activeThreadIndex]}
                onChange={(e) =>
                  handleThreadChange(activeThreadIndex, e.target.value)
                }
                placeholder={
                  isThreaded
                    ? `Thread ${activeThreadIndex + 1}...`
                    : "Write something..."
                }
                className={`modal-textarea ${textStyle === "quote" ? "quote-style" : ""} ${textStyle === "bold" ? "bold-style" : ""}`}
                autoFocus
              />
              <div className="modal-footer-row">
                <span className="char-count">
                  {threads[activeThreadIndex].length}/{MAX_CHAR}
                </span>
                {isThreaded && threads.length > 1 && (
                  <button
                    type="button"
                    className="remove-thread-btn"
                    onClick={() => removeThread(activeThreadIndex)}
                  >
                    REMOVE
                  </button>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={closeModal}>
                CANCEL
              </button>
              <button
                className="modal-btn primary"
                onClick={closeModal}
                disabled={!threads[activeThreadIndex].trim()}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      {showMusicSearch && (
        <div
          className="text-modal-overlay"
          onClick={() => setShowMusicSearch(false)}
        >
          <div
            className="music-search-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>ADD MUSIC</h3>
              <button
                className="modal-close"
                onClick={() => setShowMusicSearch(false)}
              >
                ✕
              </button>
            </div>

            <div className="music-search-input-wrapper">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={musicQuery}
                onChange={(e) => setMusicQuery(e.target.value)}
                placeholder="Search songs or artists..."
                className="music-search-input"
                autoFocus
              />
            </div>

            <div className="music-results">
              {isSearching && <div className="music-loading">Searching...</div>}

              {!isSearching &&
                musicResults.length === 0 &&
                musicQuery.length >= 2 && (
                  <div className="music-empty">No results found</div>
                )}

              {!isSearching && musicQuery.length < 2 && (
                <div className="music-hint">Type to search for music</div>
              )}

              {musicResults.map((track) => (
                <div key={track.id} className="music-result-item">
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className="music-result-art"
                  />
                  <div className="music-result-info">
                    <span className="music-result-title">{track.title}</span>
                    <span className="music-result-artist">{track.artist}</span>
                  </div>
                  {track.previewUrl && (
                    <button
                      type="button"
                      className={`music-preview-btn ${playingPreview === track.id ? "playing" : ""}`}
                      onClick={() => togglePreview(track)}
                    >
                      {playingPreview === track.id ? "■" : "▶"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="music-select-btn"
                    onClick={() => selectMusic(track)}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TextNoteForm;

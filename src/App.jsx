import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import TextNoteForm from "./components/forms/TextNoteForm";
import PollNoteForm from "./components/forms/PollNoteForm";
import AudioNoteForm from "./components/forms/AudioNoteForm";
import MapView from "./components/MapView";
import MapControls from "./components/MapControls";
import NoteCard from "./components/NoteCard";
import MusicFilterModal from "./components/MusicFilterModal";
import { ToastContainer, useToast } from "./components/Toast";
import { useGeolocation } from "./hooks/useGeolocation";
import {
  subscribeToNotes,
  createTextNote,
  createPollNote,
  createAudioNote,
  votePoll,
  addComment,
} from "./services/notesService";
import "./App.css";

// Check if location permission is denied
const checkLocationPermission = async () => {
  if (!navigator.permissions) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state; // "granted", "denied", or "prompt"
  } catch {
    return "unknown";
  }
};

// Check if microphone permission is denied
const checkMicrophonePermission = async () => {
  if (!navigator.permissions) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch {
    return "unknown";
  }
};

function App() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showCreateNote, setShowCreateNote] = useState(null); // null, 'poll', or 'audio'
  const [clusteredNotes, setClusteredNotes] = useState(null);
  const [quickText, setQuickText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [username, setUsername] = useState(
    () => sessionStorage.getItem("username") || "",
  );
  const [showWelcome, setShowWelcome] = useState(
    () => !sessionStorage.getItem("username"),
  );
  const [tempName, setTempName] = useState("");
  const [isClosingNote, setIsClosingNote] = useState(false);
  const [isClosingCreate, setIsClosingCreate] = useState(false);
  const [isClosingCluster, setIsClosingCluster] = useState(false);
  const [lastPostTime, setLastPostTime] = useState(() =>
    parseInt(sessionStorage.getItem("lastPostTime") || "0", 10),
  );
  const [showMusicFilter, setShowMusicFilter] = useState(false);
  const [musicFilter, setMusicFilter] = useState(null);
  const { location: userLocation } = useGeolocation();
  const { toasts, addToast, removeToast } = useToast();

  // Spam prevention: minimum 30 seconds between posts
  const SPAM_COOLDOWN_MS = 30000;

  const handleWelcomeSubmit = (e) => {
    e.preventDefault();
    const name = tempName.trim() || "Anonymous";
    sessionStorage.setItem("username", name);
    setUsername(name);
    setShowWelcome(false);
  };

  useEffect(() => {
    try {
      const unsubscribe = subscribeToNotes((updatedNotes) => {
        console.log("📝 Notes received from Firebase:", updatedNotes);
        console.log(
          "📍 Notes with location:",
          updatedNotes.filter((n) => n.location?.lat && n.location?.lng),
        );
        setNotes(updatedNotes);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error subscribing to notes:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Sync selectedNote with real-time notes updates
  useEffect(() => {
    if (selectedNote) {
      const updatedNote = notes.find((n) => n.id === selectedNote.id);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      }
    }
  }, [notes]);

  // Sync clusteredNotes with real-time notes updates
  // Also add new notes that are in the same cluster area
  useEffect(() => {
    if (clusteredNotes && clusteredNotes.length > 0) {
      // Get the cluster center from existing notes
      const clusterCenter = {
        lat:
          clusteredNotes.reduce((sum, n) => sum + (n.location?.lat || 0), 0) /
          clusteredNotes.length,
        lng:
          clusteredNotes.reduce((sum, n) => sum + (n.location?.lng || 0), 0) /
          clusteredNotes.length,
      };
      const threshold = 0.0005; // Same as MapView clustering threshold

      // Find all notes that belong to this cluster (including new ones)
      const allClusterNotes = notes.filter((note) => {
        if (!note.location?.lat || !note.location?.lng) return false;
        const latDiff = Math.abs(note.location.lat - clusterCenter.lat);
        const lngDiff = Math.abs(note.location.lng - clusterCenter.lng);
        return latDiff < threshold && lngDiff < threshold;
      });

      if (allClusterNotes.length === 0) {
        setClusteredNotes(null); // Close panel if all notes expired
      } else if (
        allClusterNotes.length !== clusteredNotes.length ||
        JSON.stringify(allClusterNotes.map((n) => n.id).sort()) !==
          JSON.stringify(clusteredNotes.map((n) => n.id).sort())
      ) {
        setClusteredNotes(allClusterNotes);
      }
    }
  }, [notes]);

  const handleCreateNote = async (noteData) => {
    // Check location permission first
    const locationPermission = await checkLocationPermission();
    if (locationPermission === "denied") {
      addToast("LOCATION ACCESS DENIED - Enable location to post", "error");
      return;
    }

    if (!userLocation) {
      addToast("WAITING FOR LOCATION - Please allow location access", "error");
      return;
    }

    // Check microphone permission for audio notes
    if (noteData.type === "audio") {
      const micPermission = await checkMicrophonePermission();
      if (micPermission === "denied") {
        addToast(
          "MICROPHONE ACCESS DENIED - Enable microphone for audio",
          "error",
        );
        return;
      }
    }

    // Spam prevention check
    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    if (timeSinceLastPost < SPAM_COOLDOWN_MS) {
      const secondsLeft = Math.ceil(
        (SPAM_COOLDOWN_MS - timeSinceLastPost) / 1000,
      );
      addToast(`WAIT ${secondsLeft}s BEFORE POSTING`, "error");
      return;
    }

    setIsPosting(true);
    try {
      const location = userLocation || null;
      console.log("📤 Creating note with location:", location);

      switch (noteData.type) {
        case "text":
          await createTextNote(
            noteData.content,
            noteData.author,
            location,
            noteData.isThreaded || false,
            noteData.music || null,
            noteData.isSpoiler || false,
          );
          addToast("POSTED", "success");
          break;
        case "poll":
          await createPollNote(
            noteData.question,
            noteData.options,
            noteData.author,
            location,
            noteData.isSpoiler || false,
          );
          addToast("POLL CREATED", "success");
          break;
        case "audio":
          await createAudioNote(
            noteData.audioBlob,
            noteData.caption,
            noteData.author,
            location,
            noteData.isSpoiler || false,
          );
          addToast("AUDIO POSTED", "success");
          break;
        default:
          console.error("Unknown note type:", noteData.type);
      }

      // Update last post time for spam prevention
      const postTime = Date.now();
      setLastPostTime(postTime);
      sessionStorage.setItem("lastPostTime", postTime.toString());

      // Center map on the posted location
      if (location) {
        window.dispatchEvent(
          new CustomEvent("center-on-user", { detail: location }),
        );
      }

      handleCloseCreate();
      setQuickText("");
    } catch (error) {
      console.error("Error creating note:", error);
      addToast("FAILED TO POST", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleVote = async (noteId, optionIndex) => {
    try {
      const voterId =
        localStorage.getItem("san-ka-voter-id") ||
        `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("san-ka-voter-id", voterId);

      await votePoll(noteId, optionIndex, voterId);
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleComment = async (noteId, text) => {
    try {
      await addComment(noteId, text, username || "Anonymous");
      addToast("COMMENT ADDED", "success");
    } catch (error) {
      console.error("Error adding comment:", error);
      addToast("FAILED TO ADD COMMENT", "error");
    }
  };

  const handleNoteSelect = (note) => {
    setSelectedNote(note);
    setShowCreateNote(false);
    // Don't close cluster panel - user may want to view other notes
  };

  const handleClusterSelect = (notes) => {
    setClusteredNotes(notes);
    setSelectedNote(null);
    setShowCreateNote(false);
  };

  const handleCloseCard = () => {
    setIsClosingNote(true);
    setTimeout(() => {
      setSelectedNote(null);
      setIsClosingNote(false);
    }, 200);
  };

  const handleCloseCluster = () => {
    setIsClosingCluster(true);
    setTimeout(() => {
      setClusteredNotes(null);
      setIsClosingCluster(false);
    }, 200);
  };

  const handleCloseCreate = () => {
    setIsClosingCreate(true);
    setTimeout(() => {
      setShowCreateNote(null);
      setIsClosingCreate(false);
    }, 200);
  };

  // Handler to open create form with permission checks
  const handleOpenCreate = async (type) => {
    // Check location permission
    const locationPermission = await checkLocationPermission();
    if (locationPermission === "denied") {
      addToast(
        "LOCATION ACCESS DENIED - Enable location in browser settings",
        "error",
      );
      return;
    }

    if (!userLocation) {
      addToast("GETTING LOCATION... Please allow access when prompted", "info");
    }

    // Check microphone for audio
    if (type === "audio") {
      const micPermission = await checkMicrophonePermission();
      if (micPermission === "denied") {
        addToast(
          "MICROPHONE ACCESS DENIED - Enable in browser settings",
          "error",
        );
        return;
      }
    }

    setShowCreateNote(type);
  };

  const [showPulse, setShowPulse] = useState(false);

  // Helper function to check if a note matches the music filter
  const noteMatchesMusicFilter = (note) => {
    if (!musicFilter) return true;
    if (!note.music) return false;
    return (
      note.music.title?.toLowerCase() === musicFilter.title?.toLowerCase() &&
      note.music.artist?.toLowerCase() === musicFilter.artist?.toLowerCase()
    );
  };

  const handleCenterOnUser = () => {
    if (userLocation) {
      // Show pulse effect
      setShowPulse(true);
      // Center the map
      window.dispatchEvent(
        new CustomEvent("center-on-user", { detail: userLocation }),
      );
      // Hide pulse after animation
      setTimeout(() => setShowPulse(false), 2000);
    }
  };

  return (
    <ThemeProvider>
      <div className={`app ${showWelcome ? "blurred" : ""}`}>
        <Header />
        {toasts.length > 0 && (
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        )}

        {/* Welcome Modal */}
        {showWelcome && (
          <div className="welcome-overlay">
            <form className="welcome-modal" onSubmit={handleWelcomeSubmit}>
              <span className="welcome-label">YOU ARE.....?</span>
              <input
                type="text"
                className="welcome-input"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Anonymous"
                maxLength={30}
                autoFocus
              />
              <p className="welcome-hint">Please do not enter your real name</p>
              <button type="submit" className="welcome-btn">
                →
              </button>
            </form>
          </div>
        )}

        <main className="main-content">
          {error && <div className="error-banner">Error: {error}</div>}

          <div className="map-fullscreen">
            <MapView
              notes={notes}
              onNoteSelect={handleNoteSelect}
              onClusterSelect={handleClusterSelect}
              userLocation={userLocation}
              musicFilter={musicFilter}
            />

            {/* Pulse effect for location */}
            {showPulse && userLocation && (
              <div
                className="location-pulse"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 50,
                  pointerEvents: "none",
                }}
              >
                <div className="pulse-ring" />
                <div className="pulse-dot" />
              </div>
            )}

            {/* Map Controls */}
            <MapControls
              userLocation={userLocation}
              onCenterUser={handleCenterOnUser}
              onOpenMusicFilter={() => setShowMusicFilter(true)}
              hasMusicFilter={!!musicFilter}
            />
          </div>

          {/* Cluster Panel */}
          {clusteredNotes && (
            <div
              className={`cluster-panel ${isClosingCluster ? "closing" : ""}`}
            >
              <div className="cluster-panel-header">
                <h3>{clusteredNotes.length} notes here</h3>
                <button className="close-btn" onClick={handleCloseCluster}>
                  x
                </button>
              </div>
              <div className="cluster-panel-list">
                {clusteredNotes.map((note) => {
                  const isFilterMatch =
                    musicFilter && noteMatchesMusicFilter(note);
                  const isFaded = musicFilter && !noteMatchesMusicFilter(note);
                  return (
                    <button
                      key={note.id}
                      className={`cluster-note-item ${isFilterMatch ? "music-match" : ""} ${isFaded ? "faded" : ""}`}
                      onClick={() => handleNoteSelect(note)}
                    >
                      <div
                        className={`cluster-note-icon ${note.isThreaded ? "thread" : note.type}`}
                      >
                        {note.type === "text" && !note.isThreaded && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M4 6h16M4 12h16M4 18h10" />
                          </svg>
                        )}
                        {note.type === "text" && note.isThreaded && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                        {note.type === "poll" && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="4" y="4" width="4" height="16" rx="1" />
                            <rect x="10" y="8" width="4" height="12" rx="1" />
                            <rect x="16" y="2" width="4" height="18" rx="1" />
                          </svg>
                        )}
                        {note.type === "audio" && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                          </svg>
                        )}
                      </div>
                      <div className="cluster-note-info">
                        <div className="cluster-note-type-row">
                          <span className="cluster-note-type">
                            {note.isThreaded ? "thread" : note.type}
                          </span>
                          {note.isSpoiler && (
                            <span className="cluster-spoiler-badge">
                              SPOILER
                            </span>
                          )}
                        </div>
                        <span className="cluster-note-author">
                          {note.author}
                        </span>
                        {note.type === "text" && (
                          <p className="cluster-note-preview">
                            {note.isSpoiler
                              ? "Hidden content"
                              : (Array.isArray(note.content)
                                  ? note.content[0]
                                  : note.content
                                )?.substring(0, 40) + "..."}
                          </p>
                        )}
                        {note.type === "poll" && (
                          <p className="cluster-note-preview">
                            {note.isSpoiler ? "Hidden poll" : note.question}
                          </p>
                        )}
                        {note.type === "audio" && note.caption && (
                          <p className="cluster-note-preview">
                            {note.isSpoiler ? "Hidden audio" : note.caption}
                          </p>
                        )}
                      </div>
                      <svg
                        className="cluster-note-arrow"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Note Card Overlay */}
          {selectedNote && (
            <div
              className={`note-overlay ${isClosingNote ? "closing" : ""}`}
              onClick={handleCloseCard}
            >
              <div
                className="note-overlay-card"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="close-btn" onClick={handleCloseCard}>
                  x
                </button>
                <NoteCard
                  note={selectedNote}
                  onVote={handleVote}
                  onComment={handleComment}
                  isSelected={true}
                  showComments={true}
                />
              </div>
            </div>
          )}

          {/* Create Note Modal */}
          {showCreateNote && (
            <div
              className={`note-overlay ${isClosingCreate ? "closing" : ""}`}
              onClick={handleCloseCreate}
            >
              <div
                className="create-note-modal glass"
                onClick={(e) => e.stopPropagation()}
              >
                <button className="close-btn" onClick={handleCloseCreate}>
                  x
                </button>
                <h3 className="modal-title">
                  {showCreateNote === "text"
                    ? "New Post"
                    : showCreateNote === "poll"
                      ? "Create Poll"
                      : "Record Audio"}
                </h3>
                {showCreateNote === "text" && (
                  <TextNoteForm
                    onSubmit={handleCreateNote}
                    defaultAuthor={username}
                  />
                )}
                {showCreateNote === "poll" && (
                  <PollNoteForm
                    onSubmit={handleCreateNote}
                    defaultAuthor={username}
                  />
                )}
                {showCreateNote === "audio" && (
                  <AudioNoteForm
                    onSubmit={handleCreateNote}
                    defaultAuthor={username}
                  />
                )}
                <p className="expiration-notice">
                  Posts disappear after 24 hours
                </p>
              </div>
            </div>
          )}

          {/* Floating Bottom Bar */}
          <div className="floating-bar">
            <div className="floating-bar-container">
              <button
                type="button"
                className="quick-text-trigger"
                onClick={() => handleOpenCreate("text")}
              >
                <span>you ok?</span>
                <span className="trigger-icon">↗</span>
              </button>
              <div className="bar-divider" />
              <button
                className="type-btn"
                onClick={() => handleOpenCreate("poll")}
                data-type="poll"
                title="Poll"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="4" y="4" width="4" height="16" rx="1" />
                  <rect x="10" y="8" width="4" height="12" rx="1" />
                  <rect x="16" y="2" width="4" height="18" rx="1" />
                </svg>
              </button>
              <button
                className="type-btn"
                onClick={() => handleOpenCreate("audio")}
                data-type="audio"
                title="Audio clip"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            </div>
          </div>

          {/* Music Filter Modal */}
          <MusicFilterModal
            isOpen={showMusicFilter}
            onClose={() => setShowMusicFilter(false)}
            onSelectFilter={setMusicFilter}
            currentFilter={musicFilter}
            notes={notes}
            userLocation={userLocation}
          />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;

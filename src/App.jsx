import { useState, useEffect } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Header from "./components/Header";
import TextNoteForm from "./components/forms/TextNoteForm";
import PollNoteForm from "./components/forms/PollNoteForm";
import AudioNoteForm from "./components/forms/AudioNoteForm";
import MapView from "./components/MapView";
import MapControls from "./components/MapControls";
import NoteCard from "./components/NoteCard";
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
  useEffect(() => {
    if (clusteredNotes && clusteredNotes.length > 0) {
      const updatedClusteredNotes = clusteredNotes
        .map((cn) => notes.find((n) => n.id === cn.id))
        .filter(Boolean); // Remove any notes that no longer exist

      if (
        updatedClusteredNotes.length !== clusteredNotes.length ||
        JSON.stringify(updatedClusteredNotes) !== JSON.stringify(clusteredNotes)
      ) {
        if (updatedClusteredNotes.length === 0) {
          setClusteredNotes(null); // Close panel if all notes expired
        } else {
          setClusteredNotes(updatedClusteredNotes);
        }
      }
    }
  }, [notes]);

  const handleCreateNote = async (noteData) => {
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
          );
          addToast("POSTED", "success");
          break;
        case "poll":
          await createPollNote(
            noteData.question,
            noteData.options,
            noteData.author,
            location,
          );
          addToast("POLL CREATED", "success");
          break;
        case "audio":
          await createAudioNote(
            noteData.audioBlob,
            noteData.caption,
            noteData.author,
            location,
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

  const [showPulse, setShowPulse] = useState(false);

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
                {clusteredNotes.map((note) => (
                  <button
                    key={note.id}
                    className="cluster-note-item"
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
                      <span className="cluster-note-type">
                        {note.isThreaded ? "thread" : note.type}
                      </span>
                      <span className="cluster-note-author">{note.author}</span>
                      {note.type === "text" && (
                        <p className="cluster-note-preview">
                          {(Array.isArray(note.content)
                            ? note.content[0]
                            : note.content
                          )?.substring(0, 40)}
                          ...
                        </p>
                      )}
                      {note.type === "poll" && (
                        <p className="cluster-note-preview">{note.question}</p>
                      )}
                      {note.type === "audio" && note.caption && (
                        <p className="cluster-note-preview">{note.caption}</p>
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
                ))}
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
              </div>
            </div>
          )}

          {/* Floating Bottom Bar */}
          <div className="floating-bar">
            <div className="floating-bar-container">
              <button
                type="button"
                className="quick-text-trigger"
                onClick={() => setShowCreateNote("text")}
              >
                <span>wyd, wya?</span>
                <span className="trigger-icon">↗</span>
              </button>
              <div className="bar-divider" />
              <button
                className="type-btn"
                onClick={() => setShowCreateNote("poll")}
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
                onClick={() => setShowCreateNote("audio")}
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
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;

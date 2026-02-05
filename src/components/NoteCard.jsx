import { useState, useEffect } from "react";
import { formatDistanceToNow } from "../utils/dateUtils";
import CommentSection from "./CommentSection";
import "./NoteCard.css";

// Calculate expiration progress (0-1, where 1 = full time remaining)
const getExpirationProgress = (createdAt, expiresAt) => {
  const now = Date.now();
  const created =
    createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime();
  const expires =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();
  const total = expires - created;
  const remaining = expires - now;
  return Math.max(0, Math.min(1, remaining / total));
};

const NoteCard = ({
  note,
  onVote,
  onComment,
  showComments: initialShowComments = false,
}) => {
  const [showComments, setShowComments] = useState(initialShowComments);
  const [votedOption, setVotedOption] = useState(null);
  const [currentThreadIndex, setCurrentThreadIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expirationProgress, setExpirationProgress] = useState(1);

  const TEXT_LIMIT = 150;

  // Update expiration progress every minute
  useEffect(() => {
    const updateProgress = () => {
      if (note.createdAt && note.expiresAt) {
        setExpirationProgress(
          getExpirationProgress(note.createdAt, note.expiresAt),
        );
      }
    };
    updateProgress();
    const interval = setInterval(updateProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [note.createdAt, note.expiresAt]);

  useEffect(() => {
    setShowComments(initialShowComments);
  }, [initialShowComments]);

  // Reset thread index when note changes
  useEffect(() => {
    setCurrentThreadIndex(0);
  }, [note.id]);

  const handleVote = (optionIndex) => {
    if (votedOption !== null) return;
    setVotedOption(optionIndex);
    onVote(note.id, optionIndex);
  };

  const getTotalVotes = () => {
    if (note.type !== "poll") return 0;
    return note.options.reduce((sum, opt) => sum + opt.votes, 0);
  };

  const getVotePercentage = (votes) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  // Thread navigation
  const threads =
    note.isThreaded && Array.isArray(note.content)
      ? note.content
      : [note.content];
  const totalThreads = threads.length;
  const hasMultipleThreads = totalThreads > 1;

  const goToPrevThread = (e) => {
    e.stopPropagation();
    setCurrentThreadIndex((prev) => (prev > 0 ? prev - 1 : totalThreads - 1));
  };

  const goToNextThread = (e) => {
    e.stopPropagation();
    setCurrentThreadIndex((prev) => (prev < totalThreads - 1 ? prev + 1 : 0));
  };

  const renderContent = () => {
    switch (note.type) {
      case "text": {
        const currentText = threads[currentThreadIndex] || "";
        const shouldTruncate =
          currentText.length > TEXT_LIMIT && !isExpanded && !hasMultipleThreads;
        const displayText = shouldTruncate
          ? currentText.slice(0, TEXT_LIMIT) + "..."
          : currentText;

        // For threaded posts, use a different layout
        if (hasMultipleThreads) {
          return (
            <div className="text-content-wrapper has-threads">
              <div className="thread-text-card">
                <p className="note-text">{currentText}</p>
              </div>
              <div className="thread-nav-row">
                <button className="thread-nav prev" onClick={goToPrevThread}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="thread-dots">
                  {threads.map((_, index) => (
                    <span
                      key={index}
                      className={`thread-dot ${index === currentThreadIndex ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentThreadIndex(index);
                      }}
                    />
                  ))}
                </div>
                <button className="thread-nav next" onClick={goToNextThread}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          );
        }

        // Regular single text post
        return (
          <div className="text-content-wrapper">
            <div className="text-content">
              <p className="note-text">
                {displayText}
                {shouldTruncate && (
                  <button
                    className="see-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                    }}
                  >
                    see more
                  </button>
                )}
                {isExpanded && currentText.length > TEXT_LIMIT && (
                  <button
                    className="see-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                  >
                    see less
                  </button>
                )}
              </p>
            </div>
          </div>
        );
      }

      case "poll":
        return (
          <div className="poll-content">
            <p className="poll-question">{note.question}</p>
            <div className="poll-options">
              {note.options.map((option, index) => {
                const percentage = getVotePercentage(option.votes);
                const isVoted = votedOption === index;
                const hasVoted = votedOption !== null;

                return (
                  <button
                    key={index}
                    className={`poll-option ${isVoted ? "voted" : ""} ${hasVoted ? "revealed" : ""}`}
                    onClick={() => handleVote(index)}
                    disabled={hasVoted}
                  >
                    <span className="option-text">{option.text}</span>
                    {hasVoted && (
                      <span className="option-percentage">{percentage}%</span>
                    )}
                    {hasVoted && (
                      <div
                        className="option-bar"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="poll-total">{getTotalVotes()} votes</p>
          </div>
        );

      case "audio":
        return (
          <div className="audio-content">
            {note.caption && <p className="audio-caption">{note.caption}</p>}
            <audio controls className="audio-player">
              <source src={note.audioData || note.audioUrl} type="audio/wav" />
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    if (note.type === "text" && hasMultipleThreads) {
      return `Thread ${currentThreadIndex + 1}/${totalThreads}`;
    }
    switch (note.type) {
      case "text":
        return "Text";
      case "poll":
        return "Poll";
      case "audio":
        return "Audio";
      default:
        return "Note";
    }
  };

  return (
    <div className={`note-card note-${note.type}`}>
      {/* Expiration Progress Bar */}
      <div className="expiration-bar-container">
        <div
          className="expiration-bar"
          style={{ width: `${expirationProgress * 100}%` }}
        />
      </div>

      <div className="note-header">
        <span className="note-type">{getTypeLabel()}</span>
        <span className="note-meta">
          <span className="note-author">{note.author}</span>
          <span className="note-separator">·</span>
          <span className="note-time">
            {formatDistanceToNow(note.createdAt)}
          </span>
        </span>
      </div>

      <div className="note-body">{renderContent()}</div>

      <div className="note-footer">
        <button
          className="comment-toggle"
          onClick={() => setShowComments(!showComments)}
        >
          {note.comments?.length || 0}{" "}
          {note.comments?.length === 1 ? "comment" : "comments"}
        </button>
      </div>

      {showComments && (
        <CommentSection
          comments={note.comments || []}
          onAddComment={(text) => onComment(note.id, text)}
        />
      )}
    </div>
  );
};

export default NoteCard;

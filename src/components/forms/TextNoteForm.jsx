import { useState } from "react";
import "./Forms.css";

const MAX_CHAR = 280;
const MAX_THREADS = 5;

const TextNoteForm = ({ onSubmit, defaultAuthor = "" }) => {
  const [threads, setThreads] = useState([""]);
  const [author, setAuthor] = useState(defaultAuthor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isThreaded, setIsThreaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);

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
      });
      setThreads([""]);
      setAuthor("");
      setIsThreaded(false);
      setActiveThreadIndex(0);
      setShowModal(false);
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

        <div className="form-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isThreaded}
              onChange={toggleThreaded}
              className="toggle-input"
            />
            <span className="toggle-switch"></span>
            <span className="toggle-text">THREADED POST</span>
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
                className="modal-textarea"
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
    </>
  );
};

export default TextNoteForm;

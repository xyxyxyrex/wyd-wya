import { useState } from "react";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import "./Forms.css";

const AudioNoteForm = ({ onSubmit, defaultAuthor = "" }) => {
  const [caption, setCaption] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error,
    isCompressing,
    maxDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioBlob || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: "audio",
        audioBlob,
        caption: caption.trim(),
        author: author.trim() || "Anonymous",
      });
      setCaption("");
      setAuthor("");
      resetRecording();
    } catch (error) {
      console.error("Error creating audio note:", error);
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds) => {
    return seconds.toFixed(1);
  };

  return (
    <form className="note-form" onSubmit={handleSubmit}>
      <div className="audio-recorder">
        {error && <p className="error-message">{error}</p>}

        <div className="recorder-display">
          <div
            className={`recorder-circle ${isRecording && !isPaused ? "recording" : ""} ${isPaused ? "paused" : ""} ${audioUrl ? "ready" : ""}`}
          >
            {isRecording && !isPaused ? (
              <span className="recording-indicator"></span>
            ) : isPaused ? (
              <span className="paused-indicator">Paused</span>
            ) : audioUrl ? (
              <span className="check-indicator">Done</span>
            ) : (
              <span className="mic-indicator">Mic</span>
            )}
          </div>

          <div className="recorder-info">
            {isRecording || isPaused ? (
              <p className="recorder-status">
                {formatTime(duration)}s / {maxDuration}s
              </p>
            ) : isCompressing ? (
              <p className="recorder-status">Compressing...</p>
            ) : audioUrl ? (
              <p className="recorder-status">Ready to post</p>
            ) : (
              <p className="recorder-status">Max {maxDuration} seconds</p>
            )}

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(duration / maxDuration) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="recorder-controls">
          {!isRecording && !isPaused && !audioUrl && (
            <button
              type="button"
              className="record-btn start"
              onClick={startRecording}
              disabled={isCompressing}
            >
              Record
            </button>
          )}

          {(isRecording || isPaused) && (
            <div className="recording-buttons">
              {!isPaused ? (
                <button
                  type="button"
                  className="record-btn pause"
                  onClick={pauseRecording}
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="record-btn resume"
                  onClick={resumeRecording}
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                className="record-btn stop"
                onClick={stopRecording}
              >
                Done
              </button>
            </div>
          )}

          {audioUrl && !isRecording && !isPaused && (
            <>
              <audio controls src={audioUrl} className="audio-preview" />
              <button
                type="button"
                className="record-btn reset"
                onClick={resetRecording}
              >
                Record Again
              </button>
            </>
          )}
        </div>
      </div>

      <div className="form-group">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          maxLength={200}
          className="form-input"
        />
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
        disabled={!audioBlob || isSubmitting || isCompressing}
      >
        {isSubmitting ? "Uploading..." : "Post"}
      </button>
    </form>
  );
};

export default AudioNoteForm;

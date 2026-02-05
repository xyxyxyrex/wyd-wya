import { useState } from "react";
import { formatDistanceToNow } from "../utils/dateUtils";
import { fullSpamCheck, recordSuccessfulPost } from "../utils/spamProtection";
import "./CommentSection.css";

// Simple user ID based on session (or could use device fingerprint)
const getUserId = () => {
  let userId = sessionStorage.getItem("userId");
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("userId", userId);
  }
  return userId;
};

const CommentSection = ({ comments, onAddComment }) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    const userId = getUserId();
    const content = newComment.trim();

    // Spam check
    const spamCheck = fullSpamCheck(userId, content, "COMMENT");
    if (!spamCheck.allowed) {
      setError(spamCheck.reason);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddComment(content);
      recordSuccessfulPost(userId, content, "COMMENT");
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      setError("Failed to post comment");
      setTimeout(() => setError(null), 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="comment-section">
      <form className="comment-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          maxLength={200}
          className={`comment-input ${error ? "input-error" : ""}`}
        />
        <button
          type="submit"
          className="comment-submit"
          disabled={!newComment.trim() || isSubmitting}
        >
          {isSubmitting ? "..." : "Post"}
        </button>
      </form>

      {error && <div className="comment-error">{error}</div>}

      <div className="comments-list">
        {comments.length === 0 ? (
          <p className="no-comments">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-time">
                  {formatDistanceToNow(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="comment-text">{comment.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;

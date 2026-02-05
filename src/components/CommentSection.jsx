import { useState } from "react";
import { formatDistanceToNow } from "../utils/dateUtils";
import "./CommentSection.css";

const CommentSection = ({ comments, onAddComment }) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
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
          className="comment-input"
        />
        <button
          type="submit"
          className="comment-submit"
          disabled={!newComment.trim() || isSubmitting}
        >
          {isSubmitting ? "..." : "Post"}
        </button>
      </form>

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

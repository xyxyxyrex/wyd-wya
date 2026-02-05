import NoteCard from "./NoteCard";
import "./NotesFeed.css";

const NotesFeed = ({ notes, loading, onVote, onComment, selectedNote }) => {
  if (loading) {
    return (
      <div className="notes-feed loading">
        <div className="loading-spinner"></div>
        <p>Loading</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="notes-feed empty">
        <h3>No notes yet</h3>
        <p>Be the first to share something</p>
      </div>
    );
  }

  return (
    <div className="notes-feed">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onVote={onVote}
          onComment={onComment}
          isSelected={selectedNote?.id === note.id}
        />
      ))}
    </div>
  );
};

export default NotesFeed;

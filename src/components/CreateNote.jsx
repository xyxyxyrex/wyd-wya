import { useState } from "react";
import TextNoteForm from "./forms/TextNoteForm";
import PollNoteForm from "./forms/PollNoteForm";
import AudioNoteForm from "./forms/AudioNoteForm";
import "./CreateNote.css";

const CreateNote = ({ onCreate, defaultAuthor = "" }) => {
  const [activeTab, setActiveTab] = useState("text");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCreate = async (noteData) => {
    await onCreate(noteData);
    setIsExpanded(false);
  };

  const tabs = [
    { id: "text", label: "Text" },
    { id: "poll", label: "Poll" },
    { id: "audio", label: "Audio" },
  ];

  return (
    <div className={`create-note ${isExpanded ? "expanded" : ""}`}>
      {!isExpanded ? (
        <button className="create-trigger" onClick={() => setIsExpanded(true)}>
          <span className="create-icon">+</span>
          <span>New note</span>
        </button>
      ) : (
        <div className="create-form-container">
          <div className="create-header">
            <h3>New Note</h3>
            <button className="close-btn" onClick={() => setIsExpanded(false)}>
              Close
            </button>
          </div>

          <div className="tab-bar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="form-content">
            {activeTab === "text" && (
              <TextNoteForm
                onSubmit={handleCreate}
                defaultAuthor={defaultAuthor}
              />
            )}
            {activeTab === "poll" && (
              <PollNoteForm
                onSubmit={handleCreate}
                defaultAuthor={defaultAuthor}
              />
            )}
            {activeTab === "audio" && (
              <AudioNoteForm
                onSubmit={handleCreate}
                defaultAuthor={defaultAuthor}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateNote;

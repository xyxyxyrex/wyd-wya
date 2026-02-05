import { useState } from "react";
import "./Forms.css";

const PollNoteForm = ({ onSubmit, defaultAuthor = "Anonymous" }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validOptions = options.filter((opt) => opt.trim());

    if (!question.trim() || validOptions.length < 2 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: "poll",
        question: question.trim(),
        options: validOptions,
        author: defaultAuthor || "Anonymous",
      });
      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      console.error("Error creating poll:", error);
    }
    setIsSubmitting(false);
  };

  const validOptions = options.filter((opt) => opt.trim());

  return (
    <form className="note-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Your question"
          maxLength={200}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Options</label>
        {options.map((option, index) => (
          <div key={index} className="option-row">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              maxLength={100}
              className="form-input"
            />
            {options.length > 2 && (
              <button
                type="button"
                className="remove-option-btn"
                onClick={() => removeOption(index)}
              >
                x
              </button>
            )}
          </div>
        ))}

        {options.length < 4 && (
          <button type="button" className="add-option-btn" onClick={addOption}>
            Add option
          </button>
        )}
      </div>

      <button
        type="submit"
        className="submit-btn"
        disabled={!question.trim() || validOptions.length < 2 || isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Post"}
      </button>
    </form>
  );
};

export default PollNoteForm;

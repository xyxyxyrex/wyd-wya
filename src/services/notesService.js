import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  arrayUnion,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebase";

const NOTES_COLLECTION = "notes";

// Note colors - will be randomly assigned
const NOTE_COLORS = ["teal", "violet", "moss"];

const getRandomColor = () =>
  NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

// Notes expire after 24 hours (in milliseconds)
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Get all notes with real-time updates (filters out expired notes)
export const subscribeToNotes = (callback) => {
  const q = query(
    collection(db, NOTES_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const notes = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          expiresAt:
            doc.data().expiresAt?.toDate?.() ||
            new Date(Date.now() + EXPIRATION_MS),
        }))
        .filter((note) => note.expiresAt.getTime() > now); // Filter out expired notes
      console.log("🔄 Real-time update received:", notes.length, "notes");
      callback(notes);
    },
    (error) => {
      console.error("❌ Firestore listener error:", error);
    },
  );
};

// Create text note (supports threaded posts and music attachments)
export const createTextNote = async (
  content,
  author = "Anonymous",
  location = null,
  isThreaded = false,
  music = null,
  isSpoiler = false,
  textStyle = null,
) => {
  const now = Timestamp.now();
  const noteData = {
    type: "text",
    content, // Can be string or array of strings for threads
    isThreaded: isThreaded,
    isSpoiler: isSpoiler,
    textStyle: textStyle,
    author,
    location,
    comments: [],
    pulses: 0,
    pulsedBy: [],
    color: getRandomColor(),
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + EXPIRATION_MS),
  };

  // Add music attachment if provided
  if (music) {
    noteData.music = music;
  }

  const docRef = await addDoc(collection(db, NOTES_COLLECTION), noteData);
  return { id: docRef.id, ...noteData };
};

// Create poll note
export const createPollNote = async (
  question,
  options,
  author = "Anonymous",
  location = null,
  isSpoiler = false,
) => {
  const pollOptions = options.map((opt) => ({
    text: opt,
    votes: 0,
    voters: [],
  }));

  const now = Timestamp.now();
  const noteData = {
    type: "poll",
    question,
    options: pollOptions,
    author,
    location,
    isSpoiler: isSpoiler,
    comments: [],
    pulses: 0,
    pulsedBy: [],
    color: getRandomColor(),
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + EXPIRATION_MS),
  };

  const docRef = await addDoc(collection(db, NOTES_COLLECTION), noteData);
  return { id: docRef.id, ...noteData };
};

// Create audio note (stores audio as base64 in Firestore)
export const createAudioNote = async (
  audioBlob,
  caption = "",
  author = "Anonymous",
  location = null,
  isSpoiler = false,
) => {
  // Convert audio blob to base64
  const base64Audio = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const now = Timestamp.now();
  const noteData = {
    type: "audio",
    audioData: base64Audio, // Store as base64 data URL
    caption,
    author,
    location,
    isSpoiler: isSpoiler,
    comments: [],
    pulses: 0,
    pulsedBy: [],
    color: getRandomColor(),
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + EXPIRATION_MS),
  };

  const docRef = await addDoc(collection(db, NOTES_COLLECTION), noteData);
  return { id: docRef.id, ...noteData };
};

// Vote on poll
export const votePoll = async (noteId, optionIndex, voterId) => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);

  // Get current note data
  const notesSnapshot = await getDocs(query(collection(db, NOTES_COLLECTION)));
  const noteDoc = notesSnapshot.docs.find((d) => d.id === noteId);

  if (!noteDoc) throw new Error("Note not found");

  const noteData = noteDoc.data();
  const options = [...noteData.options];

  // Check if voter already voted
  const hasVoted = options.some((opt) => opt.voters?.includes(voterId));
  if (hasVoted) throw new Error("Already voted");

  // Update the selected option
  options[optionIndex].votes += 1;
  options[optionIndex].voters = [
    ...(options[optionIndex].voters || []),
    voterId,
  ];

  await updateDoc(noteRef, { options });
};

// Pulse a note (like/heart)
export const pulseNote = async (noteId, userId) => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);

  // Get current note data
  const notesSnapshot = await getDocs(query(collection(db, NOTES_COLLECTION)));
  const noteDoc = notesSnapshot.docs.find((d) => d.id === noteId);

  if (!noteDoc) throw new Error("Note not found");

  const noteData = noteDoc.data();
  const pulsedBy = noteData.pulsedBy || [];
  const currentPulses = noteData.pulses || 0;

  // Check if user already pulsed - toggle off
  if (pulsedBy.includes(userId)) {
    const newPulsedBy = pulsedBy.filter((id) => id !== userId);
    await updateDoc(noteRef, {
      pulses: Math.max(0, currentPulses - 1),
      pulsedBy: newPulsedBy,
    });
    return false; // Unpulsed
  }

  // Add pulse
  await updateDoc(noteRef, {
    pulses: currentPulses + 1,
    pulsedBy: [...pulsedBy, userId],
  });
  return true; // Pulsed
};

// Add comment to note
export const addComment = async (noteId, text, author = "Anonymous") => {
  const noteRef = doc(db, NOTES_COLLECTION, noteId);

  const comment = {
    id: Date.now().toString(),
    text,
    author,
    createdAt: new Date().toISOString(),
  };

  await updateDoc(noteRef, {
    comments: arrayUnion(comment),
  });

  return comment;
};

// Delete note
export const deleteNote = async (noteId) => {
  await deleteDoc(doc(db, NOTES_COLLECTION, noteId));
};

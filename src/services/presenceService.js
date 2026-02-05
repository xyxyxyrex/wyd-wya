import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const PRESENCE_COLLECTION = "presence";
const PRESENCE_TIMEOUT = 60000; // 1 minute - users inactive longer are considered offline

// Generate a unique session ID for this browser tab
const sessionId =
  localStorage.getItem("san-ka-session-id") ||
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem("san-ka-session-id", sessionId);

let heartbeatInterval = null;

// Register user presence
export const registerPresence = async () => {
  const presenceRef = doc(db, PRESENCE_COLLECTION, sessionId);

  // Set initial presence
  await setDoc(presenceRef, {
    sessionId,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  // Update presence every 30 seconds
  heartbeatInterval = setInterval(async () => {
    try {
      await setDoc(
        presenceRef,
        {
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Error updating presence:", error);
    }
  }, 30000);

  // Clean up on page unload
  const cleanup = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    // Try to delete presence doc (may not always work on unload)
    deleteDoc(presenceRef).catch(() => {});
  };

  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);

  return cleanup;
};

// Subscribe to active users count
export const subscribeToActiveUsers = (callback) => {
  const presenceQuery = query(collection(db, PRESENCE_COLLECTION));

  return onSnapshot(presenceQuery, (snapshot) => {
    const now = Date.now();
    let activeCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lastSeen = data.lastSeen?.toDate?.();

      if (lastSeen) {
        const timeSinceLastSeen = now - lastSeen.getTime();
        // Consider user active if seen within the timeout period
        if (timeSinceLastSeen < PRESENCE_TIMEOUT) {
          activeCount++;
        }
      }
    });

    callback(activeCount);
  });
};

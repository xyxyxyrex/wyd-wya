import { useState, useEffect } from "react";
import {
  subscribeToActiveUsers,
  registerPresence,
} from "../services/presenceService";
import "./Header.css";

const Header = () => {
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    // Register this user's presence
    registerPresence();

    // Subscribe to active users count
    const unsubscribe = subscribeToActiveUsers((count) => {
      setActiveUsers(count);
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">wyd, wya?</h1>
      </div>

      <div className="header-right">
        <div className="active-users">
          <span className="active-dot" />
          <span className="active-count">{activeUsers}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

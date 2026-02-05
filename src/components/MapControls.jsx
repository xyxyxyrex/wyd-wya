import { useTheme } from "../context/ThemeContext";
import "./MapControls.css";

const MapControls = ({ userLocation, onCenterUser }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent("map-zoom", { detail: "in" }));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent("map-zoom", { detail: "out" }));
  };

  return (
    <div className="map-controls">
      {/* Location button */}
      {userLocation && (
        <button
          className="control-btn"
          onClick={onCenterUser}
          title="Center on my location"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        </button>
      )}

      {/* Theme toggle */}
      <button
        className="control-btn"
        onClick={toggleTheme}
        title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Zoom controls */}
      <button className="control-btn" onClick={handleZoomIn} title="Zoom in">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button className="control-btn" onClick={handleZoomOut} title="Zoom out">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
};

export default MapControls;

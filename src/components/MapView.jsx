import { useEffect, useState, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Module-level map instance to survive StrictMode double-mount
let globalMapInstance = null;
let globalLeaflet = null;

// Color palette for notes
const NOTE_COLORS = {
  teal: "#14b8a6",
  violet: "#8b5cf6",
  moss: "#84cc16",
};

// Calculate progress (0-1) for note expiration
const getExpirationProgress = (createdAt, expiresAt) => {
  const now = Date.now();
  const created = createdAt instanceof Date ? createdAt.getTime() : createdAt;
  const expires = expiresAt instanceof Date ? expiresAt.getTime() : expiresAt;
  const total = expires - created;
  const elapsed = now - created;
  return Math.max(0, Math.min(1, 1 - elapsed / total));
};

// Generate SVG progress ring
const getProgressRing = (progress, color, size = 44) => {
  const strokeWidth = 3;
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return `<svg class="progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="progress-ring-bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" 
      stroke-width="${strokeWidth}" fill="none" stroke="rgba(0,0,0,0.1)"/>
    <circle class="progress-ring-fill" cx="${size / 2}" cy="${size / 2}" r="${radius}"
      stroke-width="${strokeWidth}" fill="none" stroke="${color}"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
};

// Helper to group nearby notes into clusters
const clusterNotes = (notes, threshold = 0.0005) => {
  const clusters = [];
  const processed = new Set();

  notes.forEach((note, i) => {
    if (processed.has(note.id)) return;

    const cluster = [note];
    processed.add(note.id);

    notes.forEach((other, j) => {
      if (i === j || processed.has(other.id)) return;

      const latDiff = Math.abs(note.location.lat - other.location.lat);
      const lngDiff = Math.abs(note.location.lng - other.location.lng);

      if (latDiff < threshold && lngDiff < threshold) {
        cluster.push(other);
        processed.add(other.id);
      }
    });

    clusters.push({
      id: `cluster-${i}`,
      notes: cluster,
      center: {
        lat:
          cluster.reduce((sum, n) => sum + n.location.lat, 0) / cluster.length,
        lng:
          cluster.reduce((sum, n) => sum + n.location.lng, 0) / cluster.length,
      },
    });
  });

  return clusters;
};

const MapView = ({
  notes,
  onNoteSelect,
  onClusterSelect,
  userLocation,
  musicFilter,
}) => {
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // If global map exists and is attached to a different container, clean it up
    if (
      globalMapInstance &&
      mapContainerRef.current &&
      !mapContainerRef.current._leaflet_id
    ) {
      console.log(
        "🗺️ MapView: Global map exists but container is fresh, reinitializing...",
      );
      globalMapInstance.remove();
      globalMapInstance = null;
    }

    // If we already have a map instance attached to this container, use it
    if (globalMapInstance && mapContainerRef.current?._leaflet_id) {
      console.log("🗺️ MapView: Using existing global map");
      setMapReady(true);
      return;
    }

    // If container already has a leaflet map but we don't have global reference, skip init
    if (mapContainerRef.current?._leaflet_id) {
      console.log("🗺️ MapView: Container already initialized, skipping...");
      setMapReady(true);
      return;
    }

    const initMap = async () => {
      // Double check container isn't initialized
      if (!mapContainerRef.current || mapContainerRef.current._leaflet_id) {
        console.log("🗺️ MapView: Container not ready or already initialized");
        if (mapContainerRef.current?._leaflet_id) {
          setMapReady(true);
        }
        return;
      }

      console.log("🗺️ MapView: Initializing new map...");

      const L = (await import("leaflet")).default;
      globalLeaflet = L;

      const defaultCenter = [14.5995, 120.9842];
      const center = userLocation
        ? [userLocation.lat, userLocation.lng]
        : defaultCenter;

      console.log("🗺️ MapView: Creating map at center:", center);

      const map = L.map(mapContainerRef.current, {
        attributionControl: false,
        zoomControl: false,
        minZoom: 3,
        maxZoom: 18,
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        maxBoundsViscosity: 1.0,
      }).setView(center, 13);

      // CartoDB Positron - clean, minimal light theme (original)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "",
          noWrap: true,
          bounds: [
            [-85, -180],
            [85, 180],
          ],
        },
      ).addTo(map);

      // Ensure map size is correct after initialization
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 100);

      globalMapInstance = map;
      console.log("🗺️ MapView: Map created, setting mapReady to true");
      setMapReady(true);
    };

    initMap();

    // Don't clean up on unmount in StrictMode - let the map persist
    return () => {
      // Only cleanup markers, not the map itself
      markersRef.current.forEach((marker) => {
        if (globalMapInstance) {
          globalMapInstance.removeLayer(marker);
        }
      });
      markersRef.current = [];
    };
  }, []);

  // Center map on user location when it becomes available
  useEffect(() => {
    if (globalMapInstance && mapReady && userLocation) {
      console.log("📍 Centering map on user location:", userLocation);
      globalMapInstance.setView([userLocation.lat, userLocation.lng], 13, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    console.log("🔄 Marker effect check:", {
      hasMap: !!globalMapInstance,
      mapReady,
      hasLeaflet: !!globalLeaflet,
      notesCount: notes.length,
    });

    if (!globalMapInstance || !mapReady || !globalLeaflet) {
      console.log("⏳ Waiting for map to be ready...");
      return;
    }

    const L = globalLeaflet;
    const map = globalMapInstance;

    console.log("🗺️ MapView: Updating markers");
    console.log("  - Total notes:", notes.length);
    console.log("  - User location:", userLocation);

    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    // No user marker - just notes

    const notesWithLocation = notes.filter(
      (note) => note.location?.lat && note.location?.lng,
    );

    const icons = {
      text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
      poll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="16" y="2" width="4" height="18" rx="1"/></svg>`,
      audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
    };

    // Group notes into clusters
    const clusters = clusterNotes(notesWithLocation);

    // Helper to check if a note matches the music filter
    const noteMatchesMusicFilter = (note) => {
      if (!musicFilter) return true;
      if (!note.music) return false;
      return (
        note.music.id === musicFilter.id ||
        (note.music.title === musicFilter.title &&
          note.music.artist === musicFilter.artist)
      );
    };

    clusters.forEach((cluster) => {
      if (cluster.notes.length === 1) {
        // Single note - show colored solid marker with progress ring
        const note = cluster.notes[0];
        const color = NOTE_COLORS[note.color] || NOTE_COLORS.teal;
        const progress = getExpirationProgress(note.createdAt, note.expiresAt);
        const progressRing = getProgressRing(progress, color, 44);

        // Calculate opacity based on music filter
        const matchesFilter = noteMatchesMusicFilter(note);
        const opacity = musicFilter ? (matchesFilter ? 1 : 0.25) : 1;

        const noteIcon = L.divIcon({
          className: "note-marker",
          html: `<div class="note-pin-wrapper" style="opacity: ${opacity}; transition: opacity 0.3s ease;">
            ${progressRing}
            <div class="note-pin" data-color="${note.color}" style="background: ${color}">
              ${icons[note.type] || icons.text}
            </div>
          </div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([note.location.lat, note.location.lng], {
          icon: noteIcon,
          zIndexOffset: matchesFilter ? 600 : 500,
        }).addTo(map);

        // Create popup content based on note type
        let popupContent = "";
        const noteContent = Array.isArray(note.content)
          ? note.content[0]
          : note.content;
        const truncatedContent =
          noteContent && noteContent.length > 120
            ? noteContent.substring(0, 120) + "..."
            : noteContent;

        if (note.type === "text") {
          popupContent = `
            <div class="note-popup">
              <div class="note-popup-header">
                <span class="note-popup-type">${note.isThreaded ? "THREAD" : "TEXT"}</span>
                <span class="note-popup-author">${note.author}</span>
              </div>
              <p class="note-popup-content">${truncatedContent || ""}</p>
              ${note.isThreaded && Array.isArray(note.content) && note.content.length > 1 ? `<span class="note-popup-thread-count">${note.content.length} posts in thread</span>` : ""}
            </div>
          `;
        } else if (note.type === "poll") {
          popupContent = `
            <div class="note-popup">
              <div class="note-popup-header">
                <span class="note-popup-type">POLL</span>
                <span class="note-popup-author">${note.author}</span>
              </div>
              <p class="note-popup-content">${note.question}</p>
              <span class="note-popup-poll-info">${note.options?.length || 0} options</span>
            </div>
          `;
        } else if (note.type === "audio") {
          popupContent = `
            <div class="note-popup">
              <div class="note-popup-header">
                <span class="note-popup-type">AUDIO</span>
                <span class="note-popup-author">${note.author}</span>
              </div>
              ${note.caption ? `<p class="note-popup-content">${note.caption}</p>` : '<p class="note-popup-content audio-hint">🎵 Audio clip</p>'}
            </div>
          `;
        }

        // Bind popup to marker
        marker.bindPopup(popupContent, {
          className: "note-popup-container",
          closeButton: false,
          offset: [0, -10],
          maxWidth: 280,
          minWidth: 200,
        });

        // Open modal on popup click for full view
        marker.on("popupopen", () => {
          const popupEl = marker.getPopup().getElement();
          if (popupEl) {
            popupEl.addEventListener("click", () => {
              marker.closePopup();
              onNoteSelect(note);
            });
          }
        });

        markersRef.current.push(marker);
      } else {
        // Multiple notes - show cluster marker with count above and dotted inner border
        // Get dominant color from first note
        const dominantColor =
          NOTE_COLORS[cluster.notes[0].color] || NOTE_COLORS.teal;

        // Check if any note in cluster matches the music filter
        const hasMatchingNote = cluster.notes.some(noteMatchesMusicFilter);
        const matchingCount = musicFilter
          ? cluster.notes.filter(noteMatchesMusicFilter).length
          : cluster.notes.length;
        const clusterOpacity = musicFilter ? (hasMatchingNote ? 1 : 0.25) : 1;

        const clusterIcon = L.divIcon({
          className: "cluster-marker",
          html: `<div class="cluster-pin-wrapper" style="opacity: ${clusterOpacity}; transition: opacity 0.3s ease;">
            <span class="cluster-count-above">${musicFilter && hasMatchingNote ? matchingCount : cluster.notes.length}</span>
            <div class="cluster-pin" style="background: ${dominantColor}">
              <div class="cluster-inner-ring"></div>
            </div>
          </div>`,
          iconSize: [44, 60],
          iconAnchor: [22, 38],
        });

        const marker = L.marker([cluster.center.lat, cluster.center.lng], {
          icon: clusterIcon,
          zIndexOffset: hasMatchingNote ? 700 : 600,
        }).addTo(map);

        marker.on("click", () => {
          if (onClusterSelect) {
            onClusterSelect(cluster.notes);
          }
        });
        markersRef.current.push(marker);
      }
    });
  }, [
    notes,
    userLocation,
    mapReady,
    onNoteSelect,
    onClusterSelect,
    musicFilter,
  ]);

  // Listen for center-on-user event
  useEffect(() => {
    const handleCenterOnUser = (e) => {
      if (globalMapInstance && e.detail) {
        globalMapInstance.setView([e.detail.lat, e.detail.lng], 15, {
          animate: true,
          duration: 0.5,
        });
      }
    };

    const handleZoom = (e) => {
      if (globalMapInstance) {
        if (e.detail === "in") {
          globalMapInstance.zoomIn();
        } else {
          globalMapInstance.zoomOut();
        }
      }
    };

    window.addEventListener("center-on-user", handleCenterOnUser);
    window.addEventListener("map-zoom", handleZoom);
    return () => {
      window.removeEventListener("center-on-user", handleCenterOnUser);
      window.removeEventListener("map-zoom", handleZoom);
    };
  }, []);

  return (
    <div className="map-view">
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default MapView;

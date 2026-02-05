# San Ka? – AI Agent Specification

## Overview
This document defines the requirements and constraints for building **San Ka?**, a location-based social web app where users can post **ephemeral content** tied to a geographic location.

Supported post types:
1. **Text**
2. **Poll**
3. **Audio clip (max 5 seconds)**

All content is **public**, **map-based**, and **automatically deleted after 24 hours**.

This file is intended to be consumed by an AI agent responsible for generating implementation and setup documentation.

---

## Core Product Requirements

### 1. Post Types

#### 1.1 Text Post
- Plain text only
- Max length: **280 characters**
- No rich text or media
- Anonymous by default

---

#### 1.2 Poll Post
- Question text (max 140 characters)
- 2–4 options
- Each option:
  - Max 60 characters
- Users can vote once per poll
- Poll results are public and update in real time
- Poll expires with the parent post (24 hours)

---

#### 1.3 Audio Post
- Voice-only audio recording
- Max duration: **5 seconds**
- Optional caption (max 140 characters)

##### Audio Constraints
- Codec: **Opus**
- Container: **WebM or OGG**
- Bitrate target: **16–24 kbps**
- Expected size per clip: **~12–20 KB**
- Server-side validation of:
  - Duration
  - MIME type
  - File size

---

### 2. Location Data
Each post must include:
- Latitude
- Longitude
- Timestamp (UTC)
- Post type discriminator: `text | poll | audio`

---

### 3. Map Feed
- Interactive world map
- Posts appear as pins based on location
- Pins visually differentiate post type
- Users can:
  - Tap pins to view content
  - Play audio inline
  - Vote on polls
- Posts cluster at low zoom levels

---

### 4. Ephemeral Data Rules
- All posts expire **24 hours after creation**
- On expiration:
  - Database records are deleted
  - Associated audio files are removed from object storage
- No permanent history or archives

---

### 5. Interactions
- Users may:
  - Vote on polls
  - Leave short text comments (optional feature)
- Comments expire with the parent post
- No likes, follows, or permanent profiles

---

## Non-Functional Requirements

### Performance
- Mobile-first
- Audio playback start < 300ms
- Low-bandwidth friendly
- CDN-backed static assets

---

### Scalability Assumptions
- 100k posts/day
- Audio posts average ~15 KB
- Heavy read traffic on map feed
- Write traffic spikes during peak hours

---

### Cost Awareness
- Prefer free / low-cost tiers
- Optimize storage and bandwidth usage
- Avoid long-running backend processes

---

## Deployment Constraints

### Platform
- **Vercel (required)**
- Serverless-first architecture

---

### Backend
- Vercel Serverless Functions or Edge Functions
- REST or lightweight RPC APIs
- No always-on servers

---

### Storage
- Audio stored in object storage (S3-compatible)
- Metadata stored in a database with TTL or scheduled cleanup

---

### Cleanup Strategy
One of the following must be used:
- Database TTL / expiration
- Scheduled cron job (Vercel Cron)
- Object storage lifecycle rules

---

## Security & Abuse Prevention
- Rate-limit post creation per IP
- Validate payload size and content
- Prevent oversized or long audio uploads
- Basic spam mitigation (cooldowns, limits)

---

## Suggested (Non-Mandatory) Tech Stack
- Frontend: Next.js (App Router)
- Audio recording: MediaRecorder API
- Map: Mapbox GL JS or Leaflet
- Database: Postgres, KV, or Firestore-like
- Storage: S3-compatible (R2, Supabase, etc.)

---

## 🎯 TASK FOR AI AGENT

### Objective
Generate a **new Markdown file** named:

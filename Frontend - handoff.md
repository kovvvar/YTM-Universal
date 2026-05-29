# YTM Universal — Frontend Developer Handoff

This document is a comprehensive handoff file designed for a frontend-AI developer to continue developing, styling, and maintaining the **YTM Universal** frontend.

---

## 1. Project Overview & Environment

- **Project Name:** YTM Universal
- **Type:** Single-Page Music Downloader Interface
- **Stack:** Vite + React + Tailwind CSS **v4** + Lucide React Icons
- **Typography:** Onest (for general UI text and first-class Cyrillic support) & Geist Mono (for technical stats and mono uppercase labels)
- **Local Dev OS:** Windows (PowerShell/CMD)
- **Backend:** Python Flask API running locally on `http://localhost:5000` (which wraps `yt-dlp` & `ffmpeg` to write audio files to disk).
- **Frontend Ports:** `5173` (Vite dev) and `4173` (Vite production preview).
- **Communication:** HTTP REST endpoints (JSON) for search/track download and Server-Sent Events (SSE) for playlist/album downloads.

---

## 2. Design System & Constraints (CRITICAL)

The UI must follow these strict visual guidelines. **Do not deviate from them.**

1. **Strict Monochrome Color Scheme:**
   - The entire UI is black, white, and shades of gray/zinc.
   - **No color accents anywhere.** No green for success, no red for failure/errors, no blue for active tabs.
   - Highlight states, active tabs, and status updates are communicated strictly via text opacity changes, font weight, background fills, borders, and uppercase status labels (e.g. `"DONE"`, `"FAILED"`, `"READY"`).
2. **Two-Tone Hero Title:**
   - The main header on the page uses a high-contrast weight for the first section and a low-contrast muted gray for the second section: `"Download any track. <span class="opacity-35 font-normal">Instantly.</span>"`.
3. **Monochrome Lucide Icons:**
   - All icons are styled to inherit the parent text color (`stroke-current` or `className="text-text-heading"` / `text-text-body`).
   - Modern Lucide packages deprecate brand icons. A custom SVG component for the **GitHub** icon is implemented inline in `App.jsx` using matching stroke properties.
4. **Theme Toggle (Dark/Light):**
   - The application has a dark theme enabled by default (`class="dark"` on `<html>`).
   - Theme preferences are saved to `localStorage` under `theme` and dynamically applied to the document body.
5. **Language Toggle (RU/EN):**
   - A translation toggler resides in the top action bar next to the theme switcher.
   - It manages `lang` state ("ru" / "en"), persisting to `localStorage` under `lang`.
   - All UI text is parsed through a local helper function `t(key)` lookup mapping to the `translations` object inside `App.jsx`.

---

## 3. Directory Layout

```
D:\VS Code\YTM Tool\
├─ package.json             # Tailwind v4 and React dependency tree
├─ vite.config.js           # Includes Tailwind v4 compiler plugins & Windows watcher rules
├─ index.html               # Custom Geist font linkages & page metadata setup
├─ handoff.md               # [THIS FILE]
├─ start_ytm.bat            # Windows startup script (run build -> run server.py & npm run preview)
├─ stop_ytm.bat             # Process cleanup script (kills node/python & binds ports 5000/4173)
├─ src/
│  ├─ main.jsx              # React mounting root
│  ├─ index.css             # Tailwind v4 entry, custom @font-face, theme variables, and grid utilities
│  └─ App.jsx               # Single-page code (translation definitions, API bindings, logic, UI layout)
└─ backend/                 # Python Flask service folder
   └─ server.py             # Local downloading engine using yt-dlp & ffmpeg
```

---

## 4. API Endpoints & Contract

The frontend connects to the local backend using `API_BASE = "http://localhost:5000"`. Direct connection is enabled via CORS policy configs in Flask.

### `POST /search/track`
- **Request Payload:** `{ "artist": "string", "title": "string" }`
- **Response Shape:**
  ```json
  {
    "results": [
      {
        "id": "string (youtube video URL)",
        "title": "string",
        "artist": "string",
        "duration": "string (e.g. 3:45)",
        "cover": "string (cover art image URL)"
      }
    ]
  }
  ```

### `POST /search/collection`
- **Request Payload:** `{ "query": "string (search query or direct URL)", "type": "album" | "playlist" }`
- **Response Shape:**
  ```json
  {
    "results": [
      {
        "id": "string (youtube collection URL)",
        "title": "string",
        "artist": "string | null",
        "trackCount": "number | null",
        "type": "album" | "playlist"
      }
    ]
  }
  ```

### `GET /download/track?id=...&savePath=...` (SSE Stream)
- Opens a Server-Sent Events stream using browser `EventSource` initialized with query parameters.
- **Event Message JSON Format (`event.data`):**
  ```json
  {
    "percent": "number (0-100)",
    "title": "string (currently downloading track name)",
    "done": "boolean",
    "filePath": "string | null"
  }
  ```
- **Handoff Rule:** On receipt of `done: true`, the frontend must invoke `es.close()` to cleanly terminate the stream connection.

### `GET /download/collection?id=...&type=...&savePath=...` (SSE Stream)
- Opens a Server-Sent Events stream using browser `EventSource` initialized with query parameters.
- **Event Message JSON Format (`event.data`):**
  ```json
  {
    "current": "number",
    "total": "number",
    "title": "string (currently downloading track name)",
    "percent": "number (0-100)",
    "done": "boolean",
    "status": "FETCHING" | "DOWNLOADING" | "DONE" | "FAILED"
  }
  ```
- **Handoff Rule:** On receipt of `done: true`, the frontend must invoke `es.close()` to cleanly terminate the stream connection.

---

## 5. Solved Frontend Traps & Solutions

Keep these design choices intact to avoid breaking features:

1. **Uncontrolled Form Refreshes:**
   - Any buttons placed inside a `<form>` element default to `type="submit"` and cause the browser to reload (wiping state).
   - **Solution:** Ensure all form-bound action elements have an explicit `type="button"` and their onClick triggers call `e.preventDefault()`. In `App.jsx`, forms also use `<form onSubmit={(e) => e.preventDefault()}>` to prevent default behavior.
2. **Vite Hot Module Replacement (HMR) Reloads:**
   - In dev mode (`npm run dev`), the Vite watcher can trigger full-page reloads when files change or when certain persistent connections (like EventSource streams) are kept active.
   - **Solution:** For testing actual downloading actions, use `npm run build` followed by `npm run preview`. This compiles production code and hosts it on port `4173` without HMR listeners.
3. **Relative Download Paths:**
   - Storing files in a relative directory like `./Downloads` resolves against the *backend's* current working directory, which is counter-intuitive for users.
   - **Solution:** The state is configured with a default absolute location (`D:\\Downloads\\`) on Windows, which is editable from the bottom input of the download console.
4. **Graceful Null Renders:**
   - YouTube searches for playlists or albums often output flat collections that omit `artist` and `trackCount`.
   - **Solution:** Keep conditional operators active when rendering rows (e.g., `item.artist || ""` and check for undefined track counts) to avoid rendering `"null"` or `"undefined"` labels on the screen.

---

## 6. Current Implementation Checklist in `src/App.jsx`

- [x] **Theme Switcher:** Hooks up `class="dark"` toggles and saves preferences.
- [x] **Language Swapping:** Stores `"lang"` string in localStorage and hooks into `translations` mapping.
- [x] **Track Search:** Resolves input and queries `POST /search/track`.
- [x] **Track Download:** Invokes `GET /download/track` (SSE Stream) and handles live progress updates.
- [x] **Collection Parser:** Resolves query text and parses matching rows.
- [x] **Bulk Downloader:** Wired with an SSE stream listener that parses download steps and maps them to a progress bar.
- [x] **Dot-Matrix Background:** Utilizes `.bg-grid` styles mapping to gradient-masked SVG details.
- [x] **API Base Address:** Set to `"http://localhost:5000"` directly.
- [x] **Custom Save Path:** Persistence via `localStorage["ytm_save_path"]` and fallback `GET /config/output-path` default retrieval.
- [x] **Cyrillic Font Integration**: Replaced `Geist Sans` with `Onest` to support full Russian character typography.

---

## 7. Next Steps for Frontend Development

If you are tasked with upgrading or expanding this frontend, focus on:

1. **Testing the SSE Stream Progress Bar:**
   - Run a live download on a large playlist/album, and check how smoothly the progress percentage and labels animate.
   - *Option:* You can implement client-side progress calculations:
     $$\text{overallPercent} = \frac{(\text{current} - 1 + \frac{\text{percent}}{100})}{\text{total}} \times 100$$
     to prevent the bar from jumping backward/forward as individual tracks fetch.
2. **Consolidate Hosting (Flask Serving Frontend):**
   - Configure a production setup where Python's Flask backend hosts the static assets from `<ROOT>/dist` (index.html, assets/) directly, rendering the entire app from a single endpoint (port 5000). This would eliminate the need for running the front-end preview server on port 4173 altogether.

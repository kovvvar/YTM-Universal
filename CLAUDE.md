# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role boundary

This repo is developed by two separate AI instances. **This Claude Code instance owns the backend only.**

| Zone | Owner |
|---|---|
| `backend/server.py`, Flask API, yt-dlp integration, infrastructure, bat files | **This instance** |
| `src/App.jsx`, `src/index.css`, React/Tailwind/Vite | **Separate frontend AI** |

If a frontend change is needed: formulate a written spec/prompt for the frontend AI and hand it to the user. Do not edit `src/` files directly.

## Commands

**Frontend (run from repo root)**
```powershell
npm run dev        # dev server at http://127.0.0.1:5173 (with Vite proxy to Flask)
npm run build      # production build -> dist/
npm run preview    # serve dist/ at http://localhost:4173 (no proxy, no HMR)
npm run lint       # ESLint check
```

**Backend (run from `backend/`)**
```powershell
python server.py   # Flask at http://localhost:5000
```

**First-time setup**
```powershell
# From repo root:
npm install
# From backend/:
pip install flask flask-cors yt-dlp
```

**Windows helpers**
```powershell
.\start_ytm.bat    # opens both servers + browser
.\stop_ytm.bat     # kills both + frees ports 5000 and 4173
```

> PowerShell may block `npm` (ExecutionPolicy). Fix: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, or use `npm.cmd` explicitly. The bat files use `cmd` and are unaffected.

## Architecture

```
Browser (React SPA, :5173 dev / :4173 prod)
        │  HTTP JSON  +  SSE
        ▼
Flask server (backend/server.py, :5000)
        │  subprocess
        ▼
yt-dlp  ──►  ffmpeg  ──►  MP3 on disk
```

In dev, Vite proxies `/search/*` and `/download/*` to `:5000`. `API_BASE = "http://localhost:5000"` (direct URL, works in both dev and preview since Flask has CORS enabled).

### Backend endpoints (`backend/server.py`)

| Method | Path | Transport | Purpose |
|---|---|---|---|
| POST | `/search/track` | JSON | `ytsearch5:` via yt-dlp flat-playlist, returns 5 candidates |
| POST | `/search/collection` | JSON | playlist search or direct URL passthrough |
| GET | `/download/track` | SSE | single track — real progress bar, ABORT supported |
| GET | `/download/collection` | SSE | album/playlist with `DLPROG\|` line parsing |
| GET | `/` | JSON | health check |

`id` in every request/response is the YouTube `webpage_url` — obtained at search time, passed back at download time.

### Critical yt-dlp constraint

`YT_DLP_BASE` in `server.py` contains flags ported verbatim from the user's working CLI script. **Do not remove or reorder these flags** — without `--cookies`, `--js-runtimes node`, and `--remote-components ejs:github`, YouTube currently refuses to serve audio.

### Machine-specific config (top of `server.py`)

```python
FFMPEG   = os.path.expanduser("~/.spotdl/ffmpeg.exe")  # path to ffmpeg binary
COOKIES  = <dir of server.py>/www.youtube.com_cookies.txt  # must exist
OUTPUT_DIR = "./Downloads"  # relative to backend/ — prefer absolute path
```

### Frontend design system (`src/index.css`)

Tailwind v4 with CSS custom properties for theming. Dark mode toggled by adding/removing `.dark` on `<html>`. All design tokens:

- `--color-text-heading` / `--color-text-body` — foreground
- `--color-page-bg` / `--color-card-bg` — background layers
- `--color-border-default` — borders
- `--color-btn-primary-*` — the single accent (inverted in dark mode)
- `.bg-grid` — decorative dot-grid background

Strict monochrome: no colored accents; status feedback via weight/opacity only.

### i18n (`src/App.jsx`)

Two-language support (RU / EN). Toggle button in the header, between the theme toggle and GET STARTED.

- `translations` — plain object defined **outside** the component, keyed by `"ru"` / `"en"`, each containing all UI string keys.
- `lang` state — initialised from `localStorage` (`"ru"` default), persisted on change.
- `t(key)` helper — defined inside the component; looks up `translations[lang][key]`.
- When adding new UI strings: add to both `en` and `ru` blocks in `translations`, then use `{t("key")}` in JSX.

### Known issues

| Symptom | Cause |
|---|---|
| Large playlists (30+ tracks) not tested | SSE stream may timeout or subprocess may hang; unknown behaviour |

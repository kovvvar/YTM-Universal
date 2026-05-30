import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Link as LinkIcon, 
  Music, 
  Download, 
  Sun, 
  Moon, 
  FolderOpen, 
  Disc,
  Layers,
  FolderClosed,
  Check,
  AlertCircle
} from "lucide-react";

// Custom inline GitHub icon (matching Lucide style) as brand icons are deprecated in modern Lucide
const Github = ({ size = 15, ...props }) => (
  <svg 
    width={size}
    height={size}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// ============================================================================
// API INTEGRATION STUBS
//
// Documented REST & SSE Endpoints for YTM Universal Flask Backend:
//
// 1. POST /search/track
//    Request body: { artist: string, title: string }
//    Response:     { results: [ { id: string, title: string, artist: string, duration: string, cover: string } ] }
//
// 2. POST /search/collection
//    Request body: { query: string, type: 'album' | 'playlist' }
//    Response:     { results: [ { id: string, title: string, artist: string, trackCount: number, type: 'album' | 'playlist' } ] }
//
// 3. POST /download/track
//    Request body: { id: string, savePath: string }
//    Response:     { status: 'SUCCESS' | 'FAILED', filePath: string }
//
// 4. GET /download/collection?id=...&type=...&savePath=...
//    Server-Sent Events (SSE) Stream
//    Content-Type: text/event-stream
//    Event payload format (JSON string per event):
//      { current: number, total: number, title: string, percent: number, done: boolean, status: 'FETCHING' | 'DOWNLOADING' | 'DONE' | 'FAILED' }
// ============================================================================

const API_BASE = "http://localhost:5000";

/**
 * Searches YouTube for a track by artist name and track title.
 * Endpoint: POST /search/track
 */
export async function searchTracks(artist, title) {
  const response = await fetch(`${API_BASE}/search/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artist, title })
  });
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
}

/**
 * Searches YouTube for a playlist or album by query or URL.
 * Endpoint: POST /search/collection
 */
export async function searchCollections(query, type) {
  const response = await fetch(`${API_BASE}/search/collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, type })
  });
  if (!response.ok) throw new Error('Collection search failed');
  return await response.json();
}

/**
 * Downloads a single track to the server path.
 * Endpoint: GET /download/track?id=...&savePath=...
 */
export function downloadTrack(id, savePath, onProgress, onDone, onError) {
  const es = new EventSource(
    `${API_BASE}/download/track?id=${encodeURIComponent(id)}&savePath=${encodeURIComponent(savePath)}`
  );
  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
      if (data.done) {
        es.close();
        onDone(data.filePath);
      }
    } catch (err) {
      es.close();
      onError(err);
    }
  };
  es.onerror = (err) => {
    es.close();
    onError(err);
  };
  return es;
}

/**
 * Downloads an album or playlist using Server-Sent Events for progress tracking.
 * Endpoint: GET /download/collection?id=...&type=...&savePath=...
 */
export function downloadCollection(id, type, savePath, onProgress, onDone, onError) {
  const es = new EventSource(`${API_BASE}/download/collection?id=${encodeURIComponent(id || "")}&type=${encodeURIComponent(type || "")}&savePath=${encodeURIComponent(savePath || "")}`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onProgress(data);
      if (data.done) {
        es.close();
        onDone(data.filePath || savePath);
      }
    } catch (err) {
      es.close();
      onError(err);
    }
  };

  es.onerror = (err) => {
    es.close();
    onError(err);
  };

  return es; // Returns reference so the UI can close it if download is aborted
}

const translations = {
  en: {
    nav_features: "FEATURES",
    nav_console: "CONSOLE",
    nav_api: "API SCHEMA",
    hero_badge: "v1.0 · Free & open source",
    hero_title: "Download any track.",
    hero_subtitle: "Instantly.",
    hero_desc: "A sleek, high-fidelity developer terminal dashboard for YouTube Music. Download tracks, complete albums, or curated playlists in high-definition MP3 format with artwork and structural ID3 tags fully embedded.",
    tab_track: "01 — TRACK",
    tab_album: "02 — ALBUM",
    tab_playlist: "03 — PLAYLIST",
    label_artist: "Artist name",
    placeholder_artist: "e.g. The Weeknd",
    label_title: "Track title",
    placeholder_title: "e.g. After Hours",
    btn_search: "SEARCH",
    btn_parse: "PARSE",
    btn_download: "DOWNLOAD",
    btn_download_all: "DOWNLOAD ALL",
    btn_get_started: "GET STARTED",
    btn_abort: "ABORT DOWNLOAD",
    btn_reset: "[ ESC ] RESET CONSOLE",
    btn_apply: "APPLY",
    results_track: "YouTube Music Match Results",
    results_collection: "Matches Found in Metadata",
    tracks_count: "Tracks",
    label_album_query: "YouTube Album Link / Query",
    label_playlist_query: "YouTube Playlist Link / Query",
    placeholder_album: "Paste album URL or search by album query...",
    placeholder_playlist: "Paste playlist URL or search playlist name...",
    status_label: "STATUS:",
    status_done: "DONE",
    status_failed: "FAILED",
    status_ready: "READY",
    log_fetching_track: "Fetching audio payload and writing metadata tags...",
    log_fetching_collection_prefix: "Fetching",
    log_done_prefix: "DONE:",
    log_failed_prefix: "FAILED:",
    save_dir_label: "Default write directory:",
    features_tag: "01 — STACK FEATURES",
    features_heading: "Engineered for audio fidelity.",
    features_heading_dim: "Purely technical.",
    feat1_tag: "01 — SEARCH TRACKS",
    feat1_title: "Search any source",
    feat1_desc: "Direct API searches map YouTube Music titles, tracks, and metadata matches to locate high-fidelity streams.",
    feat2_tag: "02 — BULK DOWNLOADS",
    feat2_title: "Download by link",
    feat2_desc: "Supports playlists or albums. Pass the direct YouTube URL, parse the matching content, and trigger automated sequential folder sorting.",
    feat3_tag: "03 — ENHANCED ENCODING",
    feat3_title: "Fast & clean",
    feat3_desc: "Extracts high bit-rate files, embeds ID3 tags, and embeds full-resolution cover art directly within target MP3 containers.",
    docs_tag: "02 — LOCAL SCHEMAS",
    docs_heading: "REST & SSE Interfaces.",
    docs_heading_dim: "Exposed.",
    footer_desc: "High fidelity metadata-oriented YouTube Music archiver. Purely local frontend client configuration.",
    footer_product: "PRODUCT",
    footer_console: "Client Console",
    footer_engine: "Core Engine",
    footer_endpoints: "Endpoints API",
    footer_community: "COMMUNITY",
    footer_github: "GitHub Repository",
    footer_ytdlp: "yt-dlp Documentation",
    footer_flask: "Flask Core",
    footer_license: "YTM UNIVERSAL. DISTRIBUTED UNDER MIT.",
  },
  ru: {
    nav_features: "ВОЗМОЖНОСТИ",
    nav_console: "КОНСОЛЬ",
    nav_api: "API СХЕМА",
    hero_badge: "v1.0 · Бесплатно и открыто",
    hero_title: "Скачай любой трек.",
    hero_subtitle: "Мгновенно.",
    hero_desc: "Минималистичный терминал-дашборд для YouTube Music. Скачивайте треки, альбомы и плейлисты в формате MP3 с обложками и тегами ID3.",
    tab_track: "01 — ТРЕК",
    tab_album: "02 — АЛЬБОМ",
    tab_playlist: "03 — ПЛЕЙЛИСТ",
    label_artist: "Исполнитель",
    placeholder_artist: "напр. The Weeknd",
    label_title: "Название трека",
    placeholder_title: "напр. After Hours",
    btn_search: "ПОИСК",
    btn_parse: "НАЙТИ",
    btn_download: "СКАЧАТЬ",
    btn_download_all: "СКАЧАТЬ ВСЁ",
    btn_get_started: "НАЧАТЬ",
    btn_abort: "ОТМЕНИТЬ ЗАГРУЗКУ",
    btn_reset: "[ ESC ] СБРОСИТЬ",
    btn_apply: "ПРИМЕНИТЬ",
    results_track: "Результаты поиска YouTube Music",
    results_collection: "Найденные совпадения",
    tracks_count: "треков",
    label_album_query: "Ссылка или запрос на альбом YouTube",
    label_playlist_query: "Ссылка или запрос на плейлист YouTube",
    placeholder_album: "Вставьте ссылку на альбом или введите запрос...",
    placeholder_playlist: "Вставьте ссылку на плейлист или введите название...",
    status_label: "СТАТУС:",
    status_done: "ГОТОВО",
    status_failed: "ОШИБКА",
    status_ready: "ОЖИДАНИЕ",
    log_fetching_track: "Загружаем аудио и записываем теги метаданных...",
    log_fetching_collection_prefix: "Загружаем",
    log_done_prefix: "ГОТОВО:",
    log_failed_prefix: "ОШИБКА:",
    save_dir_label: "Папка для сохранения:",
    features_tag: "01 — ВОЗМОЖНОСТИ",
    features_heading: "Инструмент для качественного звука.",
    features_heading_dim: "Технично.",
    feat1_tag: "01 — ПОИСК ТРЕКОВ",
    feat1_title: "Поиск по любому источнику",
    feat1_desc: "API-поиск находит треки, исполнителей и метаданные YouTube Music для точного определения высококачественного потока.",
    feat2_tag: "02 — МАССОВАЯ ЗАГРУЗКА",
    feat2_title: "Скачивание по ссылке",
    feat2_desc: "Поддерживаются плейлисты и альбомы. Вставьте ссылку YouTube, получите содержимое и запустите автоматическую сортировку по папкам.",
    feat3_tag: "03 — ОБРАБОТКА ЗВУКА",
    feat3_title: "Быстро и чисто",
    feat3_desc: "Извлекает файлы с высоким битрейтом, встраивает теги ID3 и обложку в полном разрешении прямо в MP3-контейнер.",
    docs_tag: "02 — ЛОКАЛЬНЫЕ СХЕМЫ",
    docs_heading: "REST и SSE интерфейсы.",
    docs_heading_dim: "Открыто.",
    footer_desc: "Архиватор YouTube Music с высоким качеством звука и поддержкой метаданных. Полностью локальный клиент.",
    footer_product: "ПРОДУКТ",
    footer_console: "Консоль клиента",
    footer_engine: "Движок",
    footer_endpoints: "Эндпоинты API",
    footer_community: "СООБЩЕСТВО",
    footer_github: "GitHub репозиторий",
    footer_ytdlp: "Документация yt-dlp",
    footer_flask: "Flask",
    footer_license: "YTM UNIVERSAL. РАСПРОСТРАНЯЕТСЯ ПОД MIT.",
  }
};

// Decorative point cloud waveform component
const PointCloudWaveform = () => {
  const dots = [];
  const rows = 9;
  const cols = 22;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 30 + c * 20;
      const y = 50 + r * 15 + Math.sin((c + r) * 0.4) * 15;
      const opacity = (1 - r / rows) * (1 - Math.abs(c - cols / 2) / (cols / 2)) * 0.35;
      dots.push(
        <circle 
          key={`${r}-${c}`} 
          cx={x} 
          cy={y} 
          r={1.2} 
          className="fill-text-heading" 
          opacity={opacity} 
        />
      );
    }
  }
  return (
    <svg viewBox="0 0 500 220" className="w-full h-full opacity-30 dark:opacity-20 transition-opacity duration-300" fill="none">
      {dots}
    </svg>
  );
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved || "dark";
  });

  // Language state
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("lang");
    return saved || "ru";
  });

  // Track root theme toggles
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Track language persist
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const toggleLang = () => {
    setLang(prev => prev === "ru" ? "en" : "ru");
  };

  const t = (key) => translations[lang][key] ?? key;

  // Active Mode (track | album | playlist)
  const [activeMode, setActiveMode] = useState("track");
  const [savePath, setSavePath] = useState(() => {
    return localStorage.getItem("ytm_save_path") || "D:\\Downloads\\";
  });

  // Track Mode States
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [trackResults, setTrackResults] = useState([]);
  const [isSearchingTracks, setIsSearchingTracks] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Album/Playlist Mode States
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionResults, setCollectionResults] = useState([]);
  const [isSearchingCollections, setIsSearchingCollections] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  // General Download Status States
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // { current, total, title, percent, done, status }
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState("");
  const [downloadErrorMessage, setDownloadErrorMessage] = useState("");
  
  // Keep SSE connection reference
  const activeSseRef = useRef(null);

  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkTimerRef = useRef(null);

  // Fetch default save path on load if not already customized in localStorage
  useEffect(() => {
    const savedPath = localStorage.getItem("ytm_save_path");
    if (!savedPath) {
      const fetchDefaultPath = async () => {
        try {
          const response = await fetch(`${API_BASE}/config/output-path`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.defaultPath) {
              setSavePath(data.defaultPath);
            }
          }
        } catch (error) {
          console.error("Failed to fetch default path from backend:", error);
        }
      };
      fetchDefaultPath();
    }
  }, []);

  // Cleanup checkmark timer on unmount
  useEffect(() => {
    return () => {
      if (checkmarkTimerRef.current) {
        clearTimeout(checkmarkTimerRef.current);
      }
    };
  }, []);

  const handleApplySavePath = () => {
    localStorage.setItem("ytm_save_path", savePath);
    setShowCheckmark(true);
    
    if (checkmarkTimerRef.current) {
      clearTimeout(checkmarkTimerRef.current);
    }
    
    checkmarkTimerRef.current = setTimeout(() => {
      setShowCheckmark(false);
      checkmarkTimerRef.current = null;
    }, 2000);
  };

  // Handle Tab Swapping - clear states
  const handleModeSwap = (mode) => {
    setActiveMode(mode);
    setSelectedTrack(null);
    setTrackResults([]);
    setSelectedCollection(null);
    setCollectionResults([]);
    setCollectionQuery("");
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    // Close any active SSE streams
    if (activeSseRef.current) {
      activeSseRef.current.close();
      activeSseRef.current = null;
    }
    setIsDownloading(false);
    setDownloadProgress(null);
  };

  // Track Search Handler
  const handleTrackSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!artist.trim() && !title.trim()) return;
    
    setIsSearchingTracks(true);
    setSelectedTrack(null);
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    setTrackResults([]);

    try {
      const data = await searchTracks(artist, title);
      setTrackResults(data.results);
    } catch (err) {
      setDownloadErrorMessage("SEARCH FAILED");
    } finally {
      setIsSearchingTracks(false);
    }
  };

  // Collection Search Handler
  const handleCollectionSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!collectionQuery.trim()) return;

    setIsSearchingCollections(true);
    setSelectedCollection(null);
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    setCollectionResults([]);

    try {
      const data = await searchCollections(collectionQuery, activeMode);
      setCollectionResults(data.results);
    } catch (err) {
      setDownloadErrorMessage("SEARCH FAILED");
    } finally {
      setIsSearchingCollections(false);
    }
  };

  // Track Download Trigger
  const triggerTrackDownload = (track) => {
    setIsDownloading(true);
    setDownloadProgress({ percent: 0, title: "", done: false, status: "FETCHING" });
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    if (activeSseRef.current) activeSseRef.current.close();

    const es = downloadTrack(
      track.id,
      savePath,
      (progress) => {
        setDownloadProgress({ ...progress, status: "DOWNLOADING" });
      },
      (filePath) => {
        setDownloadProgress({ percent: 100, done: true, status: "DONE" });
        setDownloadSuccessMessage(`SAVED TO ${(filePath || savePath).toUpperCase()}`);
        setIsDownloading(false);
        activeSseRef.current = null;
      },
      () => {
        setDownloadProgress(null);
        setDownloadErrorMessage("DOWNLOAD FAILED");
        setIsDownloading(false);
        activeSseRef.current = null;
      }
    );
    activeSseRef.current = es;
  };

  // Collection Download Trigger
  const triggerCollectionDownload = (collection) => {
    setIsDownloading(true);
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    setDownloadProgress({
      current: 0,
      total: collection.trackCount || 8,
      title: "Establishing stream...",
      percent: 0,
      done: false,
      status: "FETCHING"
    });

    // Close any hanging stream
    if (activeSseRef.current) {
      activeSseRef.current.close();
    }

    const sse = downloadCollection(
      collection.id,
      collection.type,
      savePath,
      (progress) => {
        // Progress callback
        setDownloadProgress(progress);
      },
      (savedFolder) => {
        // Done callback
        setDownloadSuccessMessage(`SAVED TO ${savedFolder.toUpperCase()}`);
        setIsDownloading(false);
        activeSseRef.current = null;
      },
      (err) => {
        // Error callback
        setDownloadProgress(null);
        setDownloadErrorMessage("STREAM FAILURE");
        setIsDownloading(false);
        activeSseRef.current = null;
      }
    );

    activeSseRef.current = sse;
  };

  // Cancel running downloads
  const handleAbortDownload = () => {
    if (activeSseRef.current) {
      activeSseRef.current.close();
      activeSseRef.current = null;
    }
    setIsDownloading(false);
    setDownloadProgress(null);
    setDownloadErrorMessage("ABORTED");
  };

  // Keyboard hooks for ESC or clearing console
  const handleConsoleReset = () => {
    setSelectedTrack(null);
    setTrackResults([]);
    setSelectedCollection(null);
    setCollectionResults([]);
    setDownloadSuccessMessage("");
    setDownloadErrorMessage("");
    setDownloadProgress(null);
    setArtist("");
    setTitle("");
    setCollectionQuery("");
  };

  const consoleRef = useRef(null);
  const handleGetStartedClick = () => {
    consoleRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-bg-page text-text-body transition-colors duration-300 bg-grid selection:bg-text-heading selection:text-bg-page overflow-x-hidden">
      
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border-default bg-bg-page/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-8 h-8 rounded-[6px] border border-text-heading flex items-center justify-center bg-text-heading/5">
              <div className="w-3.5 h-3.5 border-[1.5px] border-text-heading rounded-[2px]" />
            </div>
            <span className="font-sans font-bold tracking-tight text-text-heading text-lg">
              YTM Universal
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-widest font-medium">
            <a href="#features" className="hover:text-text-heading transition-colors">{t("nav_features")}</a>
            <a href="#console" className="hover:text-text-heading transition-colors">{t("nav_console")}</a>
            <a href="#docs" className="hover:text-text-heading transition-colors">{t("nav_api")}</a>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button 
              type="button"
              onClick={toggleTheme} 
              className="p-2 rounded-[8px] border border-border-default hover:bg-text-heading/5 transition-colors duration-200 text-text-heading flex items-center justify-center cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={15} className="stroke-current" /> : <Moon size={15} className="stroke-current" />}
            </button>

            {/* Language Toggle Button */}
            <button
              type="button"
              onClick={toggleLang}
              className="p-2 rounded-[8px] border border-border-default hover:bg-text-heading/5 transition-colors duration-200 text-text-heading font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              aria-label="Toggle language"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
            
            {/* Primary CTA button */}
            <button 
              type="button"
              onClick={handleGetStartedClick}
              className="px-4 py-2 text-xs font-mono uppercase tracking-widest font-semibold bg-btn-primary-bg text-btn-primary-text rounded-[8px] hover:bg-btn-primary-hover hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {t("btn_get_started")}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        
        {/* Decorative Waveform Grid */}
        <div className="absolute right-0 top-12 w-[380px] h-[180px] pointer-events-none hidden lg:block select-none">
          <PointCloudWaveform />
        </div>

        {/* Pill status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-border-default bg-card-bg/40 rounded-full mb-8 select-none font-mono text-[9px] uppercase tracking-widest text-text-heading font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-text-heading animate-pulse opacity-90" />
          <span>{t("hero_badge")}</span>
        </div>

        {/* Two-Tone Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-text-heading max-w-4xl mb-6 leading-[1.05] select-none">
          {t("hero_title")} <span className="opacity-35 font-normal">{t("hero_subtitle")}</span>
        </h1>

        {/* Hero description */}
        <p className="text-sm md:text-base max-w-2xl text-text-body font-normal leading-relaxed mb-12 opacity-85">
          {t("hero_desc")}
        </p>

        {/* 3. DOWNLOAD CONSOLE */}
        <div 
          ref={consoleRef}
          id="console"
          className="w-full max-w-3xl border border-border-default bg-card-bg rounded-[14px] shadow-sm overflow-hidden text-left transition-colors duration-300 relative z-10"
        >
          
          {/* Console Header Tabs */}
          <div className="flex border-b border-border-default select-none bg-text-heading/[0.01]">
            <button
              type="button"
              onClick={() => handleModeSwap("track")}
              className={`flex-1 py-4 text-center font-mono text-[10px] uppercase tracking-widest font-bold border-r border-border-default transition-all duration-200 cursor-pointer ${
                activeMode === "track" 
                  ? "bg-bg-page text-text-heading" 
                  : "text-text-body/60 hover:text-text-heading hover:bg-text-heading/[0.02]"
              }`}
            >
              {t("tab_track")}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwap("album")}
              className={`flex-1 py-4 text-center font-mono text-[10px] uppercase tracking-widest font-bold border-r border-border-default transition-all duration-200 cursor-pointer ${
                activeMode === "album" 
                  ? "bg-bg-page text-text-heading" 
                  : "text-text-body/60 hover:text-text-heading hover:bg-text-heading/[0.02]"
              }`}
            >
              {t("tab_album")}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwap("playlist")}
              className={`flex-1 py-4 text-center font-mono text-[10px] uppercase tracking-widest font-bold transition-all duration-200 cursor-pointer ${
                activeMode === "playlist" 
                  ? "bg-bg-page text-text-heading" 
                  : "text-text-body/60 hover:text-text-heading hover:bg-text-heading/[0.02]"
              }`}
            >
              {t("tab_playlist")}
            </button>
          </div>

          <div className="p-6 md:p-8">
            {/* MODE 1: TRACK VIEW */}
            {activeMode === "track" && (
              <div className="space-y-6">
                <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5 text-text-heading font-semibold">{t("label_artist")}</label>
                    <input 
                      type="text" 
                      placeholder={t("placeholder_artist")}
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      disabled={isDownloading}
                      className="w-full bg-text-heading/[0.02] border border-border-default rounded-[8px] px-3.5 py-2.5 text-xs text-text-heading placeholder:text-text-body/45 focus:outline-none focus:border-text-heading/40 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5 text-text-heading font-semibold">{t("label_title")}</label>
                    <input 
                      type="text" 
                      placeholder={t("placeholder_title")}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isDownloading}
                      className="w-full bg-text-heading/[0.02] border border-border-default rounded-[8px] px-3.5 py-2.5 text-xs text-text-heading placeholder:text-text-body/45 focus:outline-none focus:border-text-heading/40 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={handleTrackSearch}
                      disabled={isSearchingTracks || isDownloading || (!artist.trim() && !title.trim())}
                      className="w-full h-[41px] flex items-center justify-center gap-2 bg-text-heading text-bg-page font-mono text-[10px] font-bold uppercase tracking-widest rounded-[8px] hover:opacity-90 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {isSearchingTracks ? (
                        <div className="w-3.5 h-3.5 border-2 border-bg-page border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Search size={12} className="stroke-current" />
                          <span>{t("btn_search")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* TRACK RESULTS */}
                {trackResults.length > 0 && (
                  <div className="border border-border-default rounded-[10px] overflow-hidden bg-text-heading/[0.005] select-none">
                    <div className="px-4 py-2 border-b border-border-default font-mono text-[8px] uppercase tracking-widest opacity-40">
                      {t("results_track")}
                    </div>
                    <div className="divide-y divide-border-default">
                      {trackResults.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (!isDownloading) setSelectedTrack(item);
                          }}
                          className={`flex items-center justify-between p-3.5 hover:bg-text-heading/[0.02] transition-colors cursor-pointer ${
                            selectedTrack?.id === item.id ? "bg-text-heading/[0.03]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Vinyl Art Placeholder */}
                            <div className="w-10 h-10 rounded-[6px] border border-border-default bg-text-heading/[0.03] flex items-center justify-center text-text-body/30">
                              <Disc size={18} className="stroke-current" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-heading">{item.title}</div>
                              <div className="text-[10px] opacity-60 mt-0.5">{item.artist} · {item.duration}</div>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTrack(item);
                              triggerTrackDownload(item);
                            }}
                            disabled={isDownloading}
                            className={`px-3 py-1.5 rounded-[6px] font-mono text-[9px] uppercase tracking-widest font-bold border transition-all ${
                              selectedTrack?.id === item.id 
                                ? "bg-text-heading text-bg-page border-text-heading" 
                                : "bg-transparent text-text-heading border-border-default hover:bg-text-heading/5"
                            } disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
                          >
                            {t("btn_download")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2 & 3: ALBUM / PLAYLIST VIEWS */}
            {(activeMode === "album" || activeMode === "playlist") && (
              <div className="space-y-6">
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block font-mono text-[9px] uppercase tracking-widest mb-1.5 text-text-heading font-semibold">
                      YouTube {activeMode === "album" ? "Album" : "Playlist"} Link / Query
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-body/40">
                        <LinkIcon size={13} className="stroke-current" />
                      </div>
                      <input 
                        type="text" 
                        placeholder={
                          activeMode === "album" 
                            ? "Paste album URL or search by album query..." 
                            : "Paste playlist URL or search playlist name..."
                        }
                        value={collectionQuery}
                        onChange={(e) => setCollectionQuery(e.target.value)}
                        disabled={isDownloading}
                        className="w-full bg-text-heading/[0.02] border border-border-default rounded-[8px] pl-10 pr-3.5 py-2.5 text-xs text-text-heading placeholder:text-text-body/45 focus:outline-none focus:border-text-heading/40 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleCollectionSearch}
                      disabled={isSearchingCollections || isDownloading || !collectionQuery.trim()}
                      className="w-full md:w-auto h-[41px] px-6 flex items-center justify-center gap-2 bg-text-heading text-bg-page font-mono text-[10px] font-bold uppercase tracking-widest rounded-[8px] hover:opacity-90 active:scale-[0.99] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {isSearchingCollections ? (
                        <div className="w-3.5 h-3.5 border-2 border-bg-page border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Search size={12} className="stroke-current" />
                          <span>PARSE</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* COLLECTION RESULTS */}
                {collectionResults.length > 0 && (
                  <div className="border border-border-default rounded-[10px] overflow-hidden bg-text-heading/[0.005] select-none">
                    <div className="px-4 py-2 border-b border-border-default font-mono text-[8px] uppercase tracking-widest opacity-40">
                      Matches Found in Metadata
                    </div>
                    <div className="divide-y divide-border-default">
                      {collectionResults.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (!isDownloading) setSelectedCollection(item);
                          }}
                          className={`flex items-center justify-between p-3.5 hover:bg-text-heading/[0.02] transition-colors cursor-pointer ${
                            selectedCollection?.id === item.id ? "bg-text-heading/[0.03]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Collection Folder/Stack Icon */}
                            <div className="w-10 h-10 rounded-[6px] border border-border-default bg-text-heading/[0.03] flex items-center justify-center text-text-body/30">
                              {item.type === "album" ? <Layers size={18} className="stroke-current" /> : <FolderClosed size={18} className="stroke-current" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-heading">{item.title}</div>
                              <div className="text-[10px] opacity-60 mt-0.5">
                                {item.artist || ""}
                                {item.artist && (item.trackCount !== null && item.trackCount !== undefined) ? " · " : ""}
                                {item.trackCount !== null && item.trackCount !== undefined ? `${item.trackCount} ${t("tracks_count")}` : ""}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedCollection(item);
                              triggerCollectionDownload(item);
                            }}
                            disabled={isDownloading}
                            className={`px-3 py-1.5 rounded-[6px] font-mono text-[9px] uppercase tracking-widest font-bold border transition-all ${
                              selectedCollection?.id === item.id 
                                ? "bg-text-heading text-bg-page border-text-heading" 
                                : "bg-transparent text-text-heading border-border-default hover:bg-text-heading/5"
                            } disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
                          >
                            {t("btn_download_all")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONSOLE CONSOLE STATUS FOOTER (PROGRESS PANEL) */}
            {(isDownloading || downloadProgress || downloadSuccessMessage || downloadErrorMessage) && (
              <div className="mt-8 pt-6 border-t border-border-default space-y-4">
                
                {/* Console Log status tags */}
                <div className="flex items-center justify-between font-mono text-[9px] tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-heading">{t("status_label")}</span>
                    <span className="px-2 py-0.5 rounded-[3px] font-bold border border-border-default bg-text-heading/5 text-text-heading">
                      {downloadProgress?.status || (downloadSuccessMessage ? t("status_done") : downloadErrorMessage ? t("status_failed") : t("status_ready"))}
                    </span>
                  </div>

                  {downloadProgress && downloadProgress.percent !== undefined && (
                    <span className="font-bold text-text-heading opacity-80">{downloadProgress.percent}%</span>
                  )}
                </div>

                {/* Progress bar container (Strict Monochrome) */}
                {downloadProgress && (
                  <div className="w-full bg-text-heading/[0.04] border border-border-default rounded-[4px] h-2.5 overflow-hidden">
                    <div 
                      className="bg-text-heading h-full transition-all duration-300"
                      style={{ width: `${downloadProgress.percent || 0}%` }}
                    />
                  </div>
                )}

                {/* Console text log */}
                <div className="font-mono text-[10px] leading-relaxed select-none">
                  {isDownloading && downloadProgress && (
                    <div className="flex items-center gap-2 text-text-heading/80">
                      <div className="w-2 h-2 rounded-full border-[1.5px] border-text-heading border-t-transparent animate-spin inline-block" />
                      <span>
                        {activeMode === "track" 
                          ? t("log_fetching_track")
                          : `${t("log_fetching_collection_prefix")} ${downloadProgress.current}/${downloadProgress.total} — "${downloadProgress.title}"`
                        }
                      </span>
                    </div>
                  )}

                  {downloadSuccessMessage && (
                    <div className="flex items-start gap-2 text-text-heading">
                      <span className="font-bold uppercase flex-shrink-0">{t("log_done_prefix")}</span>
                      <span className="opacity-80 break-all">{downloadSuccessMessage}</span>
                    </div>
                  )}

                  {downloadErrorMessage && (
                    <div className="flex items-center gap-2 text-text-heading">
                      <span className="font-bold uppercase flex-shrink-0">{t("log_failed_prefix")}</span>
                      <span className="opacity-85">{downloadErrorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons while downloading */}
                {isDownloading && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAbortDownload();
                      }}
                      className="px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-widest font-bold border border-border-default rounded-[6px] hover:bg-text-heading/5 transition-all text-text-heading cursor-pointer"
                    >
                      {t("btn_abort")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clear/Reset shortcut buttons */}
            {(trackResults.length > 0 || collectionResults.length > 0 || downloadSuccessMessage || downloadErrorMessage) && !isDownloading && (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleConsoleReset();
                  }}
                  className="font-mono text-[9px] uppercase tracking-widest font-medium opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {t("btn_reset")}
                </button>
              </div>
            )}

            {/* Core target folder configuration */}
            <div className="mt-8 pt-5 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-text-body/50">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest flex-shrink-0 select-none">
                <FolderOpen size={11} className="stroke-current" />
                <span>{t("save_dir_label")}</span>
              </div>
              <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                <input 
                  type="text" 
                  value={savePath} 
                  onChange={(e) => setSavePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplySavePath();
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full bg-text-heading/[0.02] border border-border-default rounded-[6px] h-7 px-2.5 font-mono text-[10px] text-text-heading focus:outline-none focus:border-text-heading/40 transition-colors disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={handleApplySavePath}
                  disabled={isDownloading}
                  className="px-3 py-1 font-mono text-[9px] uppercase tracking-widest font-bold border border-border-default rounded-[6px] hover:bg-text-heading/5 transition-all text-text-heading disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center min-w-[85px] h-7 flex-shrink-0"
                >
                  {showCheckmark ? <Check size={11} className="stroke-current" /> : t("btn_apply")}
                </button>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 border-t border-border-default max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <span className="font-mono text-[10px] tracking-widest uppercase text-text-body/65 block mb-2">{t("features_tag")}</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-heading leading-tight">
            {t("features_heading")} <span className="opacity-35 font-normal">{t("features_heading_dim")}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="border border-border-default bg-card-bg/40 rounded-[14px] p-6.5 hover:shadow-sm hover:border-text-heading/20 transition-all select-none">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-body/50 block mb-6">{t("feat1_tag")}</span>
            <div className="text-text-heading mb-4 bg-text-heading/5 w-9 h-9 rounded-[8px] flex items-center justify-center">
              <Search size={16} className="stroke-current" />
            </div>
            <h3 className="text-sm font-bold text-text-heading mb-2">{t("feat1_title")}</h3>
            <p className="text-xs text-text-body/80 leading-relaxed font-normal">
              {t("feat1_desc")}
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-border-default bg-card-bg/40 rounded-[14px] p-6.5 hover:shadow-sm hover:border-text-heading/20 transition-all select-none">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-body/50 block mb-6">{t("feat2_tag")}</span>
            <div className="text-text-heading mb-4 bg-text-heading/5 w-9 h-9 rounded-[8px] flex items-center justify-center">
              <LinkIcon size={16} className="stroke-current" />
            </div>
            <h3 className="text-sm font-bold text-text-heading mb-2">{t("feat2_title")}</h3>
            <p className="text-xs text-text-body/80 leading-relaxed font-normal">
              {t("feat2_desc")}
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-border-default bg-card-bg/40 rounded-[14px] p-6.5 hover:shadow-sm hover:border-text-heading/20 transition-all select-none">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-body/50 block mb-6">{t("feat3_tag")}</span>
            <div className="text-text-heading mb-4 bg-text-heading/5 w-9 h-9 rounded-[8px] flex items-center justify-center">
              <Music size={16} className="stroke-current" />
            </div>
            <h3 className="text-sm font-bold text-text-heading mb-2">{t("feat3_title")}</h3>
            <p className="text-xs text-text-body/80 leading-relaxed font-normal">
              {t("feat3_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 5. API SCHEMA DOCUMENTATION BLOCK */}
      <section id="docs" className="py-20 border-t border-border-default max-w-6xl mx-auto px-6">
        <div className="mb-12">
          <span className="font-mono text-[10px] tracking-widest uppercase text-text-body/65 block mb-2">{t("docs_tag")}</span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-heading leading-tight">
            {t("docs_heading")} <span className="opacity-35 font-normal">{t("docs_heading_dim")}</span>
          </h2>
        </div>

        <div className="border border-border-default rounded-[14px] bg-card-bg/30 p-6 md:p-8 space-y-6 font-mono text-[11px] overflow-x-auto text-text-heading select-all">
          <div>
            <div className="text-text-body/45 font-bold uppercase mb-2">// 1. POST /search/track</div>
            <div className="bg-text-heading/[0.02] border border-border-default/40 rounded-[6px] p-3">
              <span className="font-bold">Payload:</span> {"{"} artist: string, title: string {"}"} <br />
              <span className="font-bold">Returns:</span> {"{"} results: [{"{"} id: string, title: string, artist: string, duration: string, cover: "vinyl" {"}"}] {"}"}
            </div>
          </div>

          <div>
            <div className="text-text-body/45 font-bold uppercase mb-2">// 2. POST /search/collection</div>
            <div className="bg-text-heading/[0.02] border border-border-default/40 rounded-[6px] p-3">
              <span className="font-bold">Payload:</span> {"{"} query: string, type: "album" | "playlist" {"}"} <br />
              <span className="font-bold">Returns:</span> {"{"} results: [{"{"} id: string, title: string, artist: string, trackCount: number, type: "album" | "playlist" {"}"}] {"}"}
            </div>
          </div>

          <div>
            <div className="text-text-body/45 font-bold uppercase mb-2">// 3. POST /download/track</div>
            <div className="bg-text-heading/[0.02] border border-border-default/40 rounded-[6px] p-3">
              <span className="font-bold">Payload:</span> {"{"} id: string, savePath: string {"}"} <br />
              <span className="font-bold">Returns:</span> {"{"} status: "SUCCESS" | "FAILED", filePath: string {"}"}
            </div>
          </div>

          <div>
            <div className="text-text-body/45 font-bold uppercase mb-2">// 4. GET /download/collection?id=...&amp;type=...&amp;savePath=...</div>
            <div className="bg-text-heading/[0.02] border border-border-default/40 rounded-[6px] p-3">
              <span className="font-bold">Interface:</span> Server-Sent Events (SSE) Client stream via EventSource <br />
              <span className="font-bold">Stream Event:</span> {"{"} current: number, total: number, title: string, percent: number, done: boolean, status: "FETCHING" | "DOWNLOADING" | "DONE" | "FAILED" {"}"}
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-border-default bg-text-heading/[0.005]">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10 text-xs">
          
          {/* Copyright/tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 select-none">
              <div className="w-6 h-6 rounded-[4px] border border-text-heading flex items-center justify-center bg-text-heading/5">
                <div className="w-2.5 h-2.5 border-[1px] border-text-heading rounded-[1px]" />
              </div>
              <span className="font-sans font-bold text-text-heading tracking-tight">
                YTM Universal
              </span>
            </div>
            <p className="text-text-body/75 max-w-sm font-normal">
              {t("footer_desc")}
            </p>
            <div className="font-mono text-[9px] text-text-body/45 uppercase tracking-wider">
              © {new Date().getFullYear()} {t("footer_license")}
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest font-semibold text-text-heading block mb-4">{t("footer_product")}</span>
            <ul className="space-y-3 font-normal text-text-body/80">
              <li><a href="#console" className="hover:text-text-heading transition-colors">{t("footer_console")}</a></li>
              <li><a href="#features" className="hover:text-text-heading transition-colors">{t("footer_engine")}</a></li>
              <li><a href="#docs" className="hover:text-text-heading transition-colors">{t("footer_endpoints")}</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest font-semibold text-text-heading block mb-4">{t("footer_community")}</span>
            <ul className="space-y-3 font-normal text-text-body/80">
              <li className="flex items-center gap-1.5">
                <Github size={11} className="stroke-current" />
                <a href="https://github.com/kovvvar/YTM-Universal" target="_blank" rel="noopener noreferrer" className="hover:text-text-heading transition-colors">{t("footer_github")}</a>
              </li>
              <li><a href="https://yt-dlp.org" target="_blank" rel="noopener noreferrer" className="hover:text-text-heading transition-colors">{t("footer_ytdlp")}</a></li>
              <li><a href="https://flask.palletsprojects.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-heading transition-colors">{t("footer_flask")}</a></li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}

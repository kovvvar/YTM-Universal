# YTM Universal — Project Handoff

> Передаточный документ для продолжения разработки в другой среде / с другой нейросетью.
> Содержит полный контекст: что за проект, архитектуру, контракт API, исходник бэкенда,
> решённые проблемы и список следующих шагов. Self-contained — можно скормить ИИ целиком.

---

## 0. Роли и среда разработки

### Разделение ответственности между нейросетями

Проект разрабатывается двумя отдельными нейросетями с чёткими зонами ответственности:

| Зона | Кто делает |
|---|---|
| `backend/server.py`, связка фронт↔бэкенд, инфраструктура, архитектурные советы | **Бэкенд-нейросеть** (Claude Code) |
| `src/App.jsx`, `src/index.css`, Vite/React/Tailwind, UI/UX | **Фронтенд-нейросеть** (отдельный инстанс) |

**Правила взаимодействия:**
- Бэкенд-нейросеть **не правит фронт-код самостоятельно**.
- Если нужна правка фронта — бэкенд-нейросеть формулирует ТЗ/промпт для фронтенд-нейросети.
- Фронтенд-нейросеть не правит `server.py` и не меняет флаги yt-dlp.

### Среда — Windows

- **ОС:** Windows 11, терминал PowerShell.
- **Путь проекта содержит пробел:** `d:\VS Code\YTM Tool\` — все команды с путями нужно заключать в кавычки.
- **ExecutionPolicy:** PowerShell по умолчанию блокирует `npm` (запускает `npm.ps1`). Решение: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` или вызывать `npm.cmd` явно. Батники через `cmd` обходят это автоматически.
- **Готовые батники:** `start_ytm.bat` (запуск обоих серверов + браузер) и `stop_ytm.bat` (остановка + освобождение портов 5000/5173). При переносе папки нужно обновить пути `ROOT`/`BACKEND` в `start_ytm.bat`.

---

## 1. Что это за проект

**YTM Universal** — десктопный музыкальный загрузчик с веб-интерфейсом.
- **Фронтенд:** одностраничный лендинг (Vite + React + Tailwind), премиальная dev-tool эстетика
  (вдохновлено Vercel / Linear / Raycast). Тёмная тема по умолчанию + переключатель на светлую.
  Строгий монохром: только чёрный / белый / серый, **без цветных акцентов**.
- **Бэкенд:** локальный Flask-сервер, оборачивает **yt-dlp** (через `subprocess`) и качает MP3
  с YouTube. Запускается на машине пользователя, не в облаке.
- **Связка:** фронт (`:5173` в dev) ↔ Flask (`:5000`) через HTTP/JSON, прогресс скачивания
  плейлистов/альбомов стримится через Server-Sent Events (SSE).

Назначение чисто личное/локальное. Реальная запись файлов на диск делается Python-бэкендом;
фронт только отправляет запросы и показывает статус.

---

## 2. Архитектура

```
Браузер (React UI, :5173 dev / :4173 prod)
        │  HTTP JSON  +  SSE
        ▼
Flask сервер (server.py, :5000)
        │  subprocess
        ▼
yt-dlp  ─►  ffmpeg  ─►  MP3 на диск
```

- Поиск трека/коллекции → синхронный `POST`, возвращает JSON со списком кандидатов.
- Скачивание трека → `GET` + **SSE**, реальный прогресс-бар, ABORT через `es.close()`.
- Скачивание альбома/плейлиста → `GET` + **SSE**, прогресс приходит построчно.
- `id` каждого результата = ссылка на YouTube (`webpage_url`). Фронт получает её при поиске
  и возвращает обратно при скачивании.

---

## 3. Стек

**Фронтенд**
- Vite (React, `@vitejs/plugin-react`)
- Tailwind CSS **v4** (`@tailwindcss/vite`)
- `lucide-react` — иконки (монохромные, `currentColor`)
- `@fontsource/onest` + `@fontsource/geist-mono` — шрифты (Onest для лендинга/текста, Geist Mono для UPPERCASE-лейблов)

**Бэкенд**
- Python 3 + Flask + flask-cors
- yt-dlp (как pip-пакет, вызывается `python -m yt_dlp`)
- ffmpeg (для извлечения/конвертации аудио)

---

## 4. Структура файлов

```
<ROOT>/                         ← папка фронта (где package.json)
├─ package.json
├─ vite.config.js               ← Vite + Tailwind v4 plugin (+ dev proxy, см. ниже)
├─ index.html                   ← title: "YTM Universal — High-Quality Music Downloader", class="dark"
├─ src/
│  ├─ main.jsx                  ← точка входа React
│  ├─ index.css                 ← Tailwind, шрифты, темы (:root / .dark), .bg-grid (точечная сетка)
│  └─ App.jsx                   ← ВСЁ приложение: лендинг + консоль + стабы API (~940 строк)
├─ backend/
│  ├─ server.py                 ← Flask-сервер (полный исходник в разделе 6)
│  └─ www.youtube.com_cookies.txt   ← cookies для yt-dlp (обязательно рядом с server.py)
├─ start_ytm.bat                ← запуск бэкенда + фронта в двух окнах + открыть браузер
└─ stop_ytm.bat                 ← остановка обоих + освобождение портов 5000/5173
```

> Исходный CLI-скрипт пользователя назывался `SpotifyMP3 Downlaoder.py` (с опечаткой в имени) —
> его логика yt-dlp перенесена в `server.py`. Сам CLI-скрипт больше не используется в связке.

---

## 5. Контракт API (точные формы JSON)

Базовый адрес: `http://localhost:5000`. На фронте — константа `API_BASE` в начале `App.jsx`.

### `POST /search/track`
```
body:    { "artist": "...", "title": "..." }
returns: { "results": [ { "id", "title", "artist", "duration", "cover" } ] }   // id = webpage_url
```

### `POST /search/collection`
```
body:    { "query": "...", "type": "album" | "playlist" }
returns: { "results": [ { "id", "title", "artist", "trackCount", "type" } ] }
         // artist и trackCount могут быть null (YouTube не отдаёт их в flat-выдаче)
         // если query начинается с http — возвращается как единственный результат
```

### `GET /download/track?id=...&savePath=...`  → Server-Sent Events
```
Каждое событие (JSON в data:):
  { "percent": number, "title": string, "done": false }
  { "percent": 100, "title": string, "done": true, "filePath": string }  // финальное
Поток завершается событием с "done": true.
Все query-параметры обязаны быть encodeURIComponent(...).
```

### `GET /config/output-path`
```
returns: { "defaultPath": "..." }   // абсолютный путь OUTPUT_DIR из server.py
```

### `GET /download/collection?id=...&type=...&savePath=...`  → Server-Sent Events
```
Каждое событие (JSON в data:):
  { "current", "total", "title", "percent", "done" }
Поток завершается событием с "done": true, после чего фронт делает es.close().
Все query-параметры обязаны быть encodeURIComponent(...) (savePath содержит пробелы/слэши).
```

---

## 6. Бэкенд — полный исходник `server.py`

> Состав флагов yt-dlp (`YT_DLP_BASE`) перенесён 1-в-1 из рабочего CLI-скрипта пользователя.
> **Не менять состав без необходимости:** без cookies / `--js-runtimes node` /
> `--remote-components ejs:github` YouTube сейчас не отдаёт аудио.

```python
"""
YTM Universal — Flask backend
=================================================================
Оборачивает твою yt-dlp логику из SpotifyMP3_Downloader.py в HTTP/JSON API,
которое ждёт фронтенд (Vite+React, http://localhost:5173).

Запуск:
    pip install flask flask-cors yt-dlp
    python server.py
    -> сервер на http://localhost:5000

Эндпоинты:
    POST /search/track         {artist,title}            -> {results:[{id,title,artist,duration,cover}]}
    POST /search/collection    {query,type}              -> {results:[{id,title,artist,trackCount,type}]}
    GET  /download/track?id=&savePath=                   -> Server-Sent Events {percent,title,done,filePath}
    GET  /download/collection?id=&type=&savePath=        -> Server-Sent Events {current,total,title,percent,done}
    GET  /config/output-path                             -> {defaultPath}

id = ссылка на YouTube (webpage_url). Фронт получает её в результатах поиска
и возвращает обратно при скачивании — сервер скармливает её yt-dlp.
"""

import os
import sys
import json
import urllib.parse
import subprocess

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

# ─────────────────────────────────────────────────────────────────
# КОНФИГ — проверь эти пути под свою машину (взято из твоего скрипта)
# ─────────────────────────────────────────────────────────────────
OUTPUT_DIR = "./Downloads"
FFMPEG = os.path.expanduser("~/.spotdl/ffmpeg.exe")
COOKIES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "www.youtube.com_cookies.txt")

# Базовые флаги yt-dlp для СКАЧИВАНИЯ — сохранены 1-в-1 из твоего скрипта.
# Не трогай состав без необходимости: без cookies/js-runtimes/remote-components
# YouTube сейчас не отдаёт аудио.
YT_DLP_BASE = [
    sys.executable, "-m", "yt_dlp",
    "--extract-audio",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "--embed-thumbnail",
    "--add-metadata",
    "--ffmpeg-location", FFMPEG,
    "--cookies", COOKIES,
    "--js-runtimes", "node",
    "--remote-components", "ejs:github",
]

app = Flask(__name__)
CORS(app)  # разрешаем запросы с localhost:5173 (dev-сервер Vite)


def _clean(value):
    """yt-dlp печатает 'NA' для отсутствующих полей -> превращаем в None."""
    if value is None:
        return None
    value = value.strip()
    return None if value in ("", "NA") else value


def _ensure_dir(path):
    path = path or OUTPUT_DIR
    os.makedirs(path, exist_ok=True)
    return path


@app.route("/search/track", methods=["POST"])
def search_track():
    data = request.get_json(force=True) or {}
    artist = (data.get("artist") or "").strip()
    title = (data.get("title") or "").strip()
    if not artist or not title:
        return jsonify({"results": [], "error": "artist and title are required"}), 400
    query = f"{artist} - {title}"
    proc = subprocess.run(
        [sys.executable, "-m", "yt_dlp",
         "--flat-playlist",
         "--print", "%(title)s\t%(uploader)s\t%(duration_string)s\t%(thumbnail)s\t%(webpage_url)s",
         "--quiet", f"ytsearch5:{query}"],
        capture_output=True, text=True
    )
    results = []
    for line in proc.stdout.strip().splitlines():
        parts = line.split("\t", 4)
        if len(parts) == 5 and parts[4].startswith("http"):
            results.append({
                "id": parts[4],
                "title": _clean(parts[0]),
                "artist": _clean(parts[1]),
                "duration": _clean(parts[2]),
                "cover": _clean(parts[3]),
            })
    return jsonify({"results": results})


@app.route("/search/collection", methods=["POST"])
def search_collection():
    data = request.get_json(force=True) or {}
    query = (data.get("query") or "").strip()
    ctype = (data.get("type") or "playlist").strip()
    if not query:
        return jsonify({"results": [], "error": "query is required"}), 400
    if query.startswith("http"):
        return jsonify({"results": [{
            "id": query, "title": query, "artist": None,
            "trackCount": None, "type": ctype,
        }]})
    search_url = (
        "https://www.youtube.com/results"
        f"?search_query={urllib.parse.quote(query)}"
        "&sp=EgIQAw%3D%3D"
    )
    proc = subprocess.run(
        [sys.executable, "-m", "yt_dlp",
         "--flat-playlist", "--playlist-end", "5",
         "--print", "%(title)s\t%(webpage_url)s", "--quiet", search_url],
        capture_output=True, text=True
    )
    results = []
    for line in proc.stdout.strip().splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2 and parts[1].startswith("http"):
            results.append({
                "id": parts[1],
                "title": _clean(parts[0]),
                "artist": None,
                "trackCount": None,
                "type": ctype,
            })
    return jsonify({"results": results})


@app.route("/download/track", methods=["GET"])
def download_track():
    url = (request.args.get("id") or "").strip()
    folder = _ensure_dir((request.args.get("savePath") or "").strip())

    output = os.path.join(folder, "%(title)s.%(ext)s")
    progress_tmpl = "download:DLPROG|%(progress._percent_str)s|%(info.title)s"

    cmd = [
        *YT_DLP_BASE, url,
        "--output", output,
        "--newline",
        "--progress-template", progress_tmpl,
        "--print", "after_move:filepath",
    ]

    def event_stream():
        def sse(payload):
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        if not url.startswith("http"):
            yield sse({"percent": 0, "title": "invalid id", "done": True, "filePath": None})
            return

        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )

        last_title = ""
        last_file_path = None

        for raw in iter(proc.stdout.readline, ""):
            line = raw.strip()
            if not line:
                continue
            if line.startswith("DLPROG|"):
                try:
                    _, pct, title = line.split("|", 2)
                    percent = float(pct.replace("%", "").strip() or 0)
                    last_title = title.strip() or last_title
                    yield sse({"percent": percent, "title": last_title, "done": False})
                except (ValueError, IndexError):
                    continue
            elif not line.startswith("["):
                last_file_path = line

        proc.wait()
        yield sse({"percent": 100, "title": last_title, "done": True, "filePath": last_file_path})

    resp = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


@app.route("/download/collection", methods=["GET"])
def download_collection():
    url = (request.args.get("id") or "").strip()
    folder = _ensure_dir((request.args.get("savePath") or "").strip())

    output = os.path.join(folder, "%(playlist)s", "%(playlist_index)s - %(title)s.%(ext)s")
    progress_tmpl = (
        "download:DLPROG|%(progress._percent_str)s|%(info.title)s|"
        "%(info.playlist_index)s|%(info.n_entries)s"
    )
    cmd = [
        *YT_DLP_BASE, url,
        "--yes-playlist",
        "--output", output,
        "--newline",
        "--progress-template", progress_tmpl,
    ]

    def event_stream():
        def sse(payload):
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        if not url.startswith("http"):
            yield sse({"current": 0, "total": 0, "title": "invalid id",
                       "percent": 0, "done": True})
            return

        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )

        last = {"current": 0, "total": 0, "title": "", "percent": 0}
        for raw in iter(proc.stdout.readline, ""):
            line = raw.strip()
            if not line.startswith("DLPROG|"):
                continue
            try:
                _, pct, title, idx, total = line.split("|", 4)
                percent = float(pct.replace("%", "").strip() or 0)
                last = {
                    "current": int(idx) if idx.strip().isdigit() else last["current"],
                    "total": int(total) if total.strip().isdigit() else last["total"],
                    "title": title.strip() or last["title"],
                    "percent": percent,
                }
                yield sse({**last, "done": False})
            except (ValueError, IndexError):
                continue

        proc.wait()
        yield sse({**last, "percent": 100, "done": True})

    resp = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


@app.route("/config/output-path", methods=["GET"])
def config_output_path():
    return jsonify({"defaultPath": os.path.abspath(OUTPUT_DIR)})


@app.route("/")
def health():
    return jsonify({"service": "YTM Universal backend", "status": "ok"})


if __name__ == "__main__":
    # threaded=True — чтобы долгое скачивание не блокировало другие запросы
    app.run(host="127.0.0.1", port=5000, threaded=True)
```

**Конфиг, который надо проверять на новой машине:**
- `FFMPEG` — путь к `ffmpeg.exe` (у пользователя `~/.spotdl/ffmpeg.exe`).
- `COOKIES` — файл `www.youtube.com_cookies.txt` должен лежать рядом с `server.py`.
- `pip install flask flask-cors yt-dlp` (и периодически `pip install -U yt-dlp`).

---

## 7. Ключевые детали фронтенда (`src/App.jsx`)

- `API_BASE = "http://localhost:5000"` — константа адреса бэкенда в начале файла (прямой URL работает в обоих режимах, т.к. CORS включён).
- Стейт: `theme` (dark/light, в localStorage), `lang` (ru/en, в localStorage), `activeMode` (`track`/`album`/`playlist`),
  `artist`/`title`, `trackResults`/`selectedTrack`, `collectionQuery`/`collectionResults`/`selectedCollection`,
  `savePath` (инициализируется из `localStorage["ytm_save_path"]`, при отсутствии — fetch `GET /config/output-path`, fallback `"D:\\Downloads\\"`),
  `showCheckmark` (2-секундная анимация кнопки Apply), `isDownloading`, `downloadProgress`, `downloadSuccessMessage`/`downloadErrorMessage`.
- Стаб-функции (уже подключены к реальному API): `searchTracks`, `searchCollections`,
  `downloadTrack` (GET/SSE через `EventSource`), `downloadCollection(id, type, savePath, onProgress, onDone, onError)` (SSE через `EventSource`).
- Хендлеры: `handleTrackSearch`, `handleCollectionSearch`, `triggerTrackDownload`,
  `triggerCollectionDownload`, `handleAbortDownload`, `handleConsoleReset`.
- Все экшен-кнопки `type="button"`, обе формы `onSubmit={(e)=>e.preventDefault()}` —
  **форм-сабмит исправлен корректно** (проверено построчно).
- Дизайн: строгий монохром; статусы через `DONE`/`FAILED` + вес/опасити (без цветов);
  двухтоновый H1 (первое слово яркое, второе серое); декоративный `PointCloudWaveform` (SVG из точек).

---

## 8. Запуск проекта на localhost

### Один раз (установка)
```
# фронт (в <ROOT>)
npm install
# бэкенд (в <ROOT>/backend)
pip install flask flask-cors yt-dlp
```

### PROD-режим (стандартный рабочий режим — без HMR-перезагрузок)
```
# один раз после каждой правки фронта:
npm run build

# терминал 1 — бэкенд
cd <ROOT>/backend
python server.py            # http://localhost:5000

# терминал 2 — фронт (отдаёт dist/)
cd <ROOT>
npm run preview -- --port 4173 --strictPort   # http://localhost:4173
```

### DEV-режим (только для быстрой итерации по UI, не для тестирования скачивания)
```
cd <ROOT>
npm run dev                 # http://127.0.0.1:5173 — с HMR, может делать full-reload во время загрузок
```

### Батники (Windows)
- `start_ytm.bat` — запускает `npm run preview` (порт 4173) + `python server.py`, открывает браузер.
  Вверху файла два пути (`ROOT`, `BACKEND`) — **при переносе папки обновить оба**.
  ⚠️ Перед запуском убедиться, что `dist/` актуален (`npm run build` после последних правок фронта).
- `stop_ytm.bat` — гасит оба процесса, освобождает порты 5000 и 4173.

---

## 9. Решённые проблемы (чтобы не наступать повторно)

| Симптом | Причина | Решение |
|---|---|---|
| `npm : выполнение сценариев отключено` | PowerShell ExecutionPolicy блокирует `npm.ps1` | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (или звать `npm.cmd`). Батники через `cmd` обходят это автоматически. |
| `Port 5173 is already in use` | Старый Vite не закрыт / второй запуск | `npx kill-port 5173`, либо `npm run dev -- --port 5174`, либо `stop_ytm.bat` |
| Кнопка скачивания перезагружала страницу | `<button>` по умолчанию `type="submit"` внутри `<form>` | Все кнопки `type="button"` + `onSubmit preventDefault`. **Исправлено.** |
| Страница «перезагружается» и стейт сбрасывается во время скачивания | Vite HMR делает full-reload в dev-режиме. Не баг приложения. | **Решено:** prod-сборка (`npm run preview`) используется как стандартный режим — HMR отсутствует. |
| Сохранялось только при пути `D:\` | Дефолт `./Downloads` — относительный, резолвился от папки `backend` | **Решено:** дефолт `savePath` в `App.jsx` изменён на `D:\\Downloads\\`. |

---

## 10. Текущий статус

- ✅ Связка фронт ↔ бэкенд работает end-to-end: поиск трека и скачивание подтверждены (файл сохраняется).
- ✅ Форм-сабмит баг исправлен; код `App.jsx` проверен — чистый.
- ✅ HMR-перезагрузки устранены: стандартный режим — prod-сборка (`npm run preview`, порт 4173), `start_ytm.bat` обновлён.
- ✅ `API_BASE = "http://localhost:5000"`, дефолтный `savePath = "D:\\Downloads\\"` — оба абсолютные.
- ✅ Переключатель языка RU/EN реализован: `translations` объект снаружи компонента, `lang` в localStorage, `t()` хелпер внутри компонента. Кнопка между переключателем темы и GET STARTED.
- ✅ Custom Save Path реализован: input + кнопка APPLY, путь в `localStorage["ytm_save_path"]`, дефолт с сервера через `GET /config/output-path`, 2-секундный checkmark после сохранения.
- ✅ Скачивание альбома/плейлиста (SSE-прогресс) — оттестировано, работает корректно на малом количестве треков.
- ✅ Скачивание одиночного трека переведено на SSE (`GET /download/track`): реальный прогресс-бар, кнопка ABORT работает в том числе для треков.
- ⚠️ Большие плейлисты (30+ треков) — не тестировались. Поведение неизвестно: возможны таймаут SSE-соединения, зависание subprocess, memory leak на длинном потоке или просто корректная работа. Требует проверки перед использованием на больших коллекциях.

---

## 11. Рекомендуемые следующие шаги

1. ~~**Перейти на prod-сборку**~~ ✅ Сделано. `npm run preview` — стандартный режим, `start_ytm.bat` обновлён.
2. ~~**Поставить абсолютный `savePath` по умолчанию**~~ ✅ Сделано. `API_BASE` и `savePath` исправлены.
3. ~~**Custom Save Path**~~ ✅ Сделано. Input + APPLY + localStorage + дефолт с сервера.
4. ~~**Одиночный трек висит ~2 мин синхронным POST**~~ ✅ Сделано. Переведён на SSE (`GET /download/track`), реальный прогресс-бар, ABORT работает.
5. **Оттестировать скачивание плейлиста/альбома** и проверить парсинг SSE-прогресса
   (`current`/`total`/`percent`); при необходимости считать общий прогресс альбома на фронте как
   `(current - 1 + percent/100) / total`.
6. (Опционально) Запаковать в один запуск: Flask отдаёт собранный фронт + проксирует сам себя →
   один `python server.py` поднимает всё.

---

## 12. Промпты, которые уже использовались (для контекста)

- **Дизайн фронта:** строгий монохром (ч/б/серый, без акцентов), тёмная тема по умолчанию + тоггл,
  средний объём (nav + hero + download-консоль + 3 фичи + футер), эстетика Vercel/Linear,
  Onest/Geist Mono (изначально Geist Sans, заменён на Onest для лучшей кириллицы), двухтоновый H1, точечная фоновая сетка.
- **Контракт API:** см. раздел 5 (фронт изначально делал стабы с моками + закомментированными
  `fetch`/`EventSource`, затем переключён на реальные вызовы).
- **Подключение бэкенда:** Vite dev-proxy ИЛИ прямой `API_BASE` + flask-cors; `encodeURIComponent`
  на SSE-параметрах; обработка `artist`/`trackCount = null` в результатах коллекций.

---

*Конец документа. Всё, что нужно для продолжения разработки YTM Universal в новой среде.*

"""
YTM Universal — Flask backend
=================================================================
Оборачивает твою yt-dlp логику из SpotifyMP3_Downloader.py в HTTP/JSON API,
которое ждёт фронтенд (Vite+React, http://localhost:5173).

Запуск:
    pip install flask flask-cors yt-dlp
    python server.py
    -> сервер на http://localhost:5000

Эндпоинты (формы JSON совпадают с контрактом фронта):
    POST /search/track         {artist,title}            -> {results:[{id,title,artist,duration,cover}]}
    POST /search/collection    {query,type}              -> {results:[{id,title,artist,trackCount,type}]}
    POST /download/track       {id,savePath}             -> {status:"done"|"failed", filePath}
    GET  /download/collection?id=&type=&savePath=        -> Server-Sent Events
                                                            {current,total,title,percent,done}

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


# ─────────────────────────────────────────────────────────────────
# Вспомогательное
# ─────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────
# POST /search/track  ->  {results:[{id,title,artist,duration,cover}]}
# Логика твоего download_track(), но без input()/pick_from_list —
# просто возвращаем 5 кандидатов фронту, выбор делает пользователь в UI.
# ─────────────────────────────────────────────────────────────────
@app.route("/search/track", methods=["POST"])
def search_track():
    data = request.get_json(force=True) or {}
    artist = (data.get("artist") or "").strip()
    title = (data.get("title") or "").strip()
    if not artist or not title:
        return jsonify({"results": [], "error": "artist and title are required"}), 400

    query = f"{artist} - {title}"
    # Добавлен %(thumbnail)s к твоему шаблону, чтобы отдать обложку (cover) фронту.
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
                "id": parts[4],                 # webpage_url -> возвращается в /download/track
                "title": _clean(parts[0]),
                "artist": _clean(parts[1]),
                "duration": _clean(parts[2]),
                "cover": _clean(parts[3]),
            })
    return jsonify({"results": results})


# ─────────────────────────────────────────────────────────────────
# POST /search/collection  ->  {results:[{id,title,artist,trackCount,type}]}
# Логика твоего search_youtube_playlists(). artist/trackCount YouTube
# в flat-выдаче не отдаёт -> null (фронт это переживает).
# ─────────────────────────────────────────────────────────────────
@app.route("/search/collection", methods=["POST"])
def search_collection():
    data = request.get_json(force=True) or {}
    query = (data.get("query") or "").strip()
    ctype = (data.get("type") or "playlist").strip()  # 'album' | 'playlist'
    if not query:
        return jsonify({"results": [], "error": "query is required"}), 400

    # Если пользователь вставил прямую ссылку — отдаём её как единственный результат.
    if query.startswith("http"):
        return jsonify({"results": [{
            "id": query, "title": query, "artist": None,
            "trackCount": None, "type": ctype,
        }]})

    # Иначе ищем плейлисты на YouTube (sp=EgIQAw%3D%3D — фильтр "плейлисты").
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
                "artist": None,        # недоступно в flat-выдаче
                "trackCount": None,    # недоступно в flat-выдаче
                "type": ctype,
            })
    return jsonify({"results": results})


# ─────────────────────────────────────────────────────────────────
# POST /download/track  ->  {status:"done"|"failed", filePath}
# Одиночный трек скачивается синхронно (быстро) — SSE тут не нужен.
# ─────────────────────────────────────────────────────────────────
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
                # non-bracket lines = after_move:filepath output
                last_file_path = line

        proc.wait()
        yield sse({"percent": 100, "title": last_title, "done": True, "filePath": last_file_path})

    resp = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp


# ─────────────────────────────────────────────────────────────────
# GET /download/collection?id=&type=&savePath=  ->  Server-Sent Events
# Альбом/плейлист может скачиваться долго -> стримим прогресс построчно.
# subprocess.Popen (НЕ run) + --progress-template для парсинга.
# ─────────────────────────────────────────────────────────────────
@app.route("/download/collection", methods=["GET"])
def download_collection():
    url = (request.args.get("id") or "").strip()
    folder = _ensure_dir((request.args.get("savePath") or "").strip())
    # type приходит ('album'/'playlist') — на саму команду не влияет, шаблон один.

    output = os.path.join(folder, "%(playlist)s", "%(playlist_index)s - %(title)s.%(ext)s")

    # Маркер DLPROG + поля через | — так мы отличаем строки прогресса от
    # прочего вывода yt-dlp и легко их парсим.
    progress_tmpl = (
        "download:DLPROG|%(progress._percent_str)s|%(info.title)s|"
        "%(info.playlist_index)s|%(info.n_entries)s"
    )

    cmd = [
        *YT_DLP_BASE, url,
        "--yes-playlist",
        "--output", output,
        "--newline",                          # прогресс новой строкой, не \r
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
                continue  # игнорируем прочий вывод yt-dlp
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
        # финальное событие — фронт по нему делает es.close()
        yield sse({**last, "percent": 100, "done": True})

    # stream_with_context + правильные заголовки для SSE
    resp = Response(stream_with_context(event_stream()), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"  # отключаем буферизацию (на случай прокси)
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

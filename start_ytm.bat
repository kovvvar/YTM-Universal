@echo off
REM ============================================================
REM  YTM Universal - START
REM  Launches backend (Flask) + frontend (Vite) in two windows.
REM ============================================================

REM --- EDIT THESE TWO PATHS IF YOUR FOLDERS DIFFER ---
set "ROOT=d:\VS Code\YTM Tool"
set "BACKEND=d:\VS Code\YTM Tool\backend"
REM ---------------------------------------------------

echo Starting YTM Universal...

REM 1) Backend window: python server.py
start "YTM Backend" cmd /k pushd "%BACKEND%" ^&^& python server.py

REM give the server ~2s to come up first
timeout /t 2 /nobreak >nul

REM 2) Frontend window: npm run preview (prod build must already exist in dist/)
start "YTM Frontend" cmd /k pushd "%ROOT%" ^&^& npm run preview -- --port 4173 --strictPort

REM give preview server ~5s, then open the site in the browser
timeout /t 5 /nobreak >nul
start "" "http://localhost:4173/"

echo.
echo Two windows opened: "YTM Backend" and "YTM Frontend".
echo NOTE: run "npm run build" once after any frontend code changes.
echo To stop everything, run stop_ytm.bat
timeout /t 3 /nobreak >nul

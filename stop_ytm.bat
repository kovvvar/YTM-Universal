@echo off
REM ============================================================
REM  YTM Universal - STOP
REM  Closes the backend + frontend windows and frees the ports.
REM ============================================================

echo Stopping YTM Universal...

REM 1) Close the two named windows together with their child
REM    processes (python.exe / node.exe).
taskkill /FI "WINDOWTITLE eq YTM Backend*"  /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq YTM Frontend*" /T /F >nul 2>&1

REM 2) Safety net: kill whatever is still LISTENING on the ports.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo.
echo Done. YTM Universal stopped.
timeout /t 2 /nobreak >nul

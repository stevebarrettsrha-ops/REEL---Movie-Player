@echo off
REM ===== REEL — Make Web-Ready (batch) — Windows =====
REM Converts videos that browsers cannot play (MKV/AVI/HEVC/AC3/EAC3) into web-ready MP4.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed. Get the LTS version from https://nodejs.org
  echo  then run this again.
  echo.
  pause
  exit /b 1
)

node fix-sound.js

echo.
pause

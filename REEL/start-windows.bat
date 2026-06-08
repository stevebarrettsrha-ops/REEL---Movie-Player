@echo off
REM ===== REEL home server launcher (Windows) =====
REM Double-click this file to start the server.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed yet.
  echo  Install the "LTS" version from https://nodejs.org
  echo  then double-click this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo  Starting the REEL home server...
echo  Leave this window OPEN while anyone is watching.
echo  Close it (or press Ctrl+C) to stop the server.
echo.
node server.js

echo.
echo  Server stopped.
pause

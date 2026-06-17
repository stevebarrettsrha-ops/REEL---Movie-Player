@echo off
setlocal EnableExtensions
REM ============================================================
REM  REEL - STOP your offline WiFi (Windows)
REM  Just DOUBLE-CLICK this file when you have finished
REM  watching. Click YES on the Windows permission popup.
REM  Nothing to type.
REM ============================================================

title REEL - Stop offline WiFi

REM ---- Make sure we are running as administrator ----
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  Asking Windows for permission ^(click YES on the popup^)...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cls
echo ============================================================
echo   REEL - switching the offline WiFi OFF
echo ============================================================
echo.

REM Turn off the classic hosted network (older method)...
netsh wlan stop hostednetwork >nul 2>&1

REM ...and the modern Mobile hotspot (newer method), whichever was on.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0disable-hotspot.ps1" >nul 2>&1

echo ------------------------------------------------------------
echo   The offline WiFi is now OFF.
echo   Your computer goes back to normal - it will reconnect to
echo   your usual WiFi by itself (if one is available).
echo ------------------------------------------------------------
echo.
pause
endlocal

@echo off
REM ============================================================
REM  REEL - START your own offline WiFi (Windows)
REM  Just DOUBLE-CLICK this file. When Windows asks
REM  "Do you want to allow this app to make changes?",
REM  click YES. That's all - no typing needed.
REM ============================================================

REM ---- You can change these two lines if you want ----
REM  WIFINAME = the WiFi name people will see and join
REM  PASSWORD = the WiFi password (MUST be 8+ characters)
set "WIFINAME=REEL"
set "PASSWORD=YourPassword"
REM ----------------------------------------------------

title REEL - Start offline WiFi

REM ---- Make sure we are running as administrator ----
REM  (netsh needs admin rights. If we are not admin yet,
REM   relaunch this same file elevated - Windows shows the
REM   normal "allow changes?" popup; just click Yes.)
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  Asking Windows for permission ^(click YES on the popup^)...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cls
echo ============================================================
echo   REEL - turning this computer INTO a WiFi network
echo ============================================================
echo.
echo   WiFi name:      %WIFINAME%
echo   WiFi password:  %PASSWORD%
echo.
echo   Setting it up...
echo.

netsh wlan set hostednetwork mode=allow ssid=%WIFINAME% key=%PASSWORD%
netsh wlan start hostednetwork

echo.
if %errorlevel% neq 0 (
  echo ------------------------------------------------------------
  echo   Hmm - Windows could not start the WiFi.
  echo   This usually means this laptop's WiFi adapter does not
  echo   support hosting a network. Options:
  echo     - Use Settings ^> Network ^> Mobile hotspot instead, or
  echo     - Use a cheap travel router, or keep your home router on.
  echo ------------------------------------------------------------
) else (
  echo ------------------------------------------------------------
  echo   DONE - your offline WiFi is now ON.
  echo.
  echo   1. On each phone / tablet / TV, open WiFi settings and
  echo      join the network called:  %WIFINAME%
  echo      using the password:       %PASSWORD%
  echo.
  echo   2. Then start REEL (double-click start-windows.bat in the
  echo      main folder) and open the address it shows, usually:
  echo            http://192.168.137.1:8080
  echo.
  echo   When you are finished watching, run:
  echo            2 - STOP offline WiFi.bat
  echo   to switch this WiFi back off.
  echo ------------------------------------------------------------
)
echo.
pause

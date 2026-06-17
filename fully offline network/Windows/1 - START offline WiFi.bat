@echo off
setlocal EnableExtensions
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
REM  (changing WiFi needs admin rights. If we are not admin yet,
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

REM ============================================================
REM  Method 1: classic "Hosted Network" (works on older laptops).
REM  Many newer PCs no longer support this - if so we fall through
REM  to the modern Windows Mobile hotspot below.
REM ============================================================
netsh wlan set hostednetwork mode=allow ssid="%WIFINAME%" key="%PASSWORD%" >nul 2>&1
netsh wlan start hostednetwork >nul 2>&1
if %errorlevel% equ 0 goto SUCCESS

REM ============================================================
REM  Method 2: modern Windows "Mobile hotspot" (Win 10/11).
REM  Try to switch it on automatically.
REM ============================================================
echo   This PC does not support the older WiFi-hosting method,
echo   so REEL is switching on the modern Windows Mobile hotspot...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enable-hotspot.ps1" -Name "%WIFINAME%" -Password "%PASSWORD%"
if %errorlevel% equ 0 goto SUCCESS

REM ============================================================
REM  Method 3: could not do it automatically - guide the user.
REM ============================================================
goto MANUAL


:SUCCESS
echo.
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
goto END


:MANUAL
echo.
echo ------------------------------------------------------------
echo   Almost there - one quick switch to flip by hand.
echo.
echo   Windows could not turn the WiFi on automatically on this PC.
echo   The "Mobile hotspot" settings page is opening now:
echo.
echo     1. Turn the  Mobile hotspot  switch ON.
echo     2. (Optional) click Edit / Properties to set:
echo            Network name:      %WIFINAME%
echo            Network password:  %PASSWORD%
echo.
echo   Then start REEL (double-click start-windows.bat) and open the
echo   address it shows, usually  http://192.168.137.1:8080
echo.
echo   To switch the WiFi back off later, turn that same switch OFF
echo   (or run  2 - STOP offline WiFi.bat).
echo ------------------------------------------------------------
start "" ms-settings:network-mobilehotspot
goto END


:END
echo.
echo  (You can close this window now.)
echo.
pause
endlocal

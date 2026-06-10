@echo off
REM ============================================================================
REM  REEL desktop launcher  (Windows)
REM  Starts the REEL home server (if it isn't already running) and then opens
REM  the player in your default web browser. This is the file the "REEL" desktop
REM  shortcut points at — but you can double-click it directly too.
REM  Lives in the Launchers\ folder; the project itself is one level up.
REM ============================================================================
cd /d "%~dp0.."
set "ROOT=%CD%"
set "URL=http://localhost:8080"

REM --- already running?  just open the browser, don't start a second copy ------
call :isup
if not errorlevel 1 goto open

REM --- not running: start the server in its own window -------------------------
REM  start-windows.bat keeps that window open (it must stay open while watching)
REM  and prints the addresses for phones/TVs on your network.
start "REEL Home Server" "%ROOT%\start-windows.bat"

REM --- wait (up to ~30s) for the server to accept connections, then open -------
set /a tries=0
:wait
call :isup
if not errorlevel 1 goto open
set /a tries+=1
if %tries% geq 30 goto open
timeout /t 1 /nobreak >nul
goto wait

:open
start "" "%URL%"
exit /b 0

REM --- subroutine: is something listening on port 8080?  errorlevel 0 = yes ----
:isup
powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('localhost',8080);$c.Close();exit 0}catch{exit 1}" >nul 2>&1
exit /b %errorlevel%

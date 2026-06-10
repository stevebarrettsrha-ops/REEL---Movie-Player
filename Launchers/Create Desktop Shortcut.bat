@echo off
REM ============================================================================
REM  Create a "REEL" shortcut on your Desktop, with the REEL logo as its icon.
REM  Double-click this file ONCE. After that, launch REEL from the desktop icon:
REM  it starts the home server and opens the player in your browser.
REM ============================================================================
cd /d "%~dp0"
set "TARGET=%~dp0REEL.bat"
set "ICON=%~dp0REEL.ico"
set "WORKDIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=New-Object -ComObject WScript.Shell; $p=[System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'),'REEL.lnk'); $l=$s.CreateShortcut($p); $l.TargetPath='%TARGET%'; $l.WorkingDirectory='%WORKDIR%'; $l.IconLocation='%ICON%'; $l.Description='Start REEL and open it in your browser'; $l.WindowStyle=7; $l.Save()"

if errorlevel 1 (
  echo.
  echo  Could not create the shortcut automatically.
  echo  You can still launch REEL by double-clicking REEL.bat in this folder.
) else (
  echo.
  echo  Done!  A "REEL" icon is now on your Desktop.
  echo  Double-click it to start watching.
)
echo.
pause

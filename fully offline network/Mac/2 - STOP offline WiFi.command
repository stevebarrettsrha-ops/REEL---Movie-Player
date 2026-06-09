#!/usr/bin/env bash
# ============================================================
#  REEL - STOP your offline WiFi (Mac)
#  Double-click when you have finished watching. The first time,
#  right-click and choose "Open" so macOS lets it run.
#
#  This opens the Internet Sharing settings so you can flip the
#  ONE switch off (Apple does not allow scripts to do it).
# ============================================================

clear
cat <<'TXT'
============================================================
   REEL - switching the offline WiFi OFF
============================================================

The settings window is opening. To switch the WiFi off:

  1. In "Internet Sharing", turn it OFF (untick the box /
     flip the switch off on the left). Confirm "Stop" if asked.

That's it - your Mac goes back to normal and will reconnect to
your usual WiFi by itself (if one is available).
============================================================
TXT

open "x-apple.systempreferences:com.apple.Sharing-Settings.extension" 2>/dev/null \
  || open "x-apple.systempreferences:com.apple.preferences.sharing?Internet" 2>/dev/null \
  || open "/System/Library/PreferencePanes/SharingPref.prefPane" 2>/dev/null

echo
read -r -p "  Press Enter to close this window..." _

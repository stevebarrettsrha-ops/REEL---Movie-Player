#!/usr/bin/env bash
# ============================================================
#  REEL - START your own offline WiFi (Mac)
#  Double-click this file. The first time, right-click it and
#  choose "Open" so macOS lets it run.
#
#  Apple does NOT allow turning the WiFi hotspot fully on from
#  a script (it lives in System Settings for safety). So this
#  opens the right settings screen and tells you the ONE switch
#  to flick - about 20 seconds, no typing.
# ============================================================

clear
cat <<'TXT'
============================================================
   REEL - turn this Mac INTO a WiFi network (Internet Sharing)
============================================================

Apple keeps this switch inside System Settings, so just follow
these steps (the settings window is opening for you now):

  1. In "Internet Sharing":
        - "Share your connection from":  pick  Wi-Fi
          (or "iPhone USB" / Ethernet - any one is fine; with
           no internet it still creates the WiFi for REEL.)
        - "To computers using":          tick  Wi-Fi

  2. Click  "Wi-Fi Options..."  and set:
        - Network Name:  REEL
        - Password:      pick one (8+ characters)
     Click OK.

  3. Turn  "Internet Sharing"  ON (tick the box / flip the
     switch on the left). Confirm "Start" if asked.

  4. On each phone / tablet / TV, join the "REEL" WiFi using
     that password. Then start REEL ( double-click
     start-mac.command in the main folder ) and open the
     address it shows, e.g.  http://192.168.2.1:8080

  When you are finished, run:  2 - STOP offline WiFi (Mac).command
  (or just turn Internet Sharing OFF in the same screen).
============================================================
TXT

# Open the Sharing settings pane (works on modern + older macOS).
open "x-apple.systempreferences:com.apple.Sharing-Settings.extension" 2>/dev/null \
  || open "x-apple.systempreferences:com.apple.preferences.sharing?Internet" 2>/dev/null \
  || open "/System/Library/PreferencePanes/SharingPref.prefPane" 2>/dev/null

echo
read -r -p "  Press Enter to close this window..." _

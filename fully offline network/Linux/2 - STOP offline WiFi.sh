#!/usr/bin/env bash
# ============================================================
#  REEL - STOP your offline WiFi (Linux)
#  Run this when you have finished watching. It switches the
#  hotspot off and lets this computer reconnect to your normal
#  WiFi by itself.
#
#  Easiest way to run: open a terminal in this folder and type
#       bash "2 - STOP offline WiFi (Linux).sh"
# ============================================================

# Re-run with admin rights if we are not root.
if [ "$(id -u)" -ne 0 ]; then
  echo "  Asking for permission (enter your password if prompted)..."
  exec sudo "$0" "$@"
fi

if ! command -v nmcli >/dev/null 2>&1; then
  echo "  NetworkManager (nmcli) not found - nothing to stop."
  read -r -p "  Press Enter to close..." _
  exit 1
fi

clear
echo "============================================================"
echo "   REEL - switching the offline WiFi OFF"
echo "============================================================"
echo

# The hotspot created by "nmcli device wifi hotspot" is named
# "Hotspot". Bring it down; ignore the error if it is not up.
nmcli connection down Hotspot 2>/dev/null

echo "------------------------------------------------------------"
echo "   The offline WiFi is now OFF."
echo "   Your computer goes back to normal - it will reconnect to"
echo "   your usual WiFi by itself (if one is available)."
echo "------------------------------------------------------------"
echo
read -r -p "  Press Enter to close..." _

#!/usr/bin/env bash
# ============================================================
#  REEL - START your own offline WiFi (Linux)
#  Run this to turn this computer into a WiFi network so
#  phones/tablets/TVs can join it and watch REEL with no
#  internet. Uses NetworkManager's built-in hotspot.
#
#  Easiest way to run: open a terminal in this folder and type
#       bash "1 - START offline WiFi (Linux).sh"
#  (Some file managers also let you double-click and choose
#   "Run in Terminal".)
# ============================================================

# ---- You can change these two lines if you want ----
#  WIFINAME = the WiFi name people will see and join
#  PASSWORD = the WiFi password (MUST be 8+ characters)
WIFINAME="REEL"
PASSWORD="YourPassword"
# ----------------------------------------------------

# Re-run with admin rights if we are not root (NetworkManager
# needs them). You may be asked for your login password once.
if [ "$(id -u)" -ne 0 ]; then
  echo "  Asking for permission (enter your password if prompted)..."
  exec sudo "$0" "$@"
fi

# Make sure NetworkManager / nmcli is available.
if ! command -v nmcli >/dev/null 2>&1; then
  echo
  echo "  This needs NetworkManager (the 'nmcli' command), which"
  echo "  was not found. Install it with your package manager, e.g.:"
  echo "      sudo apt install network-manager      (Debian/Ubuntu)"
  echo "      sudo dnf install NetworkManager-wifi   (Fedora)"
  echo
  read -r -p "  Press Enter to close..." _
  exit 1
fi

clear
echo "============================================================"
echo "   REEL - turning this computer INTO a WiFi network"
echo "============================================================"
echo
echo "   WiFi name:      $WIFINAME"
echo "   WiFi password:  $PASSWORD"
echo
echo "   Setting it up..."
echo

if nmcli device wifi hotspot ssid "$WIFINAME" password "$PASSWORD"; then
  echo
  echo "------------------------------------------------------------"
  echo "   DONE - your offline WiFi is now ON."
  echo
  echo "   1. On each phone / tablet / TV, open WiFi settings and"
  echo "      join the network called:  $WIFINAME"
  echo "      using the password:       $PASSWORD"
  echo
  echo "   2. Then start REEL ( ./start-linux.sh in the main folder )"
  echo "      and open the address it shows in a browser, e.g.:"
  echo "            http://10.42.0.1:8080"
  echo
  echo "   When you are finished watching, run:"
  echo "            2 - STOP offline WiFi (Linux).sh"
  echo "   to switch this WiFi back off."
  echo "------------------------------------------------------------"
else
  echo
  echo "------------------------------------------------------------"
  echo "   Hmm - the WiFi could not start. This usually means this"
  echo "   computer's WiFi adapter does not support hosting a"
  echo "   network, or it is already in use. Alternatives:"
  echo "     - Use a cheap travel router, or keep your home router on"
  echo "       (REEL works through it even with the internet line down)."
  echo "------------------------------------------------------------"
fi
echo
read -r -p "  Press Enter to close..." _

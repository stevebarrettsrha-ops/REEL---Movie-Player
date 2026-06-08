#!/usr/bin/env bash
# ============================================================================
#  REEL — one-tap start for Linux (also works in the macOS Terminal)
# ----------------------------------------------------------------------------
#  Use this if you downloaded the ZIP and "./start-linux.sh" says
#  "Permission denied". Just run:
#
#       bash START.sh
#
#  Running it WITH bash doesn't need the executable flag, and this script then
#  re-adds that flag to the other launchers — so after the first run you can
#  also double-click start-linux.sh / start-mac.command like normal.
# ============================================================================

cd "$(dirname "$0")" || exit 1

# Self-heal: restore the "this file is runnable" flag that a ZIP download strips
# off every launcher sitting next to this one. Quietly ignore any that aren't here.
chmod +x START.sh start-linux.sh start-mac.command \
         fix-sound-linux.sh fix-sound-mac.command 2>/dev/null

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed yet."
  echo "  Install it from https://nodejs.org or your package manager, e.g.:"
  echo "    Debian/Ubuntu:  sudo apt install nodejs"
  echo "    Fedora:         sudo dnf install nodejs"
  echo "    Arch:           sudo pacman -S nodejs"
  echo "  then run this again:   bash START.sh"
  echo
  exit 1
fi

echo
echo "  Starting the REEL home server..."
echo "  Leave this terminal OPEN while anyone is watching."
echo "  Press Ctrl+C to stop the server."
echo
node server.js

#!/usr/bin/env bash
# ===== REEL home server launcher (macOS) =====
# Double-click this file in Finder to start the server.
# (If macOS blocks it the first time: right-click -> Open, or run
#  chmod +x "start-mac.command" once in Terminal.)
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed yet."
  echo "  Install the LTS version from https://nodejs.org"
  echo "  (or:  brew install node ), then run this again."
  echo
  read -n 1 -s -r -p "  Press any key to close..."
  exit 1
fi

echo
echo "  Starting the REEL home server..."
echo "  Leave this window OPEN while anyone is watching."
echo "  Press Ctrl+C to stop the server."
echo
node server.js

#!/usr/bin/env bash
# ===== REEL home server launcher (Linux) =====
# Run in a terminal:   ./start-linux.sh
# (First time, make it executable:   chmod +x start-linux.sh )
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed yet."
  echo "  Install it from https://nodejs.org or your package manager, e.g.:"
  echo "    Debian/Ubuntu:  sudo apt install nodejs"
  echo "    Fedora:         sudo dnf install nodejs"
  echo "    Arch:           sudo pacman -S nodejs"
  echo "  then run this again."
  echo
  exit 1
fi

echo
echo "  Starting the REEL home server..."
echo "  Leave this terminal OPEN while anyone is watching."
echo "  Press Ctrl+C to stop the server."
echo
node server.js

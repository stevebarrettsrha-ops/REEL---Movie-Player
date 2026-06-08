#!/usr/bin/env bash
# ===== REEL — Make Web-Ready (batch) — macOS =====
# Double-click in Finder (first time: right-click -> Open). Converts videos that
# browsers cannot play (MKV/AVI/HEVC/AC3/EAC3) into web-ready MP4 with sound.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed. Get the LTS version from https://nodejs.org"
  echo "  (or: brew install node), then run this again."
  echo
  read -n 1 -s -r -p "  Press any key to close..."
  exit 1
fi

node fix-sound.js

echo
read -n 1 -s -r -p "  Press any key to close..."

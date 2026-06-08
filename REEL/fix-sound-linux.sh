#!/usr/bin/env bash
# ===== REEL — Make Web-Ready (batch) — Linux =====
# Run:  ./fix-sound-linux.sh
# Converts videos browsers cannot play (MKV/AVI/HEVC/AC3/EAC3) into web-ready MP4.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed. Install it from https://nodejs.org or your"
  echo "  package manager, then run this again."
  echo
  exit 1
fi

node fix-sound.js

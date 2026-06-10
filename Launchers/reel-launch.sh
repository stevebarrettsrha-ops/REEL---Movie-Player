#!/usr/bin/env bash
# ============================================================================
#  REEL desktop launcher  (Linux)
#  Starts the REEL home server (if it isn't already running) and opens the
#  player in your default browser. This is what the "REEL" application/desktop
#  icon runs — but you can also run it directly:   bash reel-launch.sh
#  Lives in Launchers/ ; the project itself is one level up.
# ============================================================================
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
URL="http://localhost:8080"

# is something already listening on 8080?  (bash /dev/tcp, no extra tools needed)
isup(){ (exec 3<>"/dev/tcp/127.0.0.1/8080") 2>/dev/null; }

open_browser(){
  for b in xdg-open gio sensible-browser x-www-browser firefox chromium google-chrome; do
    if command -v "$b" >/dev/null 2>&1; then
      case "$b" in gio) gio open "$URL";; *) "$b" "$URL";; esac >/dev/null 2>&1 &
      return 0
    fi
  done
  echo "  Open this in your browser:  $URL"
}

# already running -> just open the browser, don't start a second copy
if isup; then open_browser; exit 0; fi

# start the server (reuses start-linux.sh: checks Node, prints phone/TV addresses)
bash "$ROOT/start-linux.sh" &
SVPID=$!

# wait up to ~30s for it to accept connections, then open the browser
for _ in $(seq 1 30); do isup && break; sleep 1; done
open_browser

# keep this window tied to the server so closing it (or Ctrl+C) stops REEL
wait "$SVPID"

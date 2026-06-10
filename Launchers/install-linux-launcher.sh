#!/usr/bin/env bash
# ============================================================================
#  Install the REEL launcher on Linux.
#  Run once:   bash install-linux-launcher.sh
#  It adds "REEL" (with the REEL logo) to your applications menu and your
#  Desktop. Clicking it starts the home server and opens REEL in your browser.
# ============================================================================
DIR="$(cd "$(dirname "$0")" && pwd)"     # the Launchers/ folder
chmod +x "$DIR/reel-launch.sh" 2>/dev/null || true

write_desktop(){            # $1 = destination .desktop path
  cat > "$1" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=REEL
GenericName=Home Movie Server
Comment=Start REEL and open it in your browser
Exec="$DIR/reel-launch.sh"
Path=$DIR
Icon=$DIR/REEL.png
Terminal=true
Categories=AudioVideo;Player;Network;
EOF
  chmod +x "$1" 2>/dev/null || true
}

# 1) applications menu
APPS="$HOME/.local/share/applications"
mkdir -p "$APPS"
write_desktop "$APPS/reel.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1

# 2) the Desktop (use the real localized Desktop dir when xdg-user-dir knows it)
DESK="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"
if [ -d "$DESK" ]; then
  write_desktop "$DESK/REEL.desktop"
  # let GNOME/Nautilus trust it so it doesn't show as "untrusted text file"
  command -v gio >/dev/null 2>&1 && gio set "$DESK/REEL.desktop" metadata::trusted true >/dev/null 2>&1
fi

echo
echo "  Installed!  Look for 'REEL' in your applications menu"
[ -d "$DESK" ] && echo "  and a 'REEL' icon on your Desktop."
echo "  (If the Desktop icon looks like plain text, right-click it ->"
echo "   'Allow Launching'.)"
echo

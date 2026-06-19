#!/usr/bin/env bash
set -euo pipefail

PLIST_NAME="com.algomarket.kalshi-live"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRAPER_DIR="${WHALE_SCRAPER_DIR:-$HOME/Desktop/PolymarketAnalysis}"
LOG_DIR="$SCRAPER_DIR/logs"
mkdir -p "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_NAME}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/run-live-scrapers.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${SCRAPER_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/kalshi-live.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/kalshi-live.err</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null || true
launchctl bootout "gui/$(id -u)/com.arbwhale.kalshi-live" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl enable "gui/$(id -u)/${PLIST_NAME}"
launchctl kickstart -k "gui/$(id -u)/${PLIST_NAME}"

echo "Kalshi live scraper installed (KeepAlive). Logs: ${LOG_DIR}/kalshi-live.log"

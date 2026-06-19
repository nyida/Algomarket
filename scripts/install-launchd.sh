#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_SCRAPER="$ROOT/scripts/run-scraper.sh"
PLIST_SRC="$ROOT/scripts/com.arbwhale.scraper.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.arbwhale.scraper.plist"
LOG_DIR="$HOME/Library/Logs/arb-whale"

mkdir -p "$LOG_DIR"

sed \
  -e "s|__RUN_SCRAPER_SH__|$RUN_SCRAPER|g" \
  -e "s|__LOG_DIR__|$LOG_DIR|g" \
  "$PLIST_SRC" > "$PLIST_DST"

launchctl bootout "gui/$(id -u)/com.arbwhale.scraper" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/com.arbwhale.scraper"
launchctl kickstart -k "gui/$(id -u)/com.arbwhale.scraper"

echo "Installed launchd job: com.arbwhale.scraper (every 30 minutes)"
echo "Logs: $LOG_DIR/scraper.out.log"

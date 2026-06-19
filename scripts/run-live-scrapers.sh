#!/usr/bin/env bash
set -euo pipefail

SCRAPER_DIR="${WHALE_SCRAPER_DIR:-$HOME/Desktop/PolymarketAnalysis}"
cd "$SCRAPER_DIR"

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

echo "[algomarket] Starting Kalshi live fill scraper (anonymous large fills only)"
echo "PredictIt/Manifold scrapers are disabled until data quality improves."
echo "Press Ctrl+C to stop."

exec python3 scraper_kalshi.py

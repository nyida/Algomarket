#!/usr/bin/env bash
set -euo pipefail

SCRAPER_DIR="${WHALE_SCRAPER_DIR:-$HOME/Desktop/PolymarketAnalysis}"
cd "$SCRAPER_DIR"

if [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

echo "[algomarket] Running Polymarket scraper at $(date)"
python3 scraper.py

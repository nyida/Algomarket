#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[algomarket] Installing all background data jobs..."
bash "$ROOT/scripts/install-launchd.sh"
bash "$ROOT/scripts/install-live-launchd.sh"
bash "$ROOT/scripts/ensure-background.sh"
echo "[algomarket] All background jobs installed and running"

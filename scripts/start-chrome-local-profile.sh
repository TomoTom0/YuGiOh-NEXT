#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
CACHE_DIR="$ROOT_DIR/.chrome_cache"
PROFILE_DIR="$CACHE_DIR/profile"

mkdir -p "$PROFILE_DIR"

echo "Starting Chrome with profile: $PROFILE_DIR"
echo "Logs: $CACHE_DIR/chrome_launch.log"

DISPLAY=${DISPLAY:-:0}
nohup /usr/bin/google-chrome-stable --new-window "https://www.db.yugioh-card.com" \
  --user-data-dir="$PROFILE_DIR" --no-first-run > "$CACHE_DIR/chrome_launch.log" 2>&1 &
echo $!


#!/bin/bash
# 調査用Chromeブラウザの停止スクリプト
# configs/browser.toml の chrome.debug_port をlistenするプロセスのみ終了する

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BROWSER_CONFIG="${PROJECT_ROOT}/configs/browser.toml"
# shellcheck source=lib/browser-config.sh
source "${PROJECT_ROOT}/scripts/debug/setup/lib/browser-config.sh"

DEBUG_PORT=$(read_cfg chrome debug_port)
[ -n "$DEBUG_PORT" ] || die "configs/browser.toml の chrome.debug_port が読み取れません"

echo "=== Chromium Debug Browser Stop ==="

# デバッグポートをlistenするプロセスのみを終了（他プロセスを巻き込まない）
if stop_port "$DEBUG_PORT"; then
  sleep 2
  # まだ残っていれば強制終了
  stop_port "$DEBUG_PORT" KILL && sleep 1
  echo "[OK] Chromiumを終了しました（ポート ${DEBUG_PORT}）"
else
  echo "Chromiumは起動していません（ポート ${DEBUG_PORT} をlistenするプロセスなし）"
fi

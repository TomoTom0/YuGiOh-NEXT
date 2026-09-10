#!/bin/bash
# 起動中Chromiumのcookieを書き出し、Playwright storageState形式で保存する
# （tests/browser の injectSession(cdp) が使用。TASK-467）
#
# 使い方: ./export-session-state.sh
# 前提: Chromiumが起動済みで、db.yugioh-card.com にログイン済みであること。
# 出力: configs/browser.toml の session.state_file（data/session/storageState.json）
#   ※ 認証情報を含むため gitignore 済み。commit・値の表示は禁止
# 依存: node / curl / jq / ws（node_modules）

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BROWSER_CONFIG="${PROJECT_ROOT}/configs/browser.toml"
# shellcheck source=lib/browser-config.sh
source "${PROJECT_ROOT}/scripts/debug/setup/lib/browser-config.sh"

require_cmd node
require_cmd curl
require_cmd jq

DEBUG_PORT=$(read_cfg chrome debug_port)
STATE_FILE_REL=$(read_cfg session state_file)
[ -n "$DEBUG_PORT" ] || die "configs/browser.toml の chrome.debug_port が読み取れません"
[ -n "$STATE_FILE_REL" ] || die "configs/browser.toml の session.state_file が読み取れません"

echo "=== Export Session State ==="

BROWSER_WS=$(curl -sf "http://localhost:${DEBUG_PORT}/json/version" 2>/dev/null \
  | jq -r '.webSocketDebuggerUrl' 2>/dev/null)
if [ -z "$BROWSER_WS" ] || [ "$BROWSER_WS" = "null" ]; then
  die "Chromiumが起動していないかCDPに応答がありません（ポート ${DEBUG_PORT}）。start-chrome.sh または start-login-vnc.sh で起動し、db.yugioh-card.com へログインしてから再実行してください"
fi

node "${PROJECT_ROOT}/scripts/debug/setup/lib/export-session-state.cjs" \
  "$BROWSER_WS" "${PROJECT_ROOT}/${STATE_FILE_REL}"

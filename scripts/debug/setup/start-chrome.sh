#!/bin/bash
# 調査用Chromeブラウザの起動スクリプト
#
# configs/browser.toml の設定に従って Chromium をリモートデバッグモードで起動し、
# CDP WebSocketエンドポイント（page型ターゲット）を ws_file に書き出す。
# 依存: curl / jq（TOMLパーサ不要。バイナリ・拡張機能パスは config + 自動検出で解決）
#
# 使い方:
#   ./start-chrome.sh             # 起動（headless設定は configs/browser.toml に従う）
#   ./start-chrome.sh --headless  # ヘッドレス起動を強制
#   ./start-chrome.sh --gui       # GUI起動を強制（DISPLAY が必要）
#   ./start-chrome.sh --check     # 設定の解決結果を表示して終了（起動しない）
#
# 手動ログインが必要な場合は start-login-vnc.sh を使用（Xvfb + VNC スタック）。

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BROWSER_CONFIG="${PROJECT_ROOT}/configs/browser.toml"
# shellcheck source=lib/browser-config.sh
source "${PROJECT_ROOT}/scripts/debug/setup/lib/browser-config.sh"

FORCE_HEADLESS=""
CHECK_ONLY=""
for arg in "$@"; do
  case "$arg" in
    --headless) FORCE_HEADLESS="true" ;;
    --gui) FORCE_HEADLESS="false" ;;
    --check) CHECK_ONLY="true" ;;
    *) die "不明なオプション: ${arg}（使えるのは --headless / --gui / --check）" ;;
  esac
done

echo "=== Chromium Debug Browser Setup ==="
echo ""

# --- 依存コマンド ---
require_cmd curl
require_cmd jq

# --- 設定読み取り（空値・不正値なら即エラー停止） ---
WS_FILE_REL=$(read_cfg chrome ws_file)
DEBUG_PORT=$(read_cfg chrome debug_port)
PROFILE_DIR_REL=$(read_cfg chrome profile_dir)
[ -n "$WS_FILE_REL" ] || die "configs/browser.toml の chrome.ws_file が読み取れません"
[ -n "$DEBUG_PORT" ] || die "configs/browser.toml の chrome.debug_port が読み取れません"
[ -n "$PROFILE_DIR_REL" ] || die "configs/browser.toml の chrome.profile_dir が読み取れません"
case "$DEBUG_PORT" in *[!0-9]*) die "chrome.debug_port が数値ではありません: ${DEBUG_PORT}" ;; esac

HEADLESS=$(read_cfg chrome headless)
[ -n "$HEADLESS" ] || die "configs/browser.toml の chrome.headless が読み取れません"
case "$HEADLESS" in true|false) ;; *) die "chrome.headless は true/false で指定してください: ${HEADLESS}" ;; esac
[ -z "$FORCE_HEADLESS" ] || HEADLESS="$FORCE_HEADLESS"

NO_SANDBOX=$(read_cfg chrome no_sandbox)
[ -n "$NO_SANDBOX" ] || die "configs/browser.toml の chrome.no_sandbox が読み取れません"
case "$NO_SANDBOX" in true|false) ;; *) die "chrome.no_sandbox は true/false で指定してください: ${NO_SANDBOX}" ;; esac

CHROME_BIN=$(resolve_binary)
EXTENSION_DIR=$(resolve_extension_dir)
[ -f "${EXTENSION_DIR}/manifest.json" ] \
  || die "拡張機能ディレクトリに manifest.json がありません: ${EXTENSION_DIR}（mise run build-deploy は実行しましたか?）"

WS_FILE="${PROJECT_ROOT}/${WS_FILE_REL}"
PROFILE_DIR="${PROJECT_ROOT}/${PROFILE_DIR_REL}"
CHROME_LOG="${PROJECT_ROOT}/tmp/chromium-debug.log"

# --- --check: 解決結果の表示のみ ---
if [ -n "$CHECK_ONLY" ]; then
  echo "設定解決結果:"
  echo "  binary:      ${CHROME_BIN}"
  echo "  extension:   ${EXTENSION_DIR}"
  echo "  profile_dir: ${PROFILE_DIR}"
  echo "  ws_file:     ${WS_FILE}"
  echo "  debug_port:  ${DEBUG_PORT}"
  echo "  headless:    ${HEADLESS}"
  echo "  log:         ${CHROME_LOG}"
  exit 0
fi

# --- 既存起動の確認 ---
if pgrep -f "remote-debugging-port=${DEBUG_PORT}" > /dev/null; then
  echo "[OK] Chromiumは既に起動しています"
  fetch_ws_url "$DEBUG_PORT" "$WS_FILE" 10 \
    || die "WebSocket接続情報の更新に失敗しました（ポート ${DEBUG_PORT} のCDP応答なし）"
  echo "[OK] WebSocket接続情報を更新しました: $(cat "${WS_FILE}")"
  exit 0
fi

# --- 起動 ---
echo "Chromiumを起動します..."
echo "  binary:    ${CHROME_BIN}"
echo "  拡張機能:  ${EXTENSION_DIR}"
mkdir -p "$PROFILE_DIR" "$(dirname "$WS_FILE")" "$(dirname "$CHROME_LOG")"

CHROME_ARGS=(
  --remote-debugging-port="${DEBUG_PORT}"
  --user-data-dir="${PROFILE_DIR}"
  --load-extension="${EXTENSION_DIR}"
  --no-first-run
  --no-default-browser-check
  --window-size=1280,900
  --enable-logging=stderr
)
if [ "$HEADLESS" = "true" ]; then
  CHROME_ARGS+=(--headless=new --disable-gpu)
fi
if [ "$NO_SANDBOX" = "true" ]; then
  CHROME_ARGS+=(--no-sandbox)
fi

nohup "$CHROME_BIN" "${CHROME_ARGS[@]}" \
  "https://www.db.yugioh-card.com/yugiohdb/?request_locale=ja" \
  > "${CHROME_LOG}" 2>&1 &

# --- 起動成否チェック（最大15秒ポーリング） ---
if fetch_ws_url "$DEBUG_PORT" "$WS_FILE" 15; then
  echo "[OK] Chromiumを起動しました"
  echo "[OK] バイナリ: ${CHROME_BIN}"
  echo "[OK] プロファイル: ${PROFILE_DIR}"
  echo "[OK] デバッグポート: ${DEBUG_PORT}"
  echo "[OK] WebSocket: $(cat "${WS_FILE}")"
  echo "[OK] ログ: ${CHROME_LOG}"
else
  echo "[NG] Chromiumの起動に失敗しました（ポート ${DEBUG_PORT} でCDP応答なし）" >&2
  echo "--- ${CHROME_LOG} 末尾 ---" >&2
  tail -20 "${CHROME_LOG}" >&2
  die "ログを確認してください: ${CHROME_LOG}"
fi

echo ""
echo "次の手順:"
echo "1. ブラウザで日本語トップページが開かれます"
echo "2. ログインが必要なテストは start-login-vnc.sh でログインするか、TASK-467 の session注入を利用"
echo "3. 停止は ./stop-chrome.sh"

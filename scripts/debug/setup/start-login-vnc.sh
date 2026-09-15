#!/bin/bash
# 手動ログイン用ブラウザスタックの起動スクリプト（Xvfb + x11vnc + Chromium GUI）
#
# ヘッドレス起動では実行できない手動ログイン（遊戯王DB会員ログイン等）のためのスタック。
# ChromiumはXvfb上でGUI起動し、VNC経由でブラウザ画面を操作できる。
#
# VNCはlocalhostのみ・パスワード無し（SSHトンネル前提）:
#   ssh -L <VNCポート>:localhost:<VNCポート> <このホスト>
#   その後 VNCクライアントで localhost:<VNCポート> へ接続
#
# 設定: configs/browser.toml の [login-vnc]（display / port / profile_dir）
# 依存: Xvfb / x11vnc / curl / jq
# 停止: ./stop-login-vnc.sh

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BROWSER_CONFIG="${PROJECT_ROOT}/configs/browser.toml"
# shellcheck source=lib/browser-config.sh
source "${PROJECT_ROOT}/scripts/debug/setup/lib/browser-config.sh"

echo "=== Login VNC Browser Stack Setup ==="
echo ""

# --- 依存コマンド ---
require_cmd Xvfb
require_cmd x11vnc
require_cmd curl
require_cmd jq

# --- 設定読み取り（空値・不正値なら即エラー停止） ---
DISPLAY_NUM=$(read_cfg login-vnc display)
VNC_PORT=$(read_cfg login-vnc port)
LOGIN_PROFILE_REL=$(read_cfg login-vnc profile_dir)
WS_FILE_REL=$(read_cfg chrome ws_file)
DEBUG_PORT=$(read_cfg chrome debug_port)
NO_SANDBOX=$(read_cfg chrome no_sandbox)
[ -n "$DISPLAY_NUM" ] || die "configs/browser.toml の login-vnc.display が読み取れません"
[ -n "$VNC_PORT" ] || die "configs/browser.toml の login-vnc.port が読み取れません"
[ -n "$LOGIN_PROFILE_REL" ] || die "configs/browser.toml の login-vnc.profile_dir が読み取れません"
[ -n "$WS_FILE_REL" ] || die "configs/browser.toml の chrome.ws_file が読み取れません"
[ -n "$DEBUG_PORT" ] || die "configs/browser.toml の chrome.debug_port が読み取れません"
[ -n "$NO_SANDBOX" ] || die "configs/browser.toml の chrome.no_sandbox が読み取れません"
case "$NO_SANDBOX" in true|false) ;; *) die "chrome.no_sandbox は true/false で指定してください: ${NO_SANDBOX}" ;; esac
case "$DISPLAY_NUM" in *[!0-9]*) die "login-vnc.display が数値ではありません: ${DISPLAY_NUM}" ;; esac
case "$VNC_PORT" in *[!0-9]*) die "login-vnc.port が数値ではありません: ${VNC_PORT}" ;; esac
case "$VNC_PORT" in 3905[0-4]) ;; *) die "login-vnc.port はユーザー指定範囲 39050-39054 のみ設定できます: ${VNC_PORT}" ;; esac

CHROME_BIN=$(resolve_binary)
EXTENSION_DIR=$(resolve_extension_dir)
[ -f "${EXTENSION_DIR}/manifest.json" ] \
  || die "拡張機能ディレクトリに manifest.json がありません: ${EXTENSION_DIR}（mise run build-deploy は実行しましたか?）"

WS_FILE="${PROJECT_ROOT}/${WS_FILE_REL}"
LOGIN_PROFILE="${PROJECT_ROOT}/${LOGIN_PROFILE_REL}"
XVFB_LOG="${PROJECT_ROOT}/tmp/login-vnc-xvfb.log"
VNC_LOG="${PROJECT_ROOT}/tmp/login-vnc-x11vnc.log"
CHROME_LOG="${PROJECT_ROOT}/tmp/login-vnc-chromium.log"

# --- 既存スタックの停止（portとdisplay番号で限定） ---
stop_port "$VNC_PORT" 2>/dev/null
stop_port "$DEBUG_PORT" 2>/dev/null
pkill -f "Xvfb :${DISPLAY_NUM}[[:space:]]" 2>/dev/null
sleep 1

# --- 1) Xvfb（仮想ディスプレイ） ---
echo "Xvfb を起動します（:${DISPLAY_NUM}）..."
nohup Xvfb ":${DISPLAY_NUM}" -screen 0 1280x900x24 > "${XVFB_LOG}" 2>&1 &
sleep 2
pgrep -f "Xvfb :${DISPLAY_NUM}[[:space:]]" > /dev/null \
  || { echo "--- ${XVFB_LOG} 末尾 ---" >&2; tail -10 "${XVFB_LOG}" >&2; die "Xvfb の起動に失敗しました"; }
echo "[OK] Xvfb: :${DISPLAY_NUM}"

# --- 2) x11vnc（localhostのみ・パスワード無し＝SSHトンネル前提） ---
echo "x11vnc を起動します（localhost:${VNC_PORT}）..."
nohup x11vnc -display ":${DISPLAY_NUM}" -rfbport "${VNC_PORT}" -nopw -localhost -shared -forever \
  > "${VNC_LOG}" 2>&1 &
sleep 1
lsof -ti:"${VNC_PORT}" 2>/dev/null | grep -q . \
  || { echo "--- ${VNC_LOG} 末尾 ---" >&2; tail -10 "${VNC_LOG}" >&2; die "x11vnc の起動に失敗しました"; }
echo "[OK] VNC: localhost:${VNC_PORT}"

# --- 3) Chromium（GUI・拡張機能ロード・ログインページを開く） ---
echo "Chromiumを起動します..."
echo "  binary:    ${CHROME_BIN}"
echo "  拡張機能:  ${EXTENSION_DIR}"
mkdir -p "$LOGIN_PROFILE" "$(dirname "$WS_FILE")" "$(dirname "$CHROME_LOG")"

CHROME_ARGS=(
  --remote-debugging-port="${DEBUG_PORT}"
  --user-data-dir="${LOGIN_PROFILE}"
  --load-extension="${EXTENSION_DIR}"
  --no-first-run
  --no-default-browser-check
  --window-size=1280,900
  --enable-logging=stderr
)
if [ "$NO_SANDBOX" = "true" ]; then
  CHROME_ARGS+=(--no-sandbox)
fi

DISPLAY=":${DISPLAY_NUM}" nohup "$CHROME_BIN" "${CHROME_ARGS[@]}" \
  "https://www.db.yugioh-card.com/yugiohdb/?request_locale=ja" \
  > "${CHROME_LOG}" 2>&1 &

# --- 起動成否チェック（最大15秒ポーリング） ---
if fetch_ws_url "$DEBUG_PORT" "$WS_FILE" 15; then
  echo "[OK] Chromiumを起動しました（ポート ${DEBUG_PORT}）"
  echo "[OK] WebSocket: $(cat "${WS_FILE}")"
else
  echo "[NG] Chromiumの起動に失敗しました（ポート ${DEBUG_PORT} でCDP応答なし）" >&2
  echo "--- ${CHROME_LOG} 末尾 ---" >&2
  tail -20 "${CHROME_LOG}" >&2
  die "ログを確認してください: ${CHROME_LOG}"
fi

echo ""
echo "=== ログイン用スタック起動完了 ==="
echo "Xvfb      : :${DISPLAY_NUM}"
echo "VNC       : localhost:${VNC_PORT}（SSHトンネル: ssh -L ${VNC_PORT}:localhost:${VNC_PORT} <このホスト>）"
echo "Chromium  : ポート ${DEBUG_PORT} / プロファイル: ${LOGIN_PROFILE}"
echo "ws file   : ${WS_FILE}"
echo "停止      : ./stop-login-vnc.sh"

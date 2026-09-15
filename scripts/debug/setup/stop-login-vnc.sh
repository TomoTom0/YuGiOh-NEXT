#!/bin/bash
# 手動ログイン用ブラウザスタックの停止スクリプト（Chromium + x11vnc + Xvfb）
# portとdisplay番号で特定したプロセスのみ終了する

set -u

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BROWSER_CONFIG="${PROJECT_ROOT}/configs/browser.toml"
# shellcheck source=lib/browser-config.sh
source "${PROJECT_ROOT}/scripts/debug/setup/lib/browser-config.sh"

DISPLAY_NUM=$(read_cfg login-vnc display)
VNC_PORT=$(read_cfg login-vnc port)
DEBUG_PORT=$(read_cfg chrome debug_port)
[ -n "$DISPLAY_NUM" ] || die "configs/browser.toml の login-vnc.display が読み取れません"
[ -n "$VNC_PORT" ] || die "configs/browser.toml の login-vnc.port が読み取れません"
[ -n "$DEBUG_PORT" ] || die "configs/browser.toml の chrome.debug_port が読み取れません"

echo "=== Login VNC Browser Stack Stop ==="

stopped=0

# 1) Chromium（デバッグポートをlistenするプロセスのみ）
if stop_port "$DEBUG_PORT"; then
  echo "[OK] Chromiumを終了しました（ポート ${DEBUG_PORT}）"
  stopped=1
else
  echo "Chromiumは起動していません（ポート ${DEBUG_PORT}）"
fi

# 2) x11vnc（VNCポートをlistenするプロセスのみ）
if stop_port "$VNC_PORT"; then
  echo "[OK] x11vncを終了しました（ポート ${VNC_PORT}）"
  stopped=1
else
  echo "x11vncは起動していません（ポート ${VNC_PORT}）"
fi

# 3) Xvfb（display番号で一意に特定）
if pkill -f "Xvfb :${DISPLAY_NUM}[[:space:]]"; then
  echo "[OK] Xvfbを終了しました（:${DISPLAY_NUM}）"
  stopped=1
else
  echo "Xvfbは起動していません（:${DISPLAY_NUM}）"
fi

sleep 1
if [ "$stopped" -eq 0 ]; then
  echo "停止対象のプロセスはありませんでした"
fi

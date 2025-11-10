#!/bin/bash
# 調査用Chromeブラウザの停止スクリプト

DEBUG_PORT=9222

echo "=== Chromium Debug Browser Stop ==="

# デバッグChromiumプロセスを終了
if pgrep -f "chromium.*remote-debugging-port=${DEBUG_PORT}" > /dev/null; then
  echo "Chromiumを終了します..."
  pkill -f "chromium.*remote-debugging-port=${DEBUG_PORT}"
  sleep 2
  echo "✓ Chromiumを終了しました"
else
  echo "✗ Chromiumは起動していません"
fi

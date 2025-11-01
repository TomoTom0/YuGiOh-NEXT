#!/bin/bash
# 調査用Chromeブラウザの停止スクリプト

DEBUG_PORT=9222

echo "=== Chrome Debug Browser Stop ==="

# デバッグChromeプロセスを終了
if pgrep -f "chrome.*remote-debugging-port=${DEBUG_PORT}" > /dev/null; then
  echo "Chromeを終了します..."
  pkill -f "chrome.*remote-debugging-port=${DEBUG_PORT}"
  sleep 2
  echo "✓ Chromeを終了しました"
else
  echo "✗ Chromeは起動していません"
fi

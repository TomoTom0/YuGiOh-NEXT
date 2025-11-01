#!/bin/bash
# 調査用Chromeブラウザの起動スクリプト

PROFILE_DIR=".chrome_cache"
DEBUG_PORT=9222
WS_FILE=".chrome_playwright_ws"

echo "=== Chrome Debug Browser Setup ==="
echo ""

# 既存のデバッグChromeプロセスを確認
if pgrep -f "chrome.*remote-debugging-port=${DEBUG_PORT}" > /dev/null; then
  echo "✓ Chromeは既に起動しています"
  
  # WebSocket接続情報を更新
  curl -s http://localhost:${DEBUG_PORT}/json | jq -r '.[0].webSocketDebuggerUrl' > ${WS_FILE}
  echo "✓ WebSocket接続情報を更新しました: $(cat ${WS_FILE})"
else
  echo "Chromeを起動します..."
  
  # Chromeをリモートデバッグモードで起動
  google-chrome \
    --remote-debugging-port=${DEBUG_PORT} \
    --user-data-dir=${PROFILE_DIR} \
    --no-first-run \
    --no-default-browser-check \
    > /dev/null 2>&1 &
  
  # 起動を待つ
  sleep 3
  
  # WebSocket接続情報を保存
  curl -s http://localhost:${DEBUG_PORT}/json | jq -r '.[0].webSocketDebuggerUrl' > ${WS_FILE}
  
  echo "✓ Chromeを起動しました"
  echo "✓ プロファイル: ${PROFILE_DIR}"
  echo "✓ デバッグポート: ${DEBUG_PORT}"
  echo "✓ WebSocket: $(cat ${WS_FILE})"
fi

echo ""
echo "次の手順:"
echo "1. ブラウザで https://www.db.yugioh-card.com/yugiohdb/ にアクセス"
echo "2. ログインしてください"
echo "3. ログイン状態はプロファイルに保存されます"

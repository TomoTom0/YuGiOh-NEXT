#!/bin/bash
# 調査用Chromeブラウザの起動スクリプト

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PROFILE_DIR="${PROJECT_ROOT}/.chrome_cache"
EXTENSION_DIR="${HOME}/user/Mine/_chex/src_ygoNeuronHelper"
DEBUG_PORT=9222
WS_FILE="${PROJECT_ROOT}/.chrome_playwright_ws"

echo "=== Chromium Debug Browser Setup ==="
echo ""

# 既存のデバッグChromiumプロセスを確認
if pgrep -f "chromium.*remote-debugging-port=${DEBUG_PORT}" > /dev/null; then
  echo "✓ Chromiumは既に起動しています"
  
  # WebSocket接続情報を更新
  curl -s http://localhost:${DEBUG_PORT}/json | jq -r '.[0].webSocketDebuggerUrl' > ${WS_FILE}
  echo "✓ WebSocket接続情報を更新しました: $(cat ${WS_FILE})"
else
  echo "Chromiumを起動します..."

  # Chromiumをリモートデバッグモードで起動（拡張機能も読み込む）
  echo "拡張機能パス: ${EXTENSION_DIR}"

  # ログファイル
  CHROME_LOG="${PROJECT_ROOT}/tmp/chromium-debug.log"

  chromium-browser \
    --remote-debugging-port=${DEBUG_PORT} \
    --user-data-dir=${PROFILE_DIR} \
    --load-extension="${EXTENSION_DIR}" \
    --no-first-run \
    --no-default-browser-check \
    --enable-logging=stderr \
    --v=1 \
    --window-size=1280,900 \
    > "${CHROME_LOG}" 2>&1 &
  
  # 起動を待つ
  sleep 3
  
  # WebSocket接続情報を保存
  curl -s http://localhost:${DEBUG_PORT}/json | jq -r '.[0].webSocketDebuggerUrl' > ${WS_FILE}

  echo "✓ Chromiumを起動しました"
  echo "✓ プロファイル: ${PROFILE_DIR}"
  echo "✓ デバッグポート: ${DEBUG_PORT}"
  echo "✓ WebSocket: $(cat ${WS_FILE})"
  echo "✓ ログ: ${CHROME_LOG}"
fi

echo ""
echo "次の手順:"
echo "1. ブラウザで https://www.db.yugioh-card.com/yugiohdb/ にアクセス"
echo "2. ログインしてください"
echo "3. ログイン状態はプロファイルに保存されます"

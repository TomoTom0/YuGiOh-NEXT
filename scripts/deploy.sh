#!/bin/bash

# Chrome拡張のビルド成果物をデプロイ先にrsyncするスクリプト

set -e

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# .envファイルを読み込み
if [ ! -f .env ]; then
    echo "エラー: .envファイルが見つかりません"
    echo ".env.exampleをコピーして.envを作成してください"
    exit 1
fi

# .envから環境変数を読み込み
export $(grep -v '^#' .env | xargs)

# RSYNC_PATHが設定されているか確認
if [ -z "$RSYNC_PATH" ]; then
    echo "エラー: RSYNC_PATHが設定されていません"
    echo ".envファイルにRSYNC_PATHを設定してください"
    exit 1
fi

# パスを展開
DEPLOY_PATH=$(eval echo "$RSYNC_PATH")

echo "=== Chrome拡張デプロイスクリプト ==="
echo "デプロイ先: $DEPLOY_PATH"
echo ""

# ビルドディレクトリの確認
if [ ! -d dist ]; then
    echo "エラー: dist ディレクトリが見つかりません"
    echo "先に 'npm run build' を実行してください"
    exit 1
fi

# デプロイ先ディレクトリの作成
mkdir -p "$DEPLOY_PATH"

# rsyncでデプロイ
echo "ファイルを転送中..."
rsync -av --delete \
    --exclude='.DS_Store' \
    --exclude='*.map' \
    dist/ "$DEPLOY_PATH/"

echo ""
echo "✓ デプロイ完了"
echo "デプロイ先: $DEPLOY_PATH"

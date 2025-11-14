#!/bin/bash

# アイコン更新スクリプト
# tmp/ygo-next-icon.png から3サイズのアイコンを生成

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_ICON="$PROJECT_ROOT/tmp/ygo-next-icon.png"
ICONS_DIR="$PROJECT_ROOT/public/icons"

echo "=== アイコン更新スクリプト ==="

# ソースアイコンの存在確認
if [ ! -f "$SOURCE_ICON" ]; then
  echo "エラー: ソースアイコンが見つかりません: $SOURCE_ICON"
  exit 1
fi

# ImageMagickの確認
if ! command -v convert &> /dev/null; then
  echo "エラー: ImageMagick (convert) がインストールされていません"
  exit 1
fi

# アイコンディレクトリの作成
mkdir -p "$ICONS_DIR"

echo "ソースアイコン: $SOURCE_ICON"
echo "出力先: $ICONS_DIR"
echo ""

# 16x16アイコン生成
echo "生成中: icon16.png (16x16)"
convert "$SOURCE_ICON" -resize 16x16 "$ICONS_DIR/icon16.png"

# 48x48アイコン生成
echo "生成中: icon48.png (48x48)"
convert "$SOURCE_ICON" -resize 48x48 "$ICONS_DIR/icon48.png"

# 128x128アイコン生成
echo "生成中: icon128.png (128x128)"
convert "$SOURCE_ICON" -resize 128x128 "$ICONS_DIR/icon128.png"

echo ""
echo "✓ アイコン生成完了"
echo ""

# ファイルサイズ表示
(cd "$ICONS_DIR" && ls -lh icon*.png | awk '{print $9, "-", $5}')

echo ""
echo "次のステップ:"
echo "  npm run build"
echo "  ./scripts/deploy.sh"

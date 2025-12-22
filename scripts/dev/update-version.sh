#!/bin/bash

# バージョン更新スクリプト
# Usage: ./scripts/dev/update-version.sh <version_or_level>
# Example: ./scripts/dev/update-version.sh 0.4.1
# Example: ./scripts/dev/update-version.sh patch
# Example: ./scripts/dev/update-version.sh minor
# Example: ./scripts/dev/update-version.sh major

set -e

if [ -z "$1" ]; then
  echo "Error: Version number or level required"
  echo "Usage: $0 <version|patch|minor|major>"
  echo "Example: $0 0.4.1"
  echo "Example: $0 patch"
  exit 1
fi

INPUT=$1
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# package.json から現在のバージョンを取得
CURRENT_VERSION=$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$ROOT_DIR/package.json")

# バージョンレベル指定の場合は自動計算
case "$INPUT" in
  patch|minor|major)
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    case "$INPUT" in
      patch)
        PATCH=$((PATCH + 1))
        ;;
      minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
      major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    esac
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
    echo "Current version: $CURRENT_VERSION"
    echo "Updating to: $NEW_VERSION ($INPUT)"
    ;;
  *)
    NEW_VERSION=$INPUT
    echo "Updating version to: $NEW_VERSION"
    ;;
esac

# package.json を更新
if [ -f "$ROOT_DIR/package.json" ]; then
  perl -pi -e "s/(\"version\":\s*)\"[^\"]*\"/\$1\"$NEW_VERSION\"/" "$ROOT_DIR/package.json"
  echo "✓ Updated package.json"
fi

# public/manifest.json を更新
if [ -f "$ROOT_DIR/public/manifest.json" ]; then
  perl -pi -e "s/(\"version\":\s*)\"[^\"]*\"/\$1\"$NEW_VERSION\"/" "$ROOT_DIR/public/manifest.json"
  echo "✓ Updated public/manifest.json"
fi

# CHANGELOG処理
CHANGELOG_DIR="$ROOT_DIR/docs/changelog"
UNRELEASED_FILE="$CHANGELOG_DIR/unreleased.md"
NEW_CHANGELOG_FILE="$CHANGELOG_DIR/v$NEW_VERSION.md"

if [ -f "$UNRELEASED_FILE" ]; then
  # 今日の日付を取得（YYYY-MM-DD形式）
  TODAY=$(date '+%Y-%m-%d')

  # unreleased.md を v{バージョン}.md にリネーム
  # ヘッダー行を新バージョン用に更新
  sed "s/^# 次期バージョン（未リリース）/# v$NEW_VERSION ($TODAY)/" "$UNRELEASED_FILE" > "$NEW_CHANGELOG_FILE"

  echo "✓ Created $NEW_CHANGELOG_FILE"

  # 新しい unreleased.md テンプレートを作成
  cat > "$UNRELEASED_FILE" << 'EOF'
# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

（変更内容をここに記載）

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

（変更内容をここに記載）

## Internal Improvements

（変更内容をここに記載）

## Known Issues

（変更内容をここに記載）
EOF

  echo "✓ Created new unreleased.md template"
fi

echo ""
echo "Version updated successfully to $NEW_VERSION"
echo ""
echo "Updated files:"
echo "  - package.json"
echo "  - public/manifest.json"
echo "  - $NEW_CHANGELOG_FILE (created)"
echo "  - unreleased.md (reset)"

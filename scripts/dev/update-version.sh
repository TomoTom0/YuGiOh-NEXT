#!/bin/bash

# バージョン更新スクリプト
# Usage: ./scripts/dev/update-version.sh <new_version>
# Example: ./scripts/dev/update-version.sh 0.4.1

set -e

if [ -z "$1" ]; then
  echo "Error: Version number required"
  echo "Usage: $0 <version>"
  echo "Example: $0 0.4.1"
  exit 1
fi

NEW_VERSION=$1
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Updating version to: $NEW_VERSION"

# version.dat を更新
echo "$NEW_VERSION" > "$ROOT_DIR/version.dat"
echo "✓ Updated version.dat"

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

echo ""
echo "Version updated successfully to $NEW_VERSION"
echo ""
echo "Updated files:"
echo "  - version.dat"
echo "  - package.json"
echo "  - public/manifest.json"

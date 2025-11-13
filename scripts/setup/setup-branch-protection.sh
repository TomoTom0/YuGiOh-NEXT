#!/bin/bash

# ブランチ保護ルール設定スクリプト
# GitHub APIを使用してmain/devブランチの保護を設定

set -e

REPO="TomoTom0/ygo-neuron-helper"

echo "=== ブランチ保護ルール設定 ==="
echo "リポジトリ: $REPO"
echo ""

# mainブランチの保護設定
echo "--- mainブランチの保護設定 ---"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/main/protection" \
  -f required_status_checks='{
    "strict": true,
    "contexts": ["check-branch-policy"]
  }' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='null' \
  -f restrictions='null' \
  -f required_linear_history=false \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_conversation_resolution=true \
  -f lock_branch=false \
  -f allow_fork_syncing=false \
  -f required_signatures=true

echo "✓ mainブランチの保護設定が完了しました"
echo ""

# devブランチの保護設定
echo "--- devブランチの保護設定 ---"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/dev/protection" \
  -f required_status_checks='{
    "strict": true,
    "contexts": ["check-branch-policy"]
  }' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='null' \
  -f restrictions='null' \
  -f required_linear_history=false \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f block_creations=false \
  -f required_conversation_resolution=true \
  -f lock_branch=false \
  -f allow_fork_syncing=false \
  -f required_signatures=true

echo "✓ devブランチの保護設定が完了しました"
echo ""

echo "=== 設定完了 ==="
echo ""
echo "設定内容の確認:"
echo "  main: gh api repos/$REPO/branches/main/protection"
echo "  dev:  gh api repos/$REPO/branches/dev/protection"

#!/bin/bash

# ブランチ保護ルール設定スクリプト
# GitHub APIを使用してmain/devブランチの保護を設定

set -e

REPO="TomoTom0/YuGiOh-NEXT"

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
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check-branch-policy"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false,
  "required_signatures": true
}
EOF

echo "✓ mainブランチの保護設定が完了しました"
echo ""

# devブランチの保護設定
echo "--- devブランチの保護設定 ---"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/dev/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check-branch-policy"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false,
  "required_signatures": true
}
EOF

echo "✓ devブランチの保護設定が完了しました"
echo ""

echo "=== 設定完了 ==="
echo ""
echo "設定内容の確認:"
echo "  main: gh api repos/$REPO/branches/main/protection"
echo "  dev:  gh api repos/$REPO/branches/dev/protection"

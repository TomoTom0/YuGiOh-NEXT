# ブランチ保護ルール

## ブランチ戦略

```
main (本番環境)
  ↑ PR (devからのみ、手動運用)
dev (開発統合環境)
  ↑ PR (feature/fix/docsブランチから)
feature/*, fix/*, docs/* (開発ブランチ)
```

## 保護ルール

### mainブランチ（最も厳格）

- **直接push禁止**: PRを通してのみマージ可能
- **devブランチからのみマージ可**: GitHub Actionsで強制
- **ステータスチェック必須**: branch-policy チェックがPass必要
- **署名済みコミット必須**: verified commitsのみ受付
- **force push禁止**: 履歴改変を防止
- **削除禁止**: ブランチ削除を防止
- **管理者も従う**: リポジトリオーナーも保護ルールに従う
- **会話解決必須**: PR内のコメントを全て解決してからマージ

**運用ルール**:
- devブランチからのPRのみ受け付け（手動で徹底）
- マージ方法: Squash and merge推奨
- リリースタグ: マージ後に`v0.x.x`タグを付与

### devブランチ（中程度）

- **直接push禁止**: PRを通してのみマージ可能
- **feature/fix/docsブランチからのみマージ可**: GitHub Actionsで強制
- **ステータスチェック必須**: branch-policy チェックがPass必要
- **署名済みコミット必須**: verified commitsのみ受付
- **force push禁止**: 履歴改変を防止
- **削除禁止**: ブランチ削除を防止
- **会話解決必須**: PR内のコメントを全て解決してからマージ

**運用ルール**:
- feature/fix/docsブランチからのPRを受け付け
- マージ方法: Merge commit推奨
- 定期的にmainへPRを作成

### featureブランチ（保護なし）

開発の柔軟性を保つため保護ルールは適用しない

## 設定方法

```bash
# ブランチ保護ルールを設定
./scripts/setup/setup-branch-protection.sh

# 設定確認
gh api repos/TomoTom0/ygo-neuron-helper/branches/main/protection
gh api repos/TomoTom0/ygo-neuron-helper/branches/dev/protection
```

## 署名済みコミットの設定

### SSH署名（推奨）

```bash
# SSH署名を有効化
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true

# GitHubにSSH公開鍵を登録
# Settings → SSH and GPG keys → New SSH key → Key type: Signing Key
```

### GPG署名

```bash
# GPGキーを生成
gpg --full-generate-key

# GPGキーをリスト表示
gpg --list-secret-keys --keyid-format=long

# 公開鍵をエクスポート
gpg --armor --export YOUR_KEY_ID

# GitHubに公開鍵を登録
# Settings → SSH and GPG keys → New GPG key

# Gitに署名を設定
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

## 注意事項

### 一人開発での制約

- **承認必須は設定しない**: 自分のPRを自分で承認できないため
- **PRは必須**: 直接pushは禁止して、変更履歴を明確に保つ
- **署名必須**: コミットの真正性を保証

### mainへのマージ制限

GitHub Actionsワークフローで実現しています：

- `.github/workflows/branch-protection.yml`
  - mainへのPRはdevからのみ許可
  - devへのPRはfeature/fix/docs/refactor/testブランチから許可
  - このワークフローのステータスチェックが必須に設定されている

**仕組み**:
1. PRが作成されるとワークフローが実行
2. baseブランチとheadブランチをチェック
3. ポリシー違反の場合は失敗→マージ不可
4. ポリシー準拠の場合は成功→マージ可能

## トラブルシューティング

### コミットがverifiedにならない

SSH/GPG署名が設定されていない場合、上記の「署名済みコミットの設定」を実施してください。

### 既存のコミットに署名を追加

```bash
git rebase --exec 'git commit --amend --no-edit -n -S' -i HEAD~N
```

### 緊急時にmainへ直接pushしたい

1. GitHub Web UI → Settings → Branches → main
2. "Do not allow bypassing the above settings"を一時的に無効化
3. 緊急対応を実施
4. 再度有効化

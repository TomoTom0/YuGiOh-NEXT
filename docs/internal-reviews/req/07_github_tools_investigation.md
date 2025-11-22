# GitHub CLI・API活用ツール導入検討依頼書

**作成日時**: 2025-11-18  
**対象**: GitHub操作の自動化・効率化  
**レビュー目的**: 複雑なGitHub操作を効率化するツール導入の必要性調査  
**レポート出力先**: `docs/internal-reviews/reports/github-tools-analysis.md`

## 背景

本プロジェクトでは、PRレビューへの返信やレビュー結果の取得など、GitHub APIを複雑に実行する必要がある操作が発生しています。現状では`gh api`コマンドを直接実行していますが、以下の課題があります：

1. **複雑なAPIコール**: JSONの構築、ページネーション処理が煩雑
2. **繰り返し作業**: 類似の操作を何度も手動実行
3. **エラーハンドリング**: APIエラー時の対処が不十分
4. **知識の属人化**: GitHub APIの仕様を理解している人に依存

今回のPRレビュー対応で明らかになった課題：
- 各レビューコメントへの個別返信が煩雑
- コメントIDの取得→返信投稿の2段階操作
- レスポンスのパースとエラー処理

## レビュー依頼項目

### 1. 現状のGitHub操作パターン調査

#### 1-1. 頻出する操作の洗い出し

**確認観点**:
- [ ] PRレビュー関連操作
  - レビューコメント一覧取得
  - 個別コメントへの返信
  - レビュー承認/変更要求
  - レビューコメントの解決
  
- [ ] PR操作
  - PR作成
  - PR更新（タイトル、説明、ラベル）
  - PRマージ
  - PR検索・フィルタ
  
- [ ] イシュー操作
  - イシュー作成
  - イシュー更新（ラベル、アサイン、マイルストーン）
  - イシュー検索
  
- [ ] その他
  - Workflow実行状況確認
  - リリースノート生成
  - コミット情報取得

**調査方法**:
```bash
# Git履歴から`gh`コマンドの使用状況を抽出
git log --all --oneline --grep="gh " 
git log --all -p | grep -A 5 "gh api"
git log --all -p | grep -A 5 "gh pr"

# tasks/, docs/のドキュメントから手動操作手順を抽出
grep -r "gh " tasks/ docs/
```

**期待する成果物**:
```markdown
# GitHub操作パターン分析結果

## 頻出操作（月1回以上）

### PRレビュー関連
1. **レビューコメント返信** (今回実施)
   - 頻度: PR毎（週1-2回）
   - 複雑度: 高（コメントID取得→返信投稿）
   - 現状の問題: 各コメントへの個別操作が必要
   
2. **PRマージ**
   - 頻度: 週2-3回
   - 複雑度: 低（`gh pr merge`）
   - 現状の問題: 特になし

### イシュー管理
1. **イシュー一括更新**
   - 頻度: 月1-2回（マイルストーン移動等）
   - 複雑度: 中（複数イシューへの同一操作）
   - 現状の問題: 手動で1つずつ実行

## 低頻度操作（月1回未満）

- リリースノート生成: 四半期に1回
- Workflow手動実行: 不定期
```

#### 1-2. 現状の問題点整理

**確認観点**:
- [ ] 時間コストが高い操作
- [ ] ミスが発生しやすい操作
- [ ] 自動化で効果が大きい操作

**期待する成果物**:
```markdown
# 現状の問題点

## 高コスト操作（自動化の効果大）

### PRレビューコメント返信
**現状**: 各コメントに個別返信
\`\`\`bash
# コメントID取得
gh api repos/TomoTom0/YuGiOh-NEXT/pulls/10/comments | jq '.[] | {id, path, line}'

# 各コメントに返信（3つのコメントで3回実行）
gh api -X POST repos/.../pulls/10/comments/ID1/replies -f body="..."
gh api -X POST repos/.../pulls/10/comments/ID2/replies -f body="..."
gh api -X POST repos/.../pulls/10/comments/ID3/replies -f body="..."
\`\`\`

**問題**:
- 手作業で3回コマンド実行
- IDの手動コピペ（ミスの可能性）
- 返信内容の重複入力

**理想**:
\`\`\`bash
# 1コマンドで全返信
gh-reply-all 10 --template "修正しました。ご確認ください。"
# または対話式
gh-review-reply 10
\`\`\`

---

## ミスが発生しやすい操作

### 複雑なJSON構築
**現状**: `gh api` でJSON直接指定
\`\`\`bash
gh api -X POST repos/.../issues -f title="..." -f body="..." -f labels='["bug","high"]'
\`\`\`

**問題**:
- JSON配列の引用符エスケープ
- 複雑なネストの記述ミス

**理想**:
- YAMLやテンプレートファイルから生成
- 対話式入力
```

### 2. ツール導入の選択肢調査

#### 2-1. 既存ツールの調査

**候補ツール**:

##### A. GitHub CLI拡張 (`gh extension`)

**確認事項**:
- [ ] 既存の拡張で要件を満たすものがあるか
  - [gh-dash](https://github.com/dlvhdr/gh-dash): TUIダッシュボード
  - [gh-poi](https://github.com/seachicken/gh-poi): PR開発支援
  - [gh-fzf](https://github.com/benelan/gh-fzf): fzfインタラクティブ操作
  
- [ ] カスタム拡張の作成可能性
  - Bash/Shellスクリプト
  - Go（ghコマンドはGo製）

**調査方法**:
```bash
# インストール済み拡張確認
gh extension list

# 拡張検索
gh extension browse

# 特定拡張の調査
gh extension install dlvhdr/gh-dash
gh dash  # 試用
```

**期待する成果物**:
```markdown
# 既存ツール調査結果

## 要件を満たす既存拡張

### gh-dash
- **用途**: PR/イシューの一覧表示・操作
- **機能**: 
  - TUIでPR/イシュー閲覧
  - キーボードショートカットで操作
  - フィルタ・検索
- **評価**: ✅ ダッシュボードとして有用だが、一括操作は限定的
- **導入推奨**: Yes（閲覧用途）

### gh-fzf
- **用途**: fzfでのインタラクティブ選択
- **機能**:
  - PR/イシュー/ブランチをfzfで選択
  - 選択後の操作（チェックアウト、マージ等）
- **評価**: ✅ 選択操作の効率化に有効
- **導入推奨**: Yes

## 要件を満たさない領域

- レビューコメントへの一括返信: 既存拡張なし
- イシューの一括更新: 既存拡張なし
→ カスタム拡張が必要
```

##### B. スクリプト化（Bash/Shell）

**確認事項**:
- [ ] シンプルな操作の自動化
- [ ] `gh api` + `jq` の組み合わせ
- [ ] `scripts/` ディレクトリへの配置

**期待する成果物**:
```bash
#!/bin/bash
# scripts/gh-reply-all.sh
# 全レビューコメントに同一内容で返信

PR_NUMBER=$1
REPLY_BODY=$2

# レビューコメント一覧取得
COMMENTS=$(gh api "repos/TomoTom0/YuGiOh-NEXT/pulls/$PR_NUMBER/comments" --jq '.[] | {id, path, line}')

# 各コメントに返信
echo "$COMMENTS" | jq -r '.id' | while read COMMENT_ID; do
  echo "Replying to comment $COMMENT_ID..."
  gh api -X POST \
    "repos/TomoTom0/YuGiOh-NEXT/pulls/comments/$COMMENT_ID/replies" \
    -f body="$REPLY_BODY"
done

echo "All replies sent."
```

##### C. Node.js/TypeScriptツール

**確認事項**:
- [ ] プロジェクトと同じ技術スタック
- [ ] Octokitライブラリの活用
- [ ] 複雑なロジックへの対応

**期待する成果物**:
```typescript
// tools/gh-review-tools.ts
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function replyToAllReviewComments(
  owner: string,
  repo: string,
  prNumber: number,
  replyBody: string
) {
  // レビューコメント取得
  const { data: comments } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
  });

  // 各コメントに返信
  for (const comment of comments) {
    await octokit.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      comment_id: comment.id,
      body: replyBody,
    });
    console.log(`Replied to comment ${comment.id}`);
  }
}
```

##### D. 専用CLIツールの作成（Go）

**確認事項**:
- [ ] `gh` コマンドと同様のUX
- [ ] パフォーマンス要件
- [ ] 保守コスト

**評価**:
- メリット: 高速、バイナリ配布可能
- デメリット: Go学習コスト、本プロジェクトと技術スタック不一致
- 推奨度: 低（よほど高頻度でない限り不要）

#### 2-2. 導入候補の比較

**期待する成果物**:
```markdown
# ツール比較表

| 方式 | 開発コスト | 保守性 | 柔軟性 | 技術スタック | 推奨度 |
|------|------------|--------|--------|--------------|--------|
| 既存gh拡張 | ⭐低 | ⭐⭐⭐高 | ⭐低 | N/A | 🟡中 |
| Bashスクリプト | ⭐⭐低-中 | ⭐⭐中 | ⭐⭐中 | Bash | 🟢高 |
| Node.js | ⭐⭐⭐中-高 | ⭐⭐⭐高 | ⭐⭐⭐高 | TypeScript | 🟢高 |
| Goツール | ⭐⭐⭐⭐高 | ⭐⭐中 | ⭐⭐⭐高 | Go | 🔴低 |

## 推奨戦略

### Phase 1: 既存拡張の活用
- `gh-dash`: ダッシュボード・閲覧用
- `gh-fzf`: インタラクティブ選択

### Phase 2: シンプルなスクリプト化
- `scripts/gh-reply-all.sh`: レビューコメント一括返信
- `scripts/gh-issue-bulk-update.sh`: イシュー一括更新

### Phase 3: 複雑な処理のNode.js化（必要に応じて）
- `tools/github/`: GitHub操作ツール群
- Octokitベースの柔軟な処理
```

### 3. 導入効果の定量評価

#### 3-1. 作業時間削減の試算

**確認観点**:
- [ ] 現状の所要時間
- [ ] ツール導入後の所要時間
- [ ] 頻度からの総削減時間

**期待する成果物**:
```markdown
# 作業時間削減試算

## レビューコメント返信

### 現状
- コメント数: 3個
- 1個あたりの作業時間: 2分（ID確認、コマンド実行、確認）
- 合計: 6分/回
- 頻度: PR毎（週2回）
- **月間コスト: 48分**

### ツール導入後
- 作業時間: 1分（1コマンド実行のみ）
- **月間コスト: 8分**
- **月間削減: 40分**

---

## イシュー一括更新

### 現状
- イシュー数: 10個
- 1個あたりの作業時間: 1分
- 合計: 10分/回
- 頻度: 月1回
- **月間コスト: 10分**

### ツール導入後
- 作業時間: 2分（スクリプト実行のみ）
- **月間コスト: 2分**
- **月間削減: 8分**

---

## 総計
**月間削減時間: 48分**
**年間削減時間: 約10時間**

※ 開発コスト（5-10時間）を考慮すると、1-2年で回収
```

#### 3-2. エラー削減効果

**確認観点**:
- [ ] 手動操作でのミス発生頻度
- [ ] ツール化によるミス削減

**期待する成果物**:
```markdown
# エラー削減効果

## 手動操作時のエラー発生状況

- コメントID間違い: 月0-1回
- JSON記法ミス: 月1-2回
- APIパラメータ誤り: 月0-1回

**平均: 月2回のエラー**
**1回あたりの修正時間: 5分**
**月間ロス: 10分**

## ツール化によるエラー削減

- スクリプトによる自動化 → エラーほぼゼロ
- テンプレート化 → JSON記法ミスゼロ

**月間削減: 10分**
```

### 4. 具体的な導入計画

#### 4-1. 優先順位付き実装リスト

**期待する成果物**:
```markdown
# 実装優先順位

## 🔴 Phase 1: 即座に導入（工数: 2-3時間）

### 1. 既存拡張のインストール
- [ ] `gh-dash` - ダッシュボード
- [ ] `gh-fzf` - インタラクティブ操作
- 工数: 30分（試用含む）

### 2. レビューコメント一括返信スクリプト
- [ ] `scripts/gh-reply-all.sh`
- 機能: 全コメントに同一返信
- 工数: 1時間

### 3. 使用方法ドキュメント
- [ ] `docs/dev/github-tools.md`
- 工数: 1時間

---

## 🟡 Phase 2: 短期導入（工数: 5-8時間）

### 1. イシュー一括更新スクリプト
- [ ] `scripts/gh-issue-bulk-update.sh`
- 機能: ラベル・マイルストーン一括変更
- 工数: 2時間

### 2. PR情報取得ツール
- [ ] `scripts/gh-pr-summary.sh`
- 機能: PR変更ファイル一覧、統計情報
- 工数: 2時間

### 3. テンプレート機能
- [ ] `.github/reply-templates/` - 返信テンプレート
- 工数: 1時間

---

## 🟢 Phase 3: 中長期（必要に応じて）

### 1. Node.jsツール化
- [ ] `tools/github/` - 複雑な処理
- Octokitベース
- 工数: 10時間以上

### 2. CI連携
- [ ] Workflow自動実行
- [ ] レビュー結果の自動集計
- 工数: 5時間以上
```

#### 4-2. 実装ガイドライン

**期待する成果物**:
```markdown
# 実装ガイドライン

## ディレクトリ構成

\`\`\`
scripts/
├── github/              # GitHub操作スクリプト
│   ├── gh-reply-all.sh
│   ├── gh-issue-bulk-update.sh
│   └── gh-pr-summary.sh
└── README.md            # スクリプト使用方法

tools/
└── github/              # 複雑な処理（Node.js）
    ├── src/
    ├── package.json
    └── README.md

.github/
└── reply-templates/     # 返信テンプレート
    ├── fixed.md
    ├── confirmed.md
    └── question.md
\`\`\`

## 命名規則

- スクリプト: `gh-<operation>-<target>.sh`
- 例: `gh-reply-all.sh`, `gh-issue-bulk-update.sh`

## 必須機能

1. **エラーハンドリング**: APIエラー時の適切なメッセージ
2. **Dry-run**: `--dry-run` オプションで実行前確認
3. **ヘルプ**: `--help` でusage表示
4. **ログ**: 実行内容のログ出力

## サンプル実装

\`\`\`bash
#!/bin/bash
# scripts/github/gh-reply-all.sh

set -e  # エラー時即座終了

# Usage表示
usage() {
  cat <<EOF
Usage: $0 [OPTIONS] PR_NUMBER REPLY_BODY

Options:
  --dry-run    実行せずに確認のみ
  --help       このヘルプを表示
  
Example:
  $0 10 "修正しました。"
  $0 --dry-run 10 "確認中"
EOF
  exit 1
}

# パラメータ解析
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --help) usage ;;
    *) break ;;
  esac
done

# ... 処理実装 ...
\`\`\`
```

### 5. 代替案・将来的な拡張

**期待する成果物**:
```markdown
# 代替案・将来的な拡張

## GitHub Actions活用

### 自動レビュー返信Bot
- トリガー: PRレビュー投稿時
- 動作: 定型文を自動返信
- 評価: 🟡 完全自動化は難しいが、テンプレート提示は可能

### レビュー集計レポート
- トリガー: 週次スケジュール
- 動作: レビュー統計をイシューに投稿
- 評価: 🟢 有用、実装優先度中

---

## VS Code拡張

- GitHub Pull Requests拡張の活用
- コメント返信をエディタ内で完結
- 評価: 🟢 既存拡張で十分

---

## LLM連携

- レビューコメントをLLMが読み、返信案を生成
- 評価: 🔴 現時点では過剰、将来的な検討課題
```

## 期待する成果物まとめ

1. **GitHub操作パターン分析レポート** (`tmp/reports/github-operations-analysis.md`)
   - 頻出操作一覧
   - 現状の問題点
   - 時間コスト試算

2. **ツール選定・比較書** (`docs/dev/github-tools-selection.md`)
   - 既存ツール調査結果
   - 方式比較（Bash vs Node.js等）
   - 推奨戦略

3. **実装計画書** (`docs/dev/github-tools-implementation-plan.md`)
   - Phase分け
   - 優先順位付き実装リスト
   - 工数見積もり

4. **実装ガイドライン** (`scripts/github/README.md`)
   - ディレクトリ構成
   - 命名規則
   - 必須機能

5. **初期実装スクリプト** (`scripts/github/gh-reply-all.sh`)
   - レビューコメント一括返信
   - 使用例・ドキュメント付き

## 備考

- Phase 1（既存拡張+簡単なスクリプト）から開始推奨
- 効果を確認しながら段階的に拡張
- 過度な自動化は避ける（柔軟性を保つ）
- 本プロジェクトでの実用頻度を重視

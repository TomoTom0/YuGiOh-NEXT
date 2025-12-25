# ドキュメント

遊戯王NEXT (遊戯王 Neuron EXTension) のドキュメントです。

## ディレクトリ構成

- **[usage/](./usage/)** - ユーザー向けガイド
- **[dev/](./dev/)** - 開発者向けドキュメント
- **[api/](./api/)** - API仕様
- **[changelog/](./changelog/)** - 変更履歴（リリースノート含む）
- **[design/](./design/)** - 設計ドキュメント
- **[testing/](./testing/)** - テスト関連
- **[research/](./research/)** - 調査・検証
- **[internal-reviews/](./internal-reviews/)** - 内部レビュー

## クイックリンク

- [使い方ガイド](./usage/README.md)
- [開発者ガイド](./dev/README.md)
- [API仕様](./api/README.md)
- [設計ドキュメント](./design/README.md)
- [変更履歴](./changelog/README.md)

---

## 常時更新が必要なドキュメント

コード変更時に更新を忘れやすいドキュメントを以下にリストアップします。変更内容に応じて該当するドキュメントを更新してください。

### 1. 変更履歴（必須）

**対象**: 全ての機能追加・変更・修正

| ファイル | タイミング | 内容 |
|---------|-----------|------|
| `changelog/unreleased.md` | 機能追加・変更・修正時 | 未リリースの変更を記載（リリース時に `v{version}.md` にリネーム） |

**更新方針**:
- タスク完了時に `tm finish <ID> --body "変更内容の説明"` で記録
- リリース準備時に `.claude/skills/release-prep.md` のワークフローに従って `unreleased.md` に集約
- 詳細は `.claude/skills/release-prep.md` 参照

### 2. 開発者向けドキュメント（dev/）

**対象**: アーキテクチャ・データモデル・内部仕様の変更

| ファイル | 更新タイミング | 内容 |
|---------|-------------|------|
| `dev/architecture.md` | アーキテクチャ変更時 | システム構成、コンポーネント構造、データフロー |
| `dev/data-models.md` | データモデル変更時 | 型定義、インターフェース、データ構造 |
| `dev/stores.md` | Pinia store 追加・変更時 | 状態管理の構造、各storeの責務 |
| `dev/cache-system.md` | キャッシュシステム変更時 | キャッシュ戦略、Indexed DB使用箇所 |
| `dev/png-format-spec.md` | PNGエクスポート形式変更時 | PNG metadata仕様、エクスポート形式 |
| `dev/testing.md` / `dev/testing-strategy.md` | テスト方針変更時 | テスト戦略、カバレッジ方針 |
| `dev/i18n.md` | 多言語対応変更時 | 翻訳方針、言語検出ロジック |
| `dev/official-api.md` | 公式API変更検知時 | APIエンドポイント、レスポンス形式 |

### 3. ユーザー向けドキュメント（usage/）

**対象**: UI変更・機能追加・操作方法の変更

| ファイル | 更新タイミング | 内容 |
|---------|-------------|------|
| `usage/custom-deck-edit.md` | デッキ編集画面のUI変更時 | カスタムデッキ編集画面の操作方法 |
| `usage/import-export.md` | インポート/エクスポート機能変更時 | デッキのインポート/エクスポート手順 |
| `usage/deck-metadata.md` | デッキメタデータ機能変更時 | サムネイル、タイトル、説明文の設定方法 |
| `usage/search-filter.md` | 検索フィルタ機能変更時 | 検索条件、フィルタ機能の使い方 |
| `usage/options.md` | オプション画面変更時 | 設定項目、テーマ切り替え等 |
| `usage/card-detail.md` | カード詳細表示変更時 | カード詳細の表示内容 |
| `usage/sort.md` | ソート機能変更時 | ソート機能の使い方 |

### 4. API仕様（api/）

**対象**: 公式API仕様の変更検知時

| ファイル | 更新タイミング | 内容 |
|---------|-------------|------|
| `api/card-search.md` | カード検索API変更時 | カード検索エンドポイント仕様 |
| `api/deck-detail-parser.md` | デッキ詳細API変更時 | デッキ詳細レスポンス解析 |
| `api/deck-recipe-image.md` | デッキ画像API変更時 | デッキ画像生成API仕様 |

### 5. プロジェクトルール（ルートディレクトリ）

**対象**: プロジェクトルール・規約の変更

| ファイル | 更新タイミング | 内容 |
|---------|-------------|------|
| `CLAUDE.md` | プロジェクト固有ルール変更時 | プロジェクト固有のコーディング規約、ワークフロー |
| `.claude/skills/` | ワークフロー追加時 | Agent Skills（リリース準備、PRレビュー対応等） |

---

## ドキュメント更新漏れチェック

ドキュメント更新漏れを防ぐために、以下のagent skillを使用してください。

**使用方法**:
```bash
# ~/.claude/skills/check-doc-updates.md を Skill として呼び出し
```

詳細は `~/.claude/skills/check-doc-updates.md` を参照。

---

## テスト構成

プロジェクトのテストは `tests/` ディレクトリで管理されています。

詳細は **[`tests/README.md`](../tests/README.md)** を参照してください。

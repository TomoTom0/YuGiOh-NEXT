# テスト構成

遊戯王NEXT (遊戯王 Neuron EXTension) のテストディレクトリです。

## テストディレクトリ構成

| ディレクトリ | 内容 | テストツール | 実行コマンド |
|------------|------|------------|------------|
| `unit/` | ユニットテスト（関数・ユーティリティ・store等） | Vitest | `bun run test:vitest` |
| `browser/` | ブラウザ自動テスト（UI操作、CDP経由） | Node.js + CDP | `bun run tmp/test-*.js` |
| `e2e/` | E2Eテスト（統合フロー） | Vitest + CDP | `bun run test:vitest tests/e2e/` |
| `combine/` | 統合テスト（複数コンポーネント） | Vitest | `bun run test:vitest tests/combine/` |
| `fixtures/` | テストフィクスチャ（テストデータ） | - | - |
| `sample/` | サンプルデータ（公式サイトのHTMLダウンロード済み） | - | - |

## 主要なユニットテストカテゴリ（unit/）

| サブディレクトリ | 対象 | テストファイル例 |
|---------------|------|---------------|
| `shuffle/` | シャッフル機能 | `shuffleCards.test.ts` |
| `utils/` | ユーティリティ関数（型ガード、DOM操作、デッキ処理等） | `type-guards.test.ts`, `safe-dom-query.test.ts` |
| `stores/` | Pinia store | `deck-edit-store.test.ts` |
| `components/` | Vue コンポーネント | `DeckEditPanel.test.ts` |
| `card-detail/` | カード詳細表示 | - |
| `composables/` | Vue composables | - |
| `content/` | Content scripts | - |
| `api/` | API関連 | - |
| `search-modes/` | 検索モード | - |
| `deck-display/` | デッキ表示 | - |
| `parser/` | パーサー | - |

---

## 常時更新が必要なテスト

コード変更時にテスト更新を忘れやすいケースを以下にリストアップします。変更内容に応じて該当するテストを追加・更新してください。

### テスト更新が必要なタイミング

| 変更内容 | 対象テストディレクトリ | 更新内容 | 優先度 |
|---------|---------------------|---------|--------|
| **ユーティリティ関数の追加** | `tests/unit/utils/` | 新規テストファイルを追加 | 必須 |
| **ユーティリティ関数の変更** | `tests/unit/utils/` | 既存テストを更新、新規テストケースを追加 | 必須 |
| **Pinia store の追加** | `tests/unit/stores/` | 新規テストファイルを追加 | 必須 |
| **Pinia store の変更** | `tests/unit/stores/` | 既存テストを更新、新規テストケースを追加 | 必須 |
| **Vue コンポーネントの追加** | `tests/unit/components/` | 新規テストファイルを追加 | 推奨 |
| **Vue コンポーネントの変更** | `tests/unit/components/` | 既存テストを更新 | 推奨 |
| **UI操作の追加** | `tests/browser/` | ブラウザ自動テストスクリプトを追加 | 推奨 |
| **UI操作の変更** | `tests/browser/` | ブラウザ自動テストスクリプトを更新 | 推奨 |
| **統合フローの変更** | `tests/e2e/` | E2Eテストを更新 | 推奨 |
| **データモデルの変更** | `tests/fixtures/` | フィクスチャデータを更新 | 推奨 |
| **バグ修正** | 該当するテストカテゴリ | 回帰テストを追加 | 必須 |

### テストファイルの命名規則

| テストタイプ | 命名規則 | 例 |
|------------|---------|-----|
| ユニットテスト | `<ソースファイル名>.test.ts` | `type-guards.test.ts` |
| ユニットテスト（複雑） | `<機能名>-<詳細>.test.ts` | `deck-import-comprehensive.test.ts` |
| ブラウザテスト | `test-<機能名>.js` | `test-buttons.js` |
| E2Eテスト | `<フロー名>.test.ts` | `deck-edit-export-import.test.ts` |

### 重要なテスト対象（必須）

以下の機能は品質に直結するため、必ずユニットテストを書く：

| 機能 | テストファイル | 理由 |
|------|-------------|------|
| 型ガード関数 | `tests/unit/utils/type-guards.test.ts` | 型安全性の要 |
| DOM操作ユーティリティ | `tests/unit/utils/safe-dom-query.test.ts` | null参照エラー防止 |
| デッキインポート/エクスポート | `tests/unit/utils/deck-import-comprehensive.test.ts` | データ損失防止 |
| PNG metadata処理 | `tests/unit/utils/png-metadata.test.ts` | デッキ復元の正確性 |
| URL state管理 | `tests/e2e/url-state-sync.test.ts` | 状態同期の正確性 |
| シャッフル機能 | `tests/unit/shuffle/shuffleCards.test.ts` | ランダム性の担保 |

---

## テスト実行コマンド

### ユニットテスト

```bash
# 全てのユニットテストを実行
bun run test:vitest

# 特定のテストファイルのみ実行
bun run test:vitest tests/unit/utils/type-guards.test.ts

# watchモード（開発中）
bun run test:vitest --watch

# カバレッジ付き実行
bun run test:vitest --coverage
```

### ブラウザ自動テスト

```bash
# ブラウザテスト実行前の準備
./scripts/debug/setup/start-chrome.sh

# 個別のブラウザテストを実行
bun run tests/browser/test-buttons.js
bun run tests/browser/test-shuffle.js

# 停止
./scripts/debug/setup/stop-chrome.sh
```

**重要**: ブラウザテストの詳細は `tests/browser/README.md` を参照。

### E2Eテスト

```bash
# E2Eテストを実行
bun run test:vitest tests/e2e/
```

---

## テスト作成ガイドライン

### 1. ソースコードから仕様を確認（厳守）

**禁止**:
- 推測でセレクタやクラス名を書くこと
- 推測でボタンの動作を決めること
- Vue/Piniaの内部プロパティ（`__vue_app__`, `$pinia._s`等）にアクセス

**必須**:
- ソースコードを読んで、実際に使用されているクラス名・属性・セレクタを確認
- イベントハンドラ関数の中身を読んで、実際の動作を確認
- 既存のテストスクリプト（`tests/browser/`, `tests/unit/`）を参考にする

### 2. テストデータの使用

公式サイトのHTMLやレスポンスデータは `tests/sample/` に保存済み。適当に調べるのではなく、`tests/sample/` に従ってテストする。

### 3. ブラウザテストの制約

- **Playwright MCP禁止** → Node.js + CDP（Chrome DevTools Protocol）を使用
- 詳細は `tests/browser/README.md` および `scripts/debug/setup/` 参照

---

## テスト更新漏れチェック

テスト更新漏れを防ぐために、以下のagent skillを使用してください。

**使用方法**:
```bash
# ~/.claude/skills/check-test-updates.md を Skill として呼び出し
```

詳細は `~/.claude/skills/check-test-updates.md` を参照。

---

## トラブルシューティング

### テストが失敗する

1. **ソースコードの変更が正しいか確認**
   - 変更内容を再確認
   - テストの期待値が変更に追従しているか確認

2. **依存関係の確認**
   - モックの設定が正しいか
   - テストフィクスチャが最新か

3. **テスト環境の確認**
   - `bun install` で依存関係を再インストール
   - ブラウザテストの場合、Chromiumが起動しているか確認

### テストの書き方が分からない

1. **既存のテストを参考にする**
   - `tests/unit/utils/` の既存テストを読む
   - 類似機能のテストをコピーして修正

2. **テストフレームワークのドキュメントを参照**
   - Vitest: https://vitest.dev/
   - CDP: `tests/browser/README.md`

### ブラウザテストが動かない

1. **Chromiumが起動しているか確認**
   ```bash
   ./scripts/debug/setup/start-chrome.sh
   ```

2. **WebSocket接続情報を確認**
   ```bash
   cat .chrome_playwright_ws
   ```

3. **詳細は `tests/browser/README.md` を参照**

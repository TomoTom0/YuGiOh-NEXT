# 開発ガイド

## テスト実行方法

### 全テストの実行

```bash
npm test
```

### 特定のテストスイートの実行

```bash
# ユニットテストのみ
npm test -- tests/unit/

# 結合テストのみ
npm test -- tests/combine/

# 特定のファイル
npm test -- tests/unit/language-detector.test.ts
```

### ウォッチモード

```bash
npm test -- --watch
```

### カバレッジレポート

```bash
npm test -- --coverage
```

## テスト構成

- `tests/unit/` - ユニットテスト
  - `language-detector.test.ts` - 言語検出機能
  - `mapping-manager.test.ts` - マッピング管理機能
  - `card-animation.test.ts` - カードアニメーション機能
  
- `tests/combine/` - 結合テスト
  - `parser/` - HTMLパーサーテスト
  - `deck-edit/` - デッキ編集機能テスト
  - `i18n/` - 多言語対応テスト

## コーディング規約

### デバッグログのルール

本プロジェクトでは、ログレベルの使い分けを以下のように定めています：

| ログレベル | 用途 | 本番環境 | 表示条件 |
|-----------|------|---------|---------|
| `console.debug()` | デバッグ用ログ | 一時的に残してOK | ブラウザのVerboseレベルを有効化した時のみ表示 |
| `console.log()` | 通常のログ | 削除必須 | 常に表示（本番では使用しない） |
| `console.warn()` | 警告メッセージ | 残す | 常に表示（潜在的な問題の検出に必要） |
| `console.error()` | エラーメッセージ | 残す | 常に表示（エラー発生時のログに必要） |

#### 推奨事項

**デバッグ中:**
```typescript
// ✅ 推奨: console.debug() を使用（一時的に残してOK）
console.debug('[MappingManager] Initializing for language:', lang);
console.debug('[handleSearch] Query:', query, 'Filters:', filters);
```

**本番前:**
- デバッグが完了したら、不要な `console.debug()` を削除
- `console.log()` は必ず削除
- `console.warn()` / `console.error()` は必要に応じて保持

詳細は [CLAUDE.md - デバッグログのルール](../../CLAUDE.md#デバッグログのルール) を参照してください。

## 開発用ツール

### session.example.env
セッション情報のテンプレート。
これをコピーして `.env.local` を作成し、実際のセッション情報を設定します。

## セッション情報の取得（必要に応じて）

1. Chromeで遊戯王公式サイトにログイン
2. F12でDevToolsを開く
3. Consoleタブで以下を実行:
```javascript
// セッション情報をコピー
copy(document.cookie)

// cgidを取得（デッキページで）
console.log('cgid:', document.querySelector('[name="cgid"]')?.value);

// ytknを取得（デッキ編集ページで）
console.log('ytkn:', document.querySelector('[name="ytkn"]')?.value);
```

### .env.local の作成

```bash
cp docs/dev/session.example.env .env.local
# エディタで .env.local を開いて、取得した値を設定
```

## 注意事項

⚠️ **セキュリティ**
- `.env.local` は絶対にGitにコミットしないこと
- セッション情報は個人情報なので厳重に管理
- 他人と共有しないこと

⚠️ **有効期限**
- セッション情報には有効期限があります
- 「セッションが無効」エラーが出たら再取得が必要

## 関連ドキュメント

### 設計・アーキテクチャ
- [公式API仕様](./official-api.md) - 遊戯王DB公式API のエンドポイント、パラメータ順序、注意事項
- [アーキテクチャ](./architecture.md) - システム構成とコンポーネント設計
- [キャッシュシステム](./cache-system.md) - 各種キャッシュの実装と管理方法

### 機能実装ガイド
- [多言語対応](./i18n.md) - 多言語対応の仕組みとマッピングテーブル
- [スクレイピング手順](./scraping.md) - 公式サイトからのデータ取得方法

### テスト・品質保証
- [テスト](./testing.md) - テスト戦略と実行方法（作成予定）
- [テスト戦略](./testing-strategy.md) - 段階的テスト実装計画

### 進行中の機能
- **デッキロード画面サムネイル表示機能** - v0.5.4+
  - 画像キャッシュ管理システム（Chrome Storage LRU）
  - デッキハッシュ計算ユーティリティ
  - WebP形式変換（Phase 4で実装予定）
  - 詳細は [v0.5.4 変更履歴](../changelog/v0.5.4.md) を参照

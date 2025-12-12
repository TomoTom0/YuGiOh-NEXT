# テストとドキュメントの追加検討依頼書

**作成日時**: 2025-11-18  
**対象**: PR #10マージ後のコードベース (v0.3.10 → v0.3.11)  
**レビュー目的**: 新機能に対する適切なテストカバレッジとドキュメント整備  
**レポート出力先**: `docs/internal-reviews/reports/test-doc-addition-plan.md`

## 背景

PR #10で追加された主要な新機能・モジュール：

### 新規コンポーネント (4件)
- `DeckMetadata.vue` (1,036行) - デッキメタデータ管理UI
- `ExportDialog.vue` (337行) - エクスポートダイアログ
- `ImportDialog.vue` (445行) - インポートダイアログ
- `OptionsDialog.vue` (317行) - 設定ダイアログ

### 新規ユーティリティ (7件)
- `page-detector.ts` (145行) - ページタイプ検出
- `url-builder.ts` (137行) - URL構築
- `url-state.ts` (166行) - URL状態管理
- `png-metadata.ts` (260行) - PNG tEXtチャンク操作
- `deck-export.ts` (185行) - デッキエクスポート
- `deck-import.ts` (481行) - デッキインポート
- `card-limit.ts` (45行) - カード制限チェック

### 新規ストア (1件)
- `settings.ts` (326行) - アプリケーション設定管理

### 新規スタイル (2件)
- `themes.css` (90行)
- `themes.ts` (142行)

### 既存モジュールの大幅拡張
- `stores/deck-edit.ts` - 大幅リファクタ
- `components/RightArea.vue` - メタデータタブ追加
- `components/DeckSection.vue` - D&D機能強化

## レビュー依頼項目

### A. ユニットテストの追加検討

#### A-1. 新規ユーティリティのテスト

**現状**: `page-detector.test.ts`のみ存在

**追加検討対象**:

##### 🔴 高優先度（複雑なロジック・外部依存）

- [ ] **`png-metadata.ts`**
  - PNG tEXtチャンク読み書きの正確性
  - 不正なPNGデータのハンドリング
  - 複数チャンクの処理
  - CRC検証
  - エッジケース（空データ、巨大データ）

- [ ] **`deck-import.ts`**
  - 各形式（YDK, JSON, PNG）のパース
  - フォーマットエラーハンドリング
  - データ検証（カードID、枚数制限）
  - Rush/OCG判定ロジック
  - 後方互換性（古い形式のインポート）

- [ ] **`deck-export.ts`**
  - 各形式へのエクスポート
  - データ整合性（エクスポート→インポート往復）
  - 特殊文字のエスケープ
  - メタデータの完全性

- [ ] **`url-state.ts`**
  - URLパラメータのシリアライズ/デシリアライズ
  - 不正パラメータのハンドリング
  - デフォルト値のフォールバック
  - エンコード/デコード処理

##### 🟡 中優先度（ビジネスロジック）

- [ ] **`url-builder.ts`**
  - OCG/Rush両対応のURL生成
  - パラメータの適切なエスケープ
  - エッジケース（空パラメータ、特殊文字）

- [ ] **`card-limit.ts`**
  - 制限枚数チェックロジック
  - OCG/Rush別の制限
  - 複数カードの集計

##### 🟢 低優先度（シンプルなロジック）

- [ ] **`page-detector.ts`** ✓ (既存)
  - 追加テストケース検討

#### A-2. 新規ストアのテスト

- [ ] **`stores/settings.ts`**
  - 設定値の永続化（localStorage連携）
  - デフォルト値の適用
  - URL State連携
  - テーマ適用ロジック
  - バリデーション

#### A-3. 既存モジュールの変更箇所テスト

- [ ] **`stores/deck-edit.ts`**
  - メタデータ管理機能
  - カード移動ロジック（UUID対応）
  - エクスポート/インポート統合
  - エラーハンドリング統合

#### A-4. コンポーネントのテスト

**注**: Vueコンポーネントのテストは優先度低めだが、重要ロジックは検討

- [ ] **`DeckMetadata.vue`**
  - Props/Emitsの動作
  - バリデーションロジック
  - ドロップダウン表示ロジック

- [ ] **`ExportDialog.vue` / `ImportDialog.vue`**
  - ファイル選択処理
  - フォーマット判定
  - エラー表示

### B. E2Eテストの追加検討

**現状**: E2Eテスト環境の有無を確認

**追加検討シナリオ**:

#### B-1. 基本操作フロー

- [ ] デッキ編集 → メタデータ入力 → エクスポート → インポート
- [ ] Rush Duelページでの基本操作
- [ ] テーマ切り替え動作

#### B-2. エラーケース

- [ ] 不正ファイルのインポート
- [ ] カード制限超過時の挙動
- [ ] ネットワークエラー時の動作

### C. ドキュメントの追加検討

#### C-1. ユーザー向けドキュメント

##### 🔴 高優先度（新機能の説明）

- [ ] **メタデータ管理機能のガイド**
  - `docs/usage/deck-metadata.md`
  - デッキタイプ、スタイル、公開/非公開の説明
  - カテゴリ・タグの使い方

- [ ] **エクスポート/インポート機能ガイド**
  - `docs/usage/import-export.md`
  - 各形式（YDK, JSON, PNG）の特徴
  - PNG形式の利点と使用例
  - データ移行手順

- [ ] **Rush Duel対応の説明**
  - `docs/usage/rush-duel.md`
  - Rush Duelページでの使い方
  - OCGとの違い

- [ ] **設定画面ガイド**
  - `docs/usage/settings.md`
  - テーマ、言語、カードサイズ設定
  - URL State機能の説明

##### 🟡 中優先度（詳細説明）

- [ ] **FAQの追加**
  - `docs/usage/faq.md`
  - 「PNGにデッキ情報を埋め込むとは？」
  - 「メタデータは何に使われる？」
  - 「Rush DuelとOCGの切り替え方法」

- [ ] **トラブルシューティング**
  - `docs/usage/troubleshooting.md`
  - インポートエラーの対処法
  - ブラウザ互換性問題

##### 🟢 低優先度（補足情報）

- [ ] **スクリーンショット・動画の追加**
  - メタデータUI操作のGIF/動画
  - インポート/エクスポートのデモ

#### C-2. 開発者向けドキュメント

##### 🔴 高優先度（アーキテクチャ理解に必須）

- [ ] **アーキテクチャ図の更新**
  - `docs/dev/architecture.md`
  - 新規Store（settings）の位置づけ
  - URL State管理フロー
  - コンポーネント階層図

- [ ] **データモデル仕様書**
  - `docs/dev/data-models.md`
  - DeckMetadata型定義
  - Settings型定義
  - Export/Import形式仕様

- [ ] **PNG形式仕様書**
  - `docs/dev/png-format-spec.md`
  - tEXtチャンクの使用方法
  - キー名の規約
  - バージョニング

##### 🟡 中優先度（機能拡張に有用）

- [ ] **URL State仕様書**
  - `docs/dev/url-state.md`
  - パラメータ一覧
  - エンコード方式
  - 互換性維持ポリシー

- [ ] **ページ検出ロジック**
  - `docs/dev/page-detection.md`
  - 検出パターン
  - 新規ページタイプ追加方法

- [ ] **テーマシステム**
  - `docs/dev/theme-system.md`
  - CSS変数の使用方法
  - 新規テーマ追加手順

##### 🟢 低優先度（補助資料）

- [ ] **コーディング規約の更新**
  - Composable命名規則
  - Store設計パターン
  - エラーハンドリング規約

#### C-3. API仕様書

- [ ] **`stores/deck-edit.ts` API**
  - `docs/api/deck-edit-store.md`
  - Actions一覧
  - Getters一覧
  - 使用例

- [ ] **`stores/settings.ts` API**
  - `docs/api/settings-store.md`
  - 設定項目一覧
  - 永続化の仕組み

- [ ] **ユーティリティ関数リファレンス**
  - `docs/api/utils.md`
  - 各utilsファイルの関数仕様
  - 使用例

#### C-4. リリースノート

- [ ] **v0.3.11リリースノート**
  - `docs/changelog/v0.3.11.md`
  - 新機能の概要
  - 破壊的変更（あれば）
  - 既知の問題

### D. コード内ドキュメント（JSDoc）

#### D-1. 新規関数のJSDoc追加

**確認方針**:
- public APIとして使用される関数は必須
- 複雑なロジックを持つ関数は推奨
- 型定義で自明な場合は省略可

**対象例**:
```typescript
/**
 * PNGファイルからtEXtチャンクを抽出
 * @param pngData - PNG画像のバイナリデータ
 * @param key - 取得するチャンクのキー名
 * @returns チャンクの値（存在しない場合はnull）
 * @throws {Error} 不正なPNG形式の場合
 */
export function extractTextChunk(pngData: Uint8Array, key: string): string | null
```

#### D-2. 複雑な型定義のコメント

**対象**:
- `types/settings.ts`
- `types/card.ts`

**例**:
```typescript
/**
 * デッキメタデータ
 * ユーザーが設定可能なデッキの付加情報
 */
export interface DeckMetadata {
  /** デッキ名（最大100文字） */
  name: string;
  /** デッキの説明（Markdown対応） */
  description?: string;
  // ...
}
```

### E. サンプルコード・チュートリアル

- [ ] **PNG形式使用例**
  - `examples/png-deck-share.md`
  - エクスポート→共有→インポートの流れ

- [ ] **カスタムテーマ作成例**
  - `examples/custom-theme.md`

- [ ] **URL State活用例**
  - `examples/bookmarkable-state.md`

## 実施方針

### フェーズ分け

#### Phase 1: 必須項目 (v0.3.11リリース前)
- 🔴高優先度のユニットテスト
- 🔴高優先度のユーザー向けドキュメント
- リリースノート

#### Phase 2: 推奨項目 (v0.4.0開発中)
- 🟡中優先度のテスト
- 🟡中優先度のドキュメント
- 開発者向けドキュメント

#### Phase 3: 理想項目 (時間があれば)
- 🟢低優先度のテスト・ドキュメント
- E2Eテスト
- サンプルコード

## 期待する成果物

### 1. テスト追加計画書

形式:
```markdown
## 優先度順テストリスト

### Phase 1
- [ ] `png-metadata.test.ts` - 見積: 4h
  - tEXtチャンク読み書き (10ケース)
  - エラーハンドリング (5ケース)
  
- [ ] `deck-import.test.ts` - 見積: 6h
  - YDK形式 (8ケース)
  - JSON形式 (8ケース)
  - PNG形式 (8ケース)
  - エラー系 (10ケース)
```

### 2. ドキュメント追加計画書

形式:
```markdown
## ドキュメント作成タスク

### ユーザー向け
1. メタデータ管理ガイド (見積: 2h)
   - 対象読者: 全ユーザー
   - ページ数: 3-4ページ
   - スクリーンショット: 5枚

2. インポート/エクスポートガイド (見積: 3h)
   - 対象読者: データ移行・共有するユーザー
   - ページ数: 5-6ページ
   - サンプルファイル: 3つ
```

### 3. JSDoc追加チェックリスト

- 対象関数リスト
- 各関数の記述方針
- 見積もり工数

## 備考

- テストフレームワーク: Vitest (設定済み)
- ドキュメント形式: Markdown
- スクリーンショットは`public/images/`配下に配置
- 多言語対応は当面日本語のみでOK

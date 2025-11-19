# ブラウザ自動テスト方針策定依頼書

**作成日時**: 2025-11-18  
**対象**: ブラウザ拡張機能の自動テスト体制  
**レビュー目的**: 画面単位・コンポーネント単位のテスト方針確立とメンテナンス戦略  
**レポート出力先**: `docs/internal-reviews/reports/browser-test-strategy.md`

## 背景

現在、本プロジェクトではブラウザを使った自動テスト（E2Eテスト）の体系的な実施体制が確立されていません。`tmp/browser/` に50個以上の手動作成テストスクリプトが存在しますが、正式なテストスイートとして整備されていません。

### 現状の問題点

1. **テストの散在**: `tmp/browser/` に一時的なスクリプトが多数存在
2. **実行基盤の未整備**: Playwrightの導入は確認できるが、体系的な実行環境がない
3. **メンテナンス指針の欠如**: 機能追加・修正時のテスト更新方針が不明確
4. **カバレッジの不透明性**: どの画面・機能がテスト済みか把握困難

## レビュー依頼項目

### 1. テスト対象の分類と優先度付け

#### 1-1. 画面単位のテスト対象

**確認観点**:
- [ ] テスト対象画面の洗い出し
  - デッキ編集ページ（OCG/Rush）
  - デッキ表示ページ
  - デッキリストページ
  - カード検索ページ
  - カード詳細ページ
  - オプション設定ページ
  - ポップアップ
  
- [ ] 各画面の優先度判定基準
  - ユーザー利用頻度
  - 機能の複雑性
  - バグ発生リスク
  - 変更頻度

**期待する成果物**:
```markdown
# 画面別テスト優先度マトリックス

| 画面 | 優先度 | 理由 | 対象機能 |
|------|--------|------|----------|
| デッキ編集（OCG） | 🔴高 | コア機能、複雑なUI、頻繁な変更 | D&D、メタデータ、エクスポート |
| デッキ編集（Rush） | 🔴高 | 新機能、動作保証必須 | OCGとの差異検証 |
| デッキ表示 | 🟡中 | 閲覧のみ、比較的シンプル | 表示確認、ソート |
| オプション設定 | 🟡中 | 全体に影響、テスト重要 | 設定変更、永続化 |
| ポップアップ | 🟢低 | シンプル、変更少ない | 基本動作のみ |
```

#### 1-2. コンポーネント単位のテスト対象

**確認観点**:
- [ ] 独立してテスト可能なコンポーネント
  - DeckSection.vue - カードリスト表示・D&D
  - DeckCard.vue - 個別カード表示
  - DeckMetadata.vue - メタデータ編集UI
  - RightArea.vue - タブ切り替え
  - ExportDialog.vue / ImportDialog.vue - ダイアログ
  - OptionsDialog.vue - 設定ダイアログ
  
- [ ] コンポーネントテストの範囲
  - Props/Emits の動作確認
  - ユーザーインタラクション（クリック、入力）
  - 条件分岐（v-if, v-show）
  - 計算プロパティ（computed）
  - ビジュアルリグレッション

**期待する成果物**:
```markdown
# コンポーネント別テスト範囲定義

## DeckSection.vue
- **Props**: cards, sectionType, gameType
- **Emits**: card-move, card-remove
- **テスト項目**:
  - [ ] カード表示（枚数、順序）
  - [ ] ドラッグ&ドロップ（同一セクション内、他セクションへ）
  - [ ] カード削除
  - [ ] エクストラデッキの制約（融合・シンクロ等）
  - [ ] 制限枚数超過時の警告
```

### 2. テスト実装方針の策定

#### 2-1. テストフレームワーク選定

**確認事項**:
- [ ] Playwrightの採用判断
  - 現在の使用状況（tmp/browser/のスクリプト）
  - クロスブラウザ対応の必要性
  - 拡張機能テストのサポート状況
  
- [ ] 代替フレームワークの検討
  - Puppeteer（Chrome拡張機能に特化）
  - WebDriver（Selenium）
  - Cypress（拡張機能対応は限定的）

**期待する成果物**:
```markdown
# フレームワーク選定理由

**選定**: Playwright

**理由**:
1. Chrome拡張機能のテストに対応
2. 複数ブラウザ対応（Chrome, Firefox, Edge）
3. スクリーンショット・動画記録機能
4. tmp/browser/の既存スクリプトがPlaywright製

**制約**:
- 拡張機能のテストには特別な設定が必要
- manifest v3の制約に注意
```

#### 2-2. テストディレクトリ構造

**確認観点**:
- [ ] ディレクトリ構成の提案
- [ ] ファイル命名規則
- [ ] テストフィクスチャの配置

**期待する成果物**:
```
tests/
├── e2e/                    # E2Eテスト
│   ├── setup/              # テスト環境セットアップ
│   │   ├── extension.ts    # 拡張機能ロード
│   │   └── fixtures.ts     # 共通フィクスチャ
│   ├── screens/            # 画面単位テスト
│   │   ├── deck-edit/
│   │   │   ├── ocg/
│   │   │   │   ├── basic-operations.spec.ts
│   │   │   │   ├── drag-and-drop.spec.ts
│   │   │   │   ├── metadata-edit.spec.ts
│   │   │   │   └── export-import.spec.ts
│   │   │   └── rush/
│   │   │       └── basic-operations.spec.ts
│   │   ├── deck-display/
│   │   │   └── display.spec.ts
│   │   └── options/
│   │       └── settings.spec.ts
│   ├── components/         # コンポーネント単位テスト
│   │   ├── DeckSection.spec.ts
│   │   ├── DeckMetadata.spec.ts
│   │   └── ExportDialog.spec.ts
│   └── flows/              # ユーザーフロー統合テスト
│       ├── deck-creation.spec.ts
│       └── deck-share.spec.ts
├── fixtures/               # テストデータ
│   ├── decks/
│   │   ├── basic-deck.json
│   │   └── complex-deck.json
│   ├── cards/
│   │   └── sample-cards.json
│   └── export-samples/     # tmp/export-samples/から移動
└── screenshots/            # ビジュアルリグレッション基準画像
    └── baseline/
```

#### 2-3. Page Object Modelの採用

**確認観点**:
- [ ] POMパターンの適用判断
- [ ] 共通操作の抽象化

**期待する成果物**:
```typescript
// tests/e2e/pages/DeckEditPage.ts
export class DeckEditPage {
  constructor(private page: Page) {}
  
  async addCardToMainDeck(cardId: string) {
    // カード追加ロジック
  }
  
  async dragCardBetweenSections(cardIndex: number, from: string, to: string) {
    // D&Dロジック
  }
  
  async openMetadataTab() {
    await this.page.click('[data-testid="metadata-tab"]');
  }
  
  async exportDeck(format: 'ydk' | 'json' | 'png') {
    // エクスポートロジック
  }
}
```

### 3. テストメンテナンス戦略

#### 3-1. 機能追加時のテスト追加ガイドライン

**策定すべき内容**:
- [ ] 新規画面追加時のテスト作成手順
- [ ] 新規コンポーネント追加時のテスト作成手順
- [ ] テストケース設計のチェックリスト

**期待する成果物**:
```markdown
# 新機能追加時のテスト追加ガイド

## 画面追加時（例: デッキ比較画面）

### Step 1: テストファイル作成
`tests/e2e/screens/deck-compare/compare.spec.ts`

### Step 2: テストケース設計
- [ ] 基本表示（2つのデッキを並べて表示）
- [ ] 差分ハイライト
- [ ] エラーケース（デッキが存在しない）

### Step 3: Page Objectクラス作成
`tests/e2e/pages/DeckComparePage.ts`

### Step 4: 実装
- 最小限のhappy path
- エラーケース
- エッジケース

### Step 5: CI統合
- `.github/workflows/e2e-tests.yml` に追加
```

#### 3-2. 機能修正時のテスト更新ガイドライン

**策定すべき内容**:
- [ ] UIが変更された場合の対処
- [ ] APIが変更された場合の対処
- [ ] セレクタ（data-testid等）の更新方針

**期待する成果物**:
```markdown
# 機能修正時のテスト更新ガイド

## UI変更の場合

### 軽微な変更（色、サイズ等）
- ビジュアルリグレッションテストのベースライン更新
- `npm run test:e2e:update-snapshots`

### 構造変更（HTML構造、セレクタ変更）
1. 該当コンポーネントのテストを実行して失敗を確認
2. セレクタを更新（`data-testid`を使用推奨）
3. Page Objectクラスを更新
4. テストを再実行して成功を確認

## API変更の場合

### レスポンス形式変更
1. フィクスチャデータを更新
2. モック・スタブを更新
3. アサーションを更新

### エンドポイント変更
1. Page Objectクラスのメソッドを更新
2. 関連するテストケースを確認
```

#### 3-3. テスト実行・メンテナンスの自動化

**策定すべき内容**:
- [ ] CI/CDパイプラインへの統合
- [ ] 定期実行スケジュール
- [ ] 失敗時の通知方法
- [ ] テストカバレッジレポート

**期待する成果物**:
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
  schedule:
    - cron: '0 2 * * *'  # 毎日2:00 JST

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### 4. 既存テストスクリプトの活用

#### 4-1. tmp/browser/ のスクリプト分析

**確認観点**:
- [ ] 有用なテストパターンの抽出
- [ ] 正式なテストスイートへの統合可能性
- [ ] サンプルコードとしての保存価値

**期待する成果物**:
```markdown
# tmp/browser/ スクリプト分析結果

## 統合候補（優先度順）

### 高優先度
- `add-40-cards.js` → `tests/e2e/flows/deck-creation.spec.ts` へ統合
  - 大量カード追加のパフォーマンステスト
  
- `check-animation.js` → `tests/e2e/screens/deck-edit/animations.spec.ts` へ統合
  - D&Dアニメーション検証

### 中優先度
- `change-settings.js` → `tests/e2e/screens/options/settings.spec.ts` へ統合
  - 設定変更フロー

### サンプルとして保存
- `capture-screenshots-final.js` → `docs/testing/examples/` へ移動
  - スクリーンショット取得のサンプル
```

### 5. ドキュメント化の内容

#### 5-1. 開発者向けテストガイド

**必要なドキュメント**:
- [ ] `docs/testing/e2e-testing-guide.md` - E2Eテスト実施ガイド
- [ ] `docs/testing/component-testing-guide.md` - コンポーネントテストガイド
- [ ] `docs/testing/test-maintenance.md` - テストメンテナンスガイド
- [ ] `docs/testing/examples/` - サンプルコード集

**ガイドに含めるべき内容**:
```markdown
# E2Eテスト実施ガイド

## 環境構築
1. Playwrightインストール
2. 拡張機能ビルド
3. テスト実行

## テスト作成手順
1. テストケース設計
2. Page Objectクラス作成
3. テストコード実装
4. 実行・デバッグ

## ベストプラクティス
- data-testid を使用したセレクタ
- 非同期処理の適切な待機
- テストの独立性確保
- フィクスチャデータの活用

## トラブルシューティング
- タイムアウトエラー
- セレクタが見つからない
- 拡張機能がロードされない
```

#### 5-2. テスト更新チェックリスト

**チェックリスト形式**:
```markdown
# テスト更新チェックリスト

## UI変更時
- [ ] 影響を受けるテストファイルを特定
- [ ] data-testid の更新（必要な場合）
- [ ] Page Object クラスの更新
- [ ] ビジュアルリグレッションベースライン更新
- [ ] テスト実行・パス確認

## 新機能追加時
- [ ] テストファイル作成
- [ ] Page Object クラス作成
- [ ] フィクスチャデータ追加
- [ ] テスト実装
- [ ] CI/CD統合

## バグ修正時
- [ ] バグ再現テストケース追加
- [ ] 修正後の動作確認テスト追加
- [ ] リグレッションテスト実行
```

### 6. 段階的導入計画

#### Phase 1: 基盤整備（1-2週間）
- [ ] Playwright環境セットアップ
- [ ] ディレクトリ構造確立
- [ ] 共通ユーティリティ作成
- [ ] 1つのサンプルテスト実装

#### Phase 2: コアテスト実装（2-3週間）
- [ ] デッキ編集（OCG）の基本テスト
- [ ] D&D機能テスト
- [ ] メタデータ編集テスト
- [ ] エクスポート/インポートテスト

#### Phase 3: カバレッジ拡大（継続的）
- [ ] Rush Duel対応テスト
- [ ] その他画面のテスト
- [ ] エッジケース追加

#### Phase 4: 自動化・最適化（継続的）
- [ ] CI/CD統合
- [ ] テスト並列実行
- [ ] パフォーマンス改善

## 期待する成果物まとめ

1. **テスト方針ドキュメント** (`docs/testing/testing-strategy.md`)
   - 画面別優先度マトリックス
   - コンポーネント別テスト範囲
   - フレームワーク選定理由

2. **テストディレクトリ設計書** (`docs/testing/directory-structure.md`)
   - ディレクトリ構造
   - ファイル命名規則
   - フィクスチャ管理方針

3. **開発者ガイド**
   - `docs/testing/e2e-testing-guide.md`
   - `docs/testing/test-maintenance.md`
   - `docs/testing/examples/` - サンプルコード

4. **テンプレート**
   - Page Objectクラステンプレート
   - テストケーステンプレート
   - チェックリストテンプレート

5. **実装ロードマップ** (`docs/testing/implementation-roadmap.md`)
   - フェーズ分け
   - 見積もり工数
   - マイルストーン設定

## 備考

- tmp/browser/の既存スクリプトは分析後に整理
- 段階的導入を推奨（一度に全て実装しない）
- 既存のユニットテストとの棲み分けを明確に
- ビジュアルリグレッションテストは必要に応じて導入

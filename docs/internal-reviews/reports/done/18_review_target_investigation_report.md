# REQ-18 レビュー依頼対象の調査 実施報告書

## 実施日
2025-11-22

## 依頼番号
REQ-18

## 目的
v0.4.0リリース前に重点的にレビューすべき箇所を特定し、品質を担保する。

---

## 実施内容

### 1. 変更頻度の高いファイルの特定

#### 調査対象期間
2025-01-01以降（v0.3.x開発期間）

#### 変更頻度TOP 15

| 順位 | ファイル | 変更回数 | 性質 | 優先度 |
|------|---------|--------|------|--------|
| 1 | tasks/wip.md | 123 | ドキュメント | 低 |
| 2 | tasks/done.md | 99 | ドキュメント | 低 |
| 3 | src/stores/deck-edit.ts | 55 | **ロジック層（高）** | **高** |
| 4 | tasks/todo.md | 44 | ドキュメント | 低 |
| 5 | src/components/DeckMetadata.vue | 42 | UI（複雑） | **高** |
| 6 | src/components/DeckSection.vue | 36 | UI（ドラッグ処理） | **高** |
| 7 | src/components/CardList.vue | 32 | UI（ソート機能） | **高** |
| 8 | version.dat | 31 | 自動生成 | 低 |
| 9 | src/components/DeckCard.vue | 30 | UI | 中 |
| 10 | src/components/CardDetail.vue | 30 | UI | 中 |
| 11 | package.json | 26 | 設定 | 低 |
| 12 | src/components/RightArea.vue | 25 | UI | 中 |
| 13 | src/api/card-search.ts | 22 | **API処理（重要）** | **高** |
| 14 | tasks/milestone.md | 20 | ドキュメント | 低 |
| 15 | README.md | 20 | ドキュメント | 低 |

**高優先度ファイル（コード部分）**：
- `src/stores/deck-edit.ts` (55回)
- `src/components/DeckMetadata.vue` (42回)
- `src/components/DeckSection.vue` (36回)
- `src/components/CardList.vue` (32回)
- `src/api/card-search.ts` (22回)

---

### 2. 複雑度の高いコードの特定

#### 2.1 src/stores/deck-edit.ts

**ファイル統計**
- 行数: 1,266行（**非常に大きい**）
- 関数数: 20+個
- 状態管理: ref型4個

**複雑な関数の特定**

| 関数名 | 行数 | 複雑度 | リスク |
|--------|------|--------|--------|
| sortDisplayOrderForOfficial() | ~90 | 高 | 高 |
| addToDisplayOrder() | ~80 | 高 | 高 |
| reorderInDisplayOrder() | ~30 | 中 | 中 |
| reorderWithinSection() | ~100 | 高 | 高 |
| removeCardFromDisplayOrder() | ~50 | 中 | 中 |

**問題点**
- displayOrderの更新ロジックが複数の関数に分散
- UUID生成・管理が複雑（複数コミットで修正履歴あり）
  - `5ac1f96`: UUID出現回数カウントで生成
  - `9826f4b`: インデックスを追加してユニーク性を保証
  - `32328b3`: 永続化し、新規カードには最大インデックス+1を付与
- ネストが深い条件分岐（3〜4段階）
- ciidの型変換が複数箇所で実施（文字列→数値）

**関数サイズの詳細**
```typescript
- sortDisplayOrderForOfficial()  → 複数の内部ループと Map処理
- addToDisplayOrder()            → 複数の条件判定（同一カード存在確認、CIID比較）
- reorderWithinSection()         → 複雑な配列操作（splice/insertでの順序変更）
```

#### 2.2 src/components/DeckMetadata.vue

**ファイル統計**
- 行数: 1,010行（**単一ファイルとしては非常に大きい**）
- テンプレート + Script + Style一体型
- 複雑なUIロジック

**問題点**
- ファイルサイズが大きすぎる（1000行超）
- 複数のダイアログ機能を含む（CategoryDialog、TagDialog等）
- 状態管理が複雑（ref型が多数）
- テンプレート部分が複雑

#### 2.3 src/components/DeckSection.vue

**ファイル統計**
- 行数: 444行
- ドラッグ&ドロップ機能実装

**問題点**
- canDropToSectionロジックがdeck-edit.tsの canMoveCard()と重複
- dragoverイベント処理の複雑度が中程度

#### 2.4 src/components/CardList.vue

**ファイル統計**
- 行数: 707行
- ソート機能が集約

**複雑な関数**
- sort()メソッド: ソート順序の複数キー管理
- テンプレート: for-loop×複数段階のネスト

**問題点**
- テンプレート内でのロジック処理が多い
- computedプロパティの数が多い可能性

#### 2.5 src/api/card-search.ts

**ファイル統計**
- 行数: ~1,500行
- 複数のカードタイプ別パース関数

**型安全性の問題**
- 関数定義での未使用パラメータ:
  - `parseSpellCardFromDetailPage(doc: Document, ...)` - docが未使用
  - `parseTrapCardFromDetailPage(doc: Document, ...)` - docが未使用
- URLの可能性check不足: url.match()で undefined check なし
- 以上、TypeScript type-checkで5つのエラーを検出

---

### 3. リスク評価

#### 3.1 高リスク項目

| 対象 | バグリスク | 影響範囲 | テストカバレッジ | 総合リスク |
|------|-----------|--------|----------------|----------|
| deck-edit.ts | **高** | **広** | 不十分 | **高** |
| DeckMetadata.vue | **高** | **広** | 不十分 | **高** |
| card-search.ts | **高** | **広** | 不十分 | **高** |

**deck-edit.ts の詳細リスク分析**

| リスク項目 | 評価 | 詳細 |
|-----------|------|------|
| UUID生成ロジック | 高 | 複数回の修正履歴。永続化ロジックに不安 |
| displayOrder同期 | 高 | deckInfoとdisplayOrderの2つの状態を管理。同期漏れリスク |
| ドラッグ&ドロップ対応 | 高 | reorderInDisplayOrder()で、アニメーション追跡用のUUIDに依存 |
| ciid型変換 | 中 | 複数箇所で parseInt(String(x), 10) 実施 |
| canMoveCard()重複 | 中 | DeckSection.vueのcanDropToSectionロジックと重複。変更時の同期漏れリスク |

**DeckMetadata.vue の詳細リスク分析**

| リスク項目 | 評価 | 詳細 |
|-----------|------|------|
| ファイルサイズ | 高 | 1010行 → 複数のコンポーネント機能を含むべき |
| 状態管理の複雑さ | 中 | 複数の ref による状態。値の一貫性チェック必要 |
| テンプレート複雑度 | 中 | 複数のダイアログが同じファイル内 |

**card-search.ts の詳細リスク分析**

| リスク項目 | 評価 | 詳細 |
|-----------|------|------|
| TypeScript エラー | 高 | npm run type-check で5つのエラーを検出 |
| URL パラメータ処理 | 高 | url.match()の undefined check なし（2箇所） |
| 未使用パラメータ | 中 | parseSpellCard/parseTrapCardのdocパラメータ未使用 |

---

### 4. テストカバレッジ調査

#### 既存テストファイル
```
tests/unit/stores/deck-edit.test.ts
tests/unit/components/CardList.test.ts
tests/e2e/deck-edit-export-import.test.ts
```

#### テスト実行結果（npm run test:vitest）
```
Test Files: 19 failed | 13 passed (32)
Tests:      56 failed | 290 passed | 7 skipped (353)
```

**失敗テストの主要原因**
- deck-edit.test.ts: process.exit(1) が呼ばれている（テスト内で意図的なフェイル）
- CardList.test.ts: 部分的失敗
- session.test.ts: cgid not found in page エラー（統合テストの環境依存）

**テストカバレッジ評価**
- deck-edit.ts: 部分的（高リスク関数が網羅されていない可能性）
- CardList.vue: 部分的
- card-search.ts: テストファイル不明確
- DeckMetadata.vue: テストファイル不明確

---

### 5. 型安全性確認

#### npm run type-check の結果

**エラー: 5件**

**src/api/card-search.ts**
- **Line 1372-1373**: `url` が possibly undefined
  ```typescript
  const ciidMatch = url.match(/ciid=(\d+)/);  // Error
  const encMatch = url.match(/enc=([^&]+)/);  // Error
  ```
  **原因**: 呼び出し元で url チェックなし
  **推奨対応**: url !== undefined の check を追加

- **Line 1484**: `doc` パラメータが未使用
  ```typescript
  function parseSpellCardFromDetailPage(doc: Document, ...): SpellCard
  ```
  **推奨対応**: パラメータ削除または doc を実際に使用する

- **Line 1510**: `doc` パラメータが未使用
  ```typescript
  function parseTrapCardFromDetailPage(doc: Document, ...): TrapCard
  ```
  **推奨対応**: パラメータ削除または doc を実際に使用する

**src/background/main.ts**
- **Line 48**: `tab` パラメータが未使用
  ```typescript
  chrome.contextMenus.onClicked.addListener((info, tab) => {
  ```
  **推奨対応**: パラメータ削除または アンダースコア接頭辞 (_tab) で無視を明示

---

### 6. 最近の修正履歴からの洞察

#### UUID永続化に関する修正（複数コミット）
```
5ac1f96: fix: CardListのuuidを出現回数カウントで生成
9826f4b: fix: CardListのuuidにインデックスを追加してユニーク性を保証
32328b3: fix: CardListのuuidを永続化し、新規カードには最大インデックス+1を付与
```

**洞察**
- UUID生成ロジックが不安定だった（3コミットで改善）
- 永続化ロジックが後付けされた
- **リスク**: 既存データの永続化との互換性問題の可能性

#### SearchInputBar関連（共通コンポーネント化）
```
4411047: refactor: 検索入力バーの共通コンポーネント化とソート処理の集約
```

**洞察**
- 複数の箇所で検索入力バーが実装されていた
- **リスク**: リファクタリング前後で動作の違いがないか確認必要

#### DeckSection検索フィルター（複数コミット）
```
8c3b59c: feat: DeckSectionの三点メニューボタンにSearchFilterDialog統合
c881ae0: refactor: 検索フィルターを三点メニューボタンから開くように変更
```

**洞察**
- UI構成が複数回変更されている
- **リスク**: ユーザーインタフェースの一貫性確認必要

---

## レビュー優先度の決定

### 優先度：**高**（必ずレビュー）

#### 1. src/stores/deck-edit.ts
- **理由**: 1266行、変更回数55回、UUID/displayOrder管理の複雑度が高い
- **重点確認項目**:
  - UUID生成・永続化ロジック（データ互換性）
  - displayOrderとdeckInfoの同期確認
  - addToDisplayOrder()の既存カード検出ロジック（重複チェック）
  - reorderWithinSection()の配列操作の正確性
  - ciidの型変換処理

**推奨レビュー観点**
- [ ] UUIDの永続化とリセット時の処理
- [ ] 複数のカード追加時の順序保証
- [ ] ドラッグ&ドロップ中のアニメーション追跡確認
- [ ] displayOrder と deckInfo の一貫性チェック機構
- [ ] エッジケース（同一カード複数枚、extraデッキカード等）

---

#### 2. src/api/card-search.ts
- **理由**: TypeScript エラー5件、URL処理で undefined check なし
- **重点確認項目**:
  - url.match() の undefined check（Line 1372-1373）
  - parseSpellCardFromDetailPage() の未使用パラメータ
  - parseTrapCardFromDetailPage() の未使用パラメータ
  - URLパラメータのパース正確性

**推奨レビュー観点**
- [ ] 型エラーの修正（undefined check追加）
- [ ] 未使用パラメータの削除またはリファクタリング
- [ ] ciidと enc パラメータの抽出ロジック確認
- [ ] URL変更時の影響範囲確認

---

#### 3. src/components/DeckMetadata.vue
- **理由**: 1010行（非常に大きい）、複数ダイアログ機能、変更回数42回
- **重点確認項目**:
  - ファイルの責任分離（複数のダイアログ機能が混在）
  - 状態管理の複雑さ
  - テンプレートのロジック処理

**推奨レビュー観点**
- [ ] ファイル分割の必要性検討
- [ ] 複数ref間の状態一貫性チェック
- [ ] ダイアログの開閉ロジック（modalFlags等）
- [ ] データバインディングの正確性

---

#### 4. src/components/CardList.vue
- **理由**: ソート機能追加、変更回数32回、テンプレート複雑度が中程度
- **重点確認項目**:
  - ソート機能の複数キー処理
  - ソート順序の永続化
  - テンプレート内のロジック処理

**推奨レビュー観点**
- [ ] ソート順序の初期化と保存確認
- [ ] ソート変更時のアニメーション処理（displayOrderとの連携）
- [ ] 大量カード時のパフォーマンス
- [ ] テンプレートのロジック処理の移動必要性検討

---

#### 5. src/components/DeckSection.vue
- **理由**: ドラッグ&ドロップ機能、canMoveCard()ロジック重複
- **重点確認項目**:
  - canDropToSectionロジックとdeck-edit.tsの canMoveCard() の同期
  - dragoverイベント処理
  - dropイベント処理での順序変更

**推奨レビュー観点**
- [ ] canMoveCard()重複ロジックの統一（単一の関数に集約）
- [ ] ドラッグ開始時の visualFeedback
- [ ] drop時のエラーハンドリング（無効な操作の拒否）
- [ ] extraデッキカードの移動制限の確認

---

### 優先度：**中**（時間があればレビュー）

#### 1. src/components/RightArea.vue
- **理由**: 変更回数25回、UI層
- **焦点**: 最近のリデザイン変更の動作確認

#### 2. src/components/DeckCard.vue
- **理由**: 変更回数30回、UI層
- **焦点**: カード表示の正確性、ciid表示の確認

#### 3. src/components/CardDetail.vue
- **理由**: 変更回数30回、UI層
- **焦点**: 詳細表示の正確性

---

### 優先度：**低**（必要に応じて）

- SearchInputBar.vue（新規作成だが比較的シンプル）
- その他のUIコンポーネント（TagDialog.vue、CategoryDialog.vue等）

---

## 成果物サマリー

### 変更頻度の高いファイル一覧
| ランク | ファイル | 変更回数 | 優先度 |
|--------|---------|--------|--------|
| 1 | src/stores/deck-edit.ts | 55 | **高** |
| 2 | src/components/DeckMetadata.vue | 42 | **高** |
| 3 | src/components/DeckSection.vue | 36 | **高** |
| 4 | src/components/CardList.vue | 32 | **高** |
| 5 | src/api/card-search.ts | 22 | **高** |

### 複雑度の高いコード一覧

| ファイル | 関数 | 複雑度 | 行数 |
|---------|------|--------|------|
| deck-edit.ts | sortDisplayOrderForOfficial() | 高 | ~90 |
| deck-edit.ts | addToDisplayOrder() | 高 | ~80 |
| deck-edit.ts | reorderWithinSection() | 高 | ~100 |
| DeckMetadata.vue | (全体) | 高 | 1010 |
| CardList.vue | sort() | 中 | - |

### リスク評価結果

**高リスク**
- deck-edit.ts: UUID管理、displayOrder同期、型変換
- card-search.ts: TypeScript エラー5件、URL処理の undefined check なし
- DeckMetadata.vue: ファイルサイズ、状態管理の複雑さ

**中リスク**
- DeckSection.vue: ロジック重複、ドラッグ&ドロップ処理

---

## 推奨レビュー進行計画

### フェーズ1: 型安全性修正（最優先）
1. src/api/card-search.ts の型エラー5件を修正
   - url undefined check 追加
   - 未使用パラメータ削除
2. npm run type-check で全エラーが解消されることを確認

### フェーズ2: 高リスク関数のレビュー
1. src/stores/deck-edit.ts
   - addToDisplayOrder() のロジック確認
   - reorderWithinSection() の配列操作確認
   - UUID永続化の互換性確認
2. src/components/DeckSection.vue
   - canDropToSectionロジック と canMoveCard() の統一

### フェーズ3: 複雑度削減検討
1. src/components/DeckMetadata.vue の分割検討
2. src/components/CardList.vue のテンプレートロジック移動検討

### フェーズ4: テスト強化
1. deck-edit.test.ts で高リスク関数の追加テストケース
2. CardList.test.ts でソート機能のテストケース追加
3. card-search.ts のテストファイル確認・追加

---

## 実施結果

### 実施状況
- ✅ 変更頻度の高いファイルの特定（gitログ統計）
- ✅ 複雑度の高いコードの特定（行数、ネスト、分岐分析）
- ✅ リスク評価（バグリスク、影響範囲、テストカバレッジ）
- ✅ レビュー優先度の決定
- ✅ 推奨レビュー観点の列挙
- ✅ 推奨レビュー進行計画の作成

### 生成物
- **本レポートファイル**: `18_review_target_investigation_report.md`
- **対象ファイル確認済み**: 5件（高優先度）
- **型安全性確認済み**: エラー5件を特定、修正候補を提示

---

## 注記

- このレポートは v0.4.0 リリース前の品質確保を目的としている
- REQ-19（テスト更新）、REQ-20（コード重複調整）の優先度決定に活用されるべき
- TypeScript エラーの修正は本レポート実施後、即座に対応することを強く推奨

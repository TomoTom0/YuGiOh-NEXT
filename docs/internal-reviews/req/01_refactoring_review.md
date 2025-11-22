# リファクタリングレビュー依頼書

**作成日時**: 2025-11-18  
**対象**: PR #10マージ後のコードベース (v0.3.10 → v0.3.11)  
**レビュー目的**: コード品質向上、保守性改善、技術的負債の解消  
**レポート出力先**: `docs/internal-reviews/reports/refactoring-analysis.md`

## 背景

PR #10により以下の大規模な変更が加わりました：

- 73ファイル変更 (10,502行追加、1,336行削除)
- 新規コンポーネント: DeckMetadata.vue, ExportDialog.vue, ImportDialog.vue, OptionsDialog.vue
- 新規ユーティリティ: page-detector.ts, url-builder.ts, url-state.ts, png-metadata.ts, deck-export.ts, deck-import.ts
- 新規Store: settings.ts
- 大幅な変更: stores/deck-edit.ts (957行)

## レビュー依頼項目

### 1. コードの重複・類似パターンの検出

**対象範囲**:
- `src/components/` 配下の全Vueコンポーネント (特にDeck*.vue系)
- `src/stores/` 配下のストア実装
- `src/utils/` 配下のユーティリティ関数
- `src/content/` 配下のコンテンツスクリプト

**確認観点**:
- [ ] 類似した処理を行っているコードブロックの抽出
- [ ] 共通化可能なロジックの特定
- [ ] ドメインロジックの分散（同一責務が複数箇所に散在）
- [ ] ユーティリティ関数化できる処理の洗い出し

### 2. コンポーネント設計の改善余地

**対象コンポーネント**:
- DeckEditLayout.vue (190行)
- RightArea.vue (451行)
- DeckSection.vue (333行)
- DeckMetadata.vue (1,036行)
- ExportDialog.vue (337行)
- ImportDialog.vue (445行)

**確認観点**:
- [ ] 単一責任原則の違反（1コンポーネントが多すぎる責務を持つ）
- [ ] コンポーネント分割の余地（特に1,000行超のコンポーネント）
- [ ] Props/Emits設計の適切性
- [ ] Composable化できるロジックの有無
- [ ] 状態管理の適切性（ローカルstate vs Store）

### 3. Store設計の妥当性

**対象ストア**:
- `stores/deck-edit.ts` (957行)
- `stores/settings.ts` (326行)

**確認観点**:
- [ ] Storeの責務範囲の適切性
- [ ] Actions/Gettersの粒度
- [ ] 状態の正規化
- [ ] 非同期処理の扱い
- [ ] ストア分割の必要性

### 4. ユーティリティ関数の整理

**対象ファイル**:
- `utils/page-detector.ts` (145行)
- `utils/url-builder.ts` (137行)
- `utils/url-state.ts` (166行)
- `utils/png-metadata.ts` (260行)
- `utils/deck-export.ts` (185行)
- `utils/deck-import.ts` (481行)

**確認観点**:
- [ ] 関数の責務が単一か
- [ ] 命名の一貫性
- [ ] エラーハンドリングの統一性
- [ ] 関連関数のグルーピング適切性
- [ ] クラス化すべき関数群の有無

### 5. 型定義の改善

**対象ファイル**:
- `types/card.ts`
- `types/settings.ts` (128行変更)

**確認観点**:
- [ ] 型の重複・冗長性
- [ ] Union型/Intersection型の適切な使用
- [ ] 型ガードの必要性
- [ ] 共通型の抽出余地
- [ ] 型安全性の向上余地

### 6. パフォーマンス最適化の余地

**確認観点**:
- [ ] 不要な再レンダリングの発生箇所
- [ ] computedの活用余地
- [ ] watchの適切性（immediate, deep オプション）
- [ ] メモリリークの可能性（イベントリスナー、タイマー）
- [ ] 重い処理のWeb Worker化の検討

### 7. エラーハンドリングの統一

**確認観点**:
- [ ] try-catchの一貫性
- [ ] エラーメッセージの統一性
- [ ] エラー通知の実装方法
- [ ] エラーログの適切性
- [ ] ユーザーへのフィードバック

## 期待する成果物

1. **リファクタリング候補リスト** (優先度付き)
2. **コード改善提案書** (具体的な変更前後の例示)
3. **アーキテクチャ改善提案** (必要に応じて)

## 優先順位

1. 🔴 高: 保守性・可読性に大きく影響する項目
2. 🟡 中: パフォーマンスや将来の拡張性に関わる項目
3. 🟢 低: コードスタイルや命名の統一など

## 備考

- 既存の動作を壊さないことを最優先
- リファクタリングは段階的に実施予定
- 各提案には理由と期待効果を明記すること

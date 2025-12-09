# 次期バージョン（未リリース）

## リファクタリング

### deck-edit.ts の大規模リファクタリング（272行削減）
- UUID生成ロジックを `src/utils/deck-uuid-generator.ts` に分離
- FLIPアニメーションを `src/composables/deck/useFLIPAnimation.ts` に分離
- Fisher-Yatesシャッフルを `src/utils/array-shuffle.ts` に分離
- ソート比較関数を `src/composables/deck/useDeckCardSorter.ts` に分離
  - 7段階のソート優先順位を実装
  - カテゴリ優先、末尾配置、モンスタータイプ、レベル等
- カテゴリマッチングを `src/composables/deck/useCategoryMatcher.ts` に分離
  - 2段階検索アルゴリズム（カテゴリラベル → カード名参照）
- ファイルサイズ: 2084行 → 1812行（13.0%削減）

### DeckMetadata.vue スタイルリファクタリング（397行削減）
- DeckMetadataHeader.vue との重複スタイル削除（250行）
  - ボタン、ドロップダウン、アニメーション等
- DeckMetadataTags.vue との重複スタイル削除（150行）
  - チップスタイルをテーマ変数ベースの改良版に移行
  - ダークモード対応のハードコードされたグラデーション削除
- DeckMetadataDescription.vue との重複スタイル削除（63行）
  - 説明テキストエリア、ラベル、文字カウント等
- ファイルサイズ: 887行 → 490行（44.8%削減）

### RightArea.vue スタイルリファクタリング（271行削減）
- CardDetail.vue との重複タブスタイル削除（30行）
- CardInfoTab.vue レイアウトスタイル削除（210行）
  - カード詳細表示、ステータス、リンクマーカー等
  - 効果テキスト、セクションタイトル等
- CardList.vue との重複カードスタイル削除（31行）
- ファイルサイズ: 790行 → 519行（34.3%削減）

### デバッグログの整理
- 本番不要な `console.log()` と `[DEBUG]` プレフィックス付きログを削除
- 削除対象ファイル:
  - `src/utils/mapping-manager.ts` - 約20箇所のデバッグログ削除
  - `src/components/searchInputBar/composables/useSearchExecution.ts` - 5箇所のデバッグログ削除
  - `src/composables/useSearchHistory.ts` - 4箇所のデバッグログ削除
- 削減効果: バンドルサイズ 1.86 MiB → 1.85 MiB（約11 KiB削減）

### デバッグログ運用ルールの策定
- `console.debug()` を推奨（ブラウザのVerboseレベルでのみ表示）
- `console.log()` は本番前に削除必須
- `console.warn()` / `console.error()` は本番でも保持
- CLAUDE.md にデバッグログのルールを追加
  - ログレベル使い分け表
  - 削除タイミングのガイドライン
  - Chrome DevToolsでの表示方法

## 技術的詳細

### 新規ファイル
- `src/utils/deck-uuid-generator.ts` - UUID生成の一元管理
- `src/composables/deck/useFLIPAnimation.ts` - FLIPアニメーション処理
- `src/utils/array-shuffle.ts` - 汎用Fisher-Yatesシャッフル
- `src/composables/deck/useDeckCardSorter.ts` - デッキカード比較関数生成
- `src/composables/deck/useCategoryMatcher.ts` - カテゴリマッチング処理

### 変更ファイル
- `src/stores/deck-edit.ts` - ロジック分離により272行削減
- `src/components/DeckMetadata.vue` - 重複スタイル削除により397行削減
- `src/components/RightArea.vue` - 重複スタイル削除により271行削減

### コード削減サマリー
| ファイル | 削減前 | 削減後 | 削減量 | 削減率 |
|---------|--------|--------|--------|--------|
| deck-edit.ts | 2084行 | 1812行 | 272行 | 13.0% |
| DeckMetadata.vue | 887行 | 490行 | 397行 | 44.8% |
| RightArea.vue | 790行 | 519行 | 271行 | 34.3% |
| **合計** | **3761行** | **2821行** | **940行** | **25.0%** |

### 設計原則
- **単一責任の原則（SRP）**: 各モジュールが1つの明確な責務を持つ
- **Composableパターン**: ロジックの再利用性とテスト可能性の向上
- **Pure Functions**: 副作用のない関数で予測可能な動作を実現
- **テーマ変数の活用**: ハードコードされたスタイルをテーマ変数に移行

### ドキュメント
- `docs/internal-reviews/reports/deck-edit-refactoring-plan.md` - deck-edit.ts リファクタリング計画
- `docs/internal-reviews/reports/DeckMetadata-style-refactoring-completion.md` - DeckMetadata.vue 完了レポート
- `docs/internal-reviews/reports/RightArea-style-refactoring-phase1-completion.md` - RightArea.vue 完了レポート

## 影響範囲
- コードの可読性と保守性が大幅に向上
- 破壊的変更なし、後方互換性維持
- 全てのビルド・デプロイが成功

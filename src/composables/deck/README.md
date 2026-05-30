# Deck Composables

デッキ編集機能に関連するComposableの説明。

## useDeckPersistence

**Facade Pattern**によるデッキの永続化層管理。

### 概要

`useDeckPersistence`は、デッキのロード・保存に関連する複雑な副作用（API通信、Store更新、URL同期、ローカルストレージ更新、通知等）を集約し、シンプルなインターフェースを提供します。

### アーキテクチャ

- **パターン**: Facade Pattern
- **依存性注入**: 副作用を持つ関数を引数で受け取る（テスタビリティ向上）
- **副作用の集約**: URL更新、localStorage更新、履歴リセット等を内部で一括処理

### 使用方法

```typescript
import { useDeckPersistence } from '@/composables/deck/useDeckPersistence';

// Storeから依存する関数を渡す
const persistence = useDeckPersistence({
  sessionManager,
  deckInfo,
  lastUsedDno,
  initializeDisplayOrder,
  clearHistory,
  captureDeckSnapshot,
  savedDeckSnapshot
});

// デッキをロード（プリロードデータがあればそれを使用）
await persistence.loadDeck(123);

// デッキを保存
const result = await persistence.saveDeck(123);
if (result.success) {
  console.log('保存成功');
}
```

### loadDeck の処理フロー

1. **プリロードデータ取得**: `window.ygoNextPreloadedDeckDetail` をチェック
2. **API呼び出し**: プリロードがなければ `getDeckDetailAPI` を実行
3. **Store状態更新**: `deckInfo.value` を更新（name は空にする）
4. **副作用の実行**:
   - URL state 同期（`URLStateManager.setDno`）
   - `initializeDisplayOrder()` 呼び出し
   - localStorage 更新（`lastUsedDno`）
   - `recordDeckOpen()` 呼び出し（Tier 5管理用）
   - `saveUnifiedCacheDB()` 呼び出し（Chrome Storage同期）
   - `clearHistory()` 呼び出し（コマンド履歴リセット）
   - `savedDeckSnapshot` 更新
5. **通知**: スキップカードがあればToast表示

### saveDeck の処理フロー

1. **deckInfo の準備**: `dno` を設定、`name` が空なら `originalName` を使用
2. **API呼び出し**: `sessionManager.saveDeck` を実行
3. **スナップショット更新**: 保存成功時に `savedDeckSnapshot` を更新
4. **エラーハンドリング**: 失敗時はエラーメッセージを返す

### テスト

- **ファイル**: `src/composables/deck/__tests__/useDeckPersistence.test.ts`
- **カバレッジ**: 97.11%（Statements）
- **テストケース数**: 10

主なテストケース:
- プリロードデータの有無による動作分岐
- API呼び出しとStore更新の確認
- 副作用関数（DI）の呼び出し確認
- スキップカード通知の表示
- エラーハンドリング

### 設計上の利点

1. **Storeの責務明確化**: Storeは状態管理に専念、ビジネスロジックはComposableに委譲
2. **テスタビリティ**: 依存性注入により、副作用をモック化したテストが容易
3. **再利用性**: 複数のコンポーネントから同じロジックを利用可能
4. **保守性**: 副作用の集約により、ロジックが分散せず、バグを防ぎやすい

### 移行の経緯

**REVIEW-7で承認されたリファクタリング計画に基づく:**

- **Phase 1**: `loadDeck` の移行とテスト作成（TASK-54）
- **Phase 2**: `saveDeck` の移行（TASK-55）
- **Phase 3**: `deck-edit.ts` のリファクタリングとドキュメント化（TASK-56）

詳細は `.claude/memories/` の関連メモリを参照。

---

## その他のComposables

### useDeckSnapshot

デッキのスナップショット管理（差分検出、ソート順序のみの変更判定等）。

### useDeckUndoRedo

デッキ編集のUndo/Redo機能を提供。

### useDeckDisplayOrder

デッキカードの表示順序管理（追加、削除、移動、並び替え等）。

### useDeckSorting

デッキカードのソート処理（公式サイト形式でのソート）。

### useDeckValidation

デッキカードの移動可否判定（枚数制限チェック等）。

### useDeckCardSorter

デッキカードの比較関数を生成（カテゴリ別ソート等）。

### useCategoryMatcher

カテゴリに一致するカードIDを計算。

### useFLIPAnimation

カード移動時のアニメーション管理（FLIP技法）。

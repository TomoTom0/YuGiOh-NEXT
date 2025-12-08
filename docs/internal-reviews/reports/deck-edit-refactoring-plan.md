# deck-edit.ts リファクタリング実施計画書

**作成日**: 2025-12-08
**対象**: `src/stores/deck-edit.ts` (2084行)
**目的**: 単一責務の原則に従い、保守性とテスト容易性を向上させる

---

## 現状分析

### ファイル規模
- **総行数**: 2084行
- **関数数**: 約80個
- **テストカバレッジ**: 718行（ユニットテスト536行 + Undo/Redoテスト182行）

### 責務の混在状況

現在のdeck-edit.tsは以下の責務が混在しています：

| カテゴリ | 関数数 | 説明 |
|---------|--------|------|
| displayOrder操作 | 12 | 低レベルの配列操作（add/remove/move/reorder） |
| カード操作（高レベル） | 8 | ビジネスロジック（addCard/removeCard/moveCard等） |
| アニメーション | 9 | FLIP アニメーション実装 |
| ソート/シャッフル | 12 | ソート・シャッフルロジック |
| スナップショット/履歴 | 23 | Undo/Redo機能 |
| UUID管理 | 5 | UUID生成・管理 |
| デッキ状態管理 | 10 | その他の状態管理 |

---

## リファクタリング方針

### 基本原則

1. **段階的リファクタリング**: 一度に全てを変更せず、小さなPRで段階的に実施
2. **テストファースト**: 既存のテストを活用し、各段階で回帰テストを実施
3. **破壊的変更の回避**: 既存のAPIを可能な限り維持

### 分割戦略

#### Phase 1: UUID管理の分離
**対象**: `generateUUID`, UUID関連ロジック
**移動先**: `src/utils/deck-uuid-generator.ts`
**理由**: 純粋関数であり、他の責務と独立している

#### Phase 2: displayOrder操作の分離
**対象**: displayOrder関連の12関数
**移動先**: `src/composables/deck/useDisplayOrder.ts`
**理由**: 低レベルの配列操作ロジックをcomposableとして分離

**公開インターフェース**:
```typescript
export function useDisplayOrder() {
  return {
    displayOrder,
    displayOrderBackup,
    initializeDisplayOrder,
    sortDisplayOrderForOfficial,
    backupDisplayOrder,
    restoreDisplayOrder,
    addToDisplayOrder,
    removeFromDisplayOrder,
    moveInDisplayOrder,
    reorderWithinSection
  };
}
```

#### Phase 3: アニメーション処理の分離
**対象**: `recordAllCardPositionsByUUID`, `animateCardMoveByUUID`等
**移動先**: `src/composables/deck/useFLIPAnimation.ts`
**理由**: DOM依存のアニメーション処理を分離

**公開インターフェース**:
```typescript
export function useFLIPAnimation() {
  return {
    recordAllCardPositionsByUUID,
    animateCardMoveByUUID
  };
}
```

#### Phase 4: ソート/シャッフル処理の分離
**対象**: `shuffleSection`, `sortSection`, `sortAllSections`等
**移動先**: `src/composables/deck/useDeckSorting.ts`
**理由**: ソート・シャッフルロジックを独立したcomposableに

**公開インターフェース**:
```typescript
export function useDeckSorting() {
  return {
    shuffleSection,
    sortSection,
    sortAllSections
  };
}
```

#### Phase 5: Undo/Redo機能の分離（検討）
**対象**: commandHistory, pushCommand, undo, redo等
**移動先**: `src/composables/deck/useCommandHistory.ts` （検討）
**理由**: 履歴管理ロジックの分離を検討するが、ストアとの結合度が高いため慎重に判断

**注意**: Undo/Redoは全体のデッキ状態に依存するため、Phase 5は後回しにする可能性あり

---

## 実施手順

### Step 1: テストの整備
- 現在のテストが全てパスすることを確認
- 必要に応じてテストケースを追加

### Step 2: Phase 1の実施（UUID管理）
1. `src/utils/deck-uuid-generator.ts` を作成
2. `generateUUID` と関連ロジックを移動
3. deck-edit.ts からimportに変更
4. テスト実行・修正

### Step 3: Phase 2の実施（displayOrder操作）
1. `src/composables/deck/useDisplayOrder.ts` を作成
2. displayOrder関連の12関数を移動
3. deck-edit.ts で composable を使用
4. テスト実行・修正

### Step 4: Phase 3の実施（アニメーション）
1. `src/composables/deck/useFLIPAnimation.ts` を作成
2. アニメーション関連ロジックを移動
3. deck-edit.ts で composable を使用
4. テスト実行・修正

### Step 5: Phase 4の実施（ソート/シャッフル）
1. `src/composables/deck/useDeckSorting.ts` を作成
2. ソート・シャッフルロジックを移動
3. deck-edit.ts で composable を使用
4. テスト実行・修正

### Step 6: 最終確認
1. 全テストの実行
2. ビルド・デプロイの確認
3. ドキュメントの更新

---

## 期待される効果

### 保守性の向上
- deck-edit.ts の行数を 2084行 → 約1200行に削減
- 各ファイルが単一の責務を持つため、変更の影響範囲が明確化

### テスト容易性の向上
- composable単体でのテストが可能
- モックの作成が容易

### 再利用性の向上
- displayOrder操作やアニメーションを他のコンポーネントでも使用可能

---

## リスクと対策

### リスク1: 既存機能の破壊
**対策**: 各Phaseで必ずテストを実行し、回帰を防ぐ

### リスク2: Undo/Redo機能の複雑性
**対策**: Phase 5（Undo/Redo）は慎重に検討し、無理に分離しない

### リスク3: 開発期間の長期化
**対策**: 各Phaseを小さなPRに分割し、段階的にマージ

---

## 次のアクション

1. ユーザーに本計画書を提示し、承認を得る
2. Step 1（テストの整備）から着手
3. Phase 1（UUID管理）の実装を開始

---

## 補足

- 本リファクタリングは破壊的変更を伴わないため、既存のAPIは維持される
- 各Phaseは独立して実施可能であり、必要に応じて順序を変更可能
- Undo/Redo機能の分離（Phase 5）は、Phase 1-4の完了後に改めて検討する

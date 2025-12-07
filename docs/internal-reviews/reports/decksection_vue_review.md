# DeckSection.vue レビューレポート

## 実施日
2025-12-07

## レビュー対象
- ファイル: `src/components/DeckSection.vue`
- ファイルサイズ: 444行
- 変更回数: 36回（高頻度）

## レビュー観点
1. ドラッグ処理の確認
2. drop時のエラーハンドリング確認
3. extraデッキカードの移動制限の確認

---

## 発見事項

### 🟡 中程度の問題

#### 1. Pendulum モンスターの扱いが不完全

**問題箇所**: `src/stores/deck-edit.ts:95-156` (canMoveCard関数)

**詳細**:
- extraデッキカードの判定で Pendulum モンスターが考慮されていない
- 現在の判定: fusion/synchro/xyz/link のみ
- **Pendulumモンスターの特性**: main/extra の両方に配置可能
  - Pendulumモンスターはmainデッキに入れることができる
  - Pendulum Fusion/Synchro/Xyz/Link はextraデッキにも入れることができる

**現在の実装**:
```typescript
const isExtraDeckCard = card.cardType === 'monster' && card.types?.some(t =>
  t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
);
```

**問題の影響**:
- 通常のPendulumモンスター: mainデッキに配置可能（OK）
- Pendulum Fusion/Synchro/Xyz/Link:
  - extraデッキに配置できない（問題）
  - mainデッキには配置できる（OK）

**推奨対応**:
Pendulumの扱いを明確化する必要がある：
```typescript
// オプション1: Pendulumはmainのみ許可（シンプル）
const isExtraDeckCard = card.cardType === 'monster' && card.types?.some(t =>
  (t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link') && t !== 'pendulum'
);

// オプション2: Pendulum Fusion等はextraも許可（複雑）
const isPendulum = card.types?.some(t => t === 'pendulum');
const isExtraDeckType = card.types?.some(t =>
  t === 'fusion' || t === 'synchro' || t === 'xyz' || t === 'link'
);
const isExtraDeckCard = card.cardType === 'monster' && isExtraDeckType;
// mainへの移動: Pendulumまたは通常モンスターは可
// extraへの移動: extraデッキタイプのみ可
```

**優先度**: 中（Pendulumカードの使用頻度による）

---

#### 2. エラーメッセージのユーザー通知が不足

**問題箇所**:
- `src/components/DeckSection.vue:91-95` (handleMoveResult)
- `src/components/DeckSection.vue:162-164` (handleEndDrop のcatch)

**詳細**:
- エラーが発生した場合、console.error のみでユーザーへの通知がない
- ユーザーは移動が失敗した理由がわからない

**現在の実装**:
```typescript
const handleMoveResult = (result) => {
  if (!result || result.success) return true
  console.error('[DeckSection] 移動失敗:', result.error)
  return false
}

// ...

} catch (e) {
  console.error('End drop error:', e)
}
```

**影響範囲**:
- ユーザーがドラッグ&ドロップ操作を失敗した理由がわからない
- 特に extraデッキカードの移動制限で失敗した場合、混乱する可能性

**推奨対応**:
- エラー時にトースト通知やダイアログで理由を表示
- 例: "EXデッキカードはメインデッキに移動できません"
- または、移動不可能な場合はドロップカーソルを変更（視覚的フィードバック）

**優先度**: 中（ユーザー体験の改善）

---

### 🟢 良好な点

#### 1. ドラッグ処理の実装

**箇所**: `src/components/DeckSection.vue:176-217`

**評価**:
- `canDropToSection()` で移動可能性を事前チェック（176-187行）
- `handleSectionDragOver` で移動可能な場合のみpreventDefault（189-205行）
- ドラッグ中の視覚的フィードバック（`isSectionDragOver`）が適切に実装
- グローバルなdragendイベントのリスナー登録（220-226行）

**良好な設計**:
- ドラッグ可能/不可能の状態が明確に表現される
- `event.preventDefault()` の呼び出しが適切に制御される
- ドラッグ終了時のクリーンアップが確実に実行される

---

#### 2. エラーハンドリングの基本構造

**箇所**: `src/components/DeckSection.vue:121-165`

**評価**:
- try-catch でドロップ処理を囲んでいる（131-164行）
- `handleMoveResult()` で移動結果をチェック（91-95行）
- データの存在確認が適切（133-141行）

**良好な設計**:
- エラーが発生してもアプリケーションがクラッシュしない
- 不正なデータでの処理を防ぐ
- JSON.parse のエラーをキャッチ

---

#### 3. extraデッキカードの移動制限の実装（基本部分）

**箇所**: `src/stores/deck-edit.ts:95-156`

**評価**:
- `canMoveCard()` で詳細な移動制限を実装
- fusion/synchro/xyz/link の判定が明確
- 各セクション間の移動ルールが網羅的に定義

**移動ルール**:
| From | To | 制限 |
|------|-----|------|
| search | trash | ❌ 移動不可 |
| search | main | ✅ 通常カードのみ可（extraデッキカードは不可） |
| search | extra | ✅ extraデッキカードのみ可 |
| search | side | ✅ 常に許可 |
| * | trash | ❌ 全て移動不可 |
| trash | * | ✅ 全て移動許可 |
| main/extra/side | main | ✅ 通常カードのみ可 |
| main/extra/side | extra | ✅ extraデッキカードのみ可 |
| main/extra/side | side | ✅ 常に許可 |

---

#### 4. displayOrderとの連携

**箇所**: `src/components/DeckSection.vue:98-101`

**評価**:
- `displayCards` computed が `deckStore.displayOrder[props.sectionType]` を使用
- セクションタイプに応じた適切なカードリストを取得
- リアクティブに更新される

**良好な設計**:
- displayOrderの変更が即座に反映される
- Vueのリアクティブシステムを活用

---

## テストカバレッジ評価

**現在のテスト**: `tests/unit/components/DeckSection.test.ts`

**カバー済み**:
- ✅ 基本表示（タイトル、カード枚数、クラス）
- ✅ カード表示（displayOrderからの表示）
- ✅ デッキタイプ別表示（main/extra/side）
- ✅ ドロップゾーンの存在確認
- ✅ TransitionGroupの存在確認

**未カバー**:
- ❌ **ドラッグ処理**（handleSectionDragOver, handleEndDrop）
- ❌ **エラーハンドリング**（移動失敗時の処理）
- ❌ **extraデッキカードの移動制限**（canMoveCardのロジック）
- ❌ **Pendulumモンスターの扱い**
- ❌ **セクション間のドラッグ&ドロップ**
- ❌ **視覚的フィードバック**（isSectionDragOver の状態変化）

---

## deck-edit.ts の canMoveCard() テスト確認

**テストファイル**: `tests/unit/stores/deck-edit.test.ts`

**発見事項**:
- `canMoveCard()` 関数のテストが**存在しない**
- extraデッキカードの移動制限がテストされていない
- Pendulumモンスターの扱いもテストされていない

**影響**:
- リファクタリング時に移動制限のロジックが破壊されるリスク
- バグが発生した場合の発見が遅れる

---

## 推奨対応アクション

### 優先度: 高

1. **canMoveCard() のテスト追加**
   - extraデッキカードの移動制限テスト
   - 各セクション間の移動ルールテスト
   - エラーケースのテスト

### 優先度: 中

2. **Pendulumモンスターの扱いを明確化**
   - 仕様を決定（main のみ / extra も許可）
   - canMoveCard() の実装を修正
   - テストケースを追加

3. **エラーメッセージのユーザー通知を実装**
   - トースト通知またはダイアログで理由を表示
   - 視覚的フィードバックの改善

4. **ドラッグ&ドロップのテスト追加**
   - handleEndDrop のテスト
   - セクション間のドラッグ&ドロップテスト
   - 視覚的フィードバックのテスト

### 優先度: 低

5. **ドキュメント更新**
   - 移動ルールをドキュメント化
   - Pendulumの扱いを明記

---

## まとめ

### 総合評価: 🟡 中（改善推奨）

**理由**:
- ドラッグ処理の基本構造は良好
- extraデッキカードの移動制限は概ね実装されている
- しかしPendulumモンスターの扱いが不完全
- エラーメッセージのユーザー通知が不足
- テストカバレッジが不十分（特にcanMoveCard）

**推奨アクション**:
1. canMoveCard() のテスト追加（最優先）
2. Pendulumモンスターの仕様決定と実装修正
3. エラーメッセージのユーザー通知を実装

**リスク評価**:
- **現在**: 中リスク（Pendulumカード使用時に問題発生の可能性）
- **対応後**: 低リスク

---

## 次のステップ

1. **v0.4.0リリース前**: canMoveCard() のテスト追加
2. **v0.4.1以降**: Pendulumモンスターの仕様決定と実装、エラー通知の改善
3. **継続的改善**: ドラッグ&ドロップのテスト追加

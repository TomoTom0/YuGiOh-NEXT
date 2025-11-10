# Phase 2: シャッフル機能設計書

**実装日:** 2025-11-09
**バージョン:** 0.2.0
**ステータス:** ✅ 完了

## 概要

デッキ表示ページにシャッフル・ソート機能とsortfix（カード固定）機能を追加。

## 機能仕様

### 1. シャッフル・ソートボタン

**配置:** デッキ表示ページの`#deck_image #main.card_set > div.subcatergory > div.top`内、カード枚数表示の左側

**ボタン仕様:**
- シャッフルボタン：ランダムアイコン（矢印交差）
- ソートボタン：ヒストグラムアイコン（昇順バー）
- サイズ：38px × 24px（padding: 1px 2px）
- アイコン：16×16px
- スタイル：`ytomo-neuron-btn`（青緑→赤紫グラデーション）

### 2. sortfix機能

**操作方法:**
- カード画像の右上1/4をクリックでsortfix ON/OFF切り替え
- sortfixされたカードはシャッフル・ソート時に先頭に固定

**視覚的フィードバック:**

1. **常時表示**
   - カード全体：薄い青緑背景（rgba(0, 206, 209, 0.1)）
   - 右上：南京錠アイコン（20×20px）
     - 線：青緑（#00CED1、太さ2px）
     - 縁取り：黒グレー（#333、太さ4px）

2. **ホバー時**
   - 右上1/4エリア：薄い青緑オーバーレイ（rgba(0, 206, 209, 0.3)）
   - カーソルがエリア内：明るく変化（rgba(0, 206, 209, 0.6)）
   - sortfix済み：解除マーク（斜線入り南京錠）表示

### 3. アニメーション

**カード移動アニメーション:**
```css
transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
```

**適用タイミング:**
- シャッフル実行時
- ソート実行時
- `animating`クラスを一時的に付与（400ms）

## 技術実装

### ファイル構成

```
src/content/shuffle/
├── index.ts              # エントリーポイント
├── addShuffleButtons.ts  # ボタン追加
├── shuffleCards.ts       # シャッフル・ソートロジック
└── sortfixCards.ts       # sortfix機能

src/content/styles/
└── buttons.css           # 共通ボタン・sortfixスタイル
```

### データ構造

**sortfix状態管理:**
```html
<!-- sortfix OFF -->
<a data-sortfix-initialized="true">

<!-- sortfix ON -->
<a data-sortfix-initialized="true" data-sortfix="true">
```

### アルゴリズム

**Fisher-Yates Shuffle:**
```typescript
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

**sortfix対応シャッフル:**
```typescript
const sortfixedCards = getSortfixedCards();
const normalCards = cardElements.filter(card => !sortfixedCards.includes(card));
const shuffled = fisherYatesShuffle(normalCards);

// 並べ替え: sortfix → シャッフル済み
sortfixedCards.forEach(card => imageSet.appendChild(card));
shuffled.forEach(card => imageSet.appendChild(card));
```

## UI/UX考慮事項

### ボタン配置理由
- カード枚数表示の隣に配置することで、デッキ操作の文脈を保持
- 既存UIとの一貫性を保つため`btn hex`クラスは不使用
- グラデーション背景で視認性向上

### sortfix UX
- 右上1/4という限定エリアで誤操作防止
- ホバー時のオーバーレイで操作可能範囲を明示
- カーソル位置に応じた明度変化でインタラクティブ性向上
- 常時表示の南京錠で状態を明確化

### アニメーション
- 0.4秒のスムーズな動きでカードの移動を視覚化
- cubic-bezierでナチュラルなイージング

## 制約事項

- デッキ表示ページ（`ope=1`）でのみ動作
- 編集ページ（`ope=2`）では非表示
- DOM構造変更には非対応（ページリロードが必要）

## テスト結果

✅ シャッフル機能正常動作
✅ sortfix ON/OFF切り替え正常動作
✅ sortfixカード先頭固定確認
✅ 視覚的フィードバック全て正常表示
✅ アニメーション動作確認
✅ ボタンサイズ・スタイル確認

## 参考資料

- [Phase 2タスク仕様](../../tasks/todo.md)
- [シャッフル機能調査](../research/shuffle-feature-investigation.md)

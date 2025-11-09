# シャッフル機能の調査結果

調査日: 2025-11-09

## 概要

デッキ表示ページの`#deck_image`エリアにシャッフル機能を追加するための調査を実施。

## 調査対象URL

公開デッキ表示ページ:
```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
```

## DOM構造

### #deck_imageエリアの構造

デッキ表示ページには2つの表示エリアがあります：
1. **#deck_image** - カード画像を視覚的に表示するエリア（シャッフル対象）
2. **#deck_detailtext** - カード名などのリスト表示エリア（変更不要）

### #deck_image #main.card_setの構造

```html
<div id="deck_image">
  <div id="main" class="card_set">
    <div class="subcatergory">
      <div class="top">
        <span class="icon"><!-- SVG --></span>
        <h3>メインデッキ</h3>
        <span>41</span> <!-- カード枚数、nth-child(3) -->
      </div>
    </div>

    <div class="image_set">
      <a class="none" href="/yugiohdb/card_search.action?...">
        <span>
          <img class="card_image_monster_0_1" src="..." alt="オッドアイズ・アークペンデュラム・ドラゴン" />
        </span>
      </a>
      <a class="none" href="/yugiohdb/card_search.action?...">
        <span>
          <img class="card_image_monster_1_1" src="..." alt="覇王門の魔術師" />
        </span>
      </a>
      <!-- ... 41枚分のa要素 -->
    </div>
  </div>

  <div id="extra" class="card_set">
    <!-- エクストラデッキ（15枚） -->
  </div>

  <div id="side" class="card_set">
    <!-- サイドデッキ（15枚） -->
  </div>
</div>
```

### 要素の階層

```
#deck_image
  └─ #main.card_set
      ├─ div.subcatergory
      │   └─ div.top
      │       ├─ span.icon (SVG)
      │       ├─ h3 (メインデッキ)
      │       └─ span (41) ← ボタン配置場所: この左側
      └─ div.image_set
          ├─ a.none (1枚目のカード)
          │   └─ span
          │       └─ img
          ├─ a.none (2枚目のカード)
          │   └─ span
          │       └─ img
          └─ ... (41枚分)
```

## 実装方針

### ボタン配置

**配置場所**: `#main > div.subcatergory > div.top > span:nth-child(3)`の左側

phase2.mdの仕様:
- 場所: `#main > div.subcatergory > div > span:nth-child(3)`の左

実装方法:
```typescript
const main = document.querySelector('#deck_image #main.card_set');
const top = main.querySelector('div.subcatergory > div.top');
const cardCountSpan = top.querySelector('span:nth-child(3)');

// ボタンコンテナを作成してcardCountSpanの前に挿入
const buttonContainer = document.createElement('div');
buttonContainer.className = 'shuffle-buttons';
top.insertBefore(buttonContainer, cardCountSpan);
```

### シャッフル機能

**対象**: メインデッキ（#main.card_set）のみ

**方法**: `div.image_set`の直下にある`<a>`要素の順序を入れ替える

実装手順:
1. `#deck_image #main.card_set div.image_set`の直下の`<a>`要素を全て取得
2. `<a>`要素の配列をシャッフル（Fisher-Yates アルゴリズム）
3. シャッフルした順序で`div.image_set`に再追加

実装例:
```typescript
const imageSet = document.querySelector('#deck_image #main.card_set div.image_set');
const cardElements = Array.from(imageSet.querySelectorAll(':scope > a'));

// シャッフル（Fisher-Yates）
const shuffled = [...cardElements];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

// 再配置
imageSet.innerHTML = '';
shuffled.forEach(card => imageSet.appendChild(card));
```

### ソート機能

**目的**: 元の順序に戻す

実装方法:
1. 初回シャッフル前に元の`<a>`要素の順序を保存
2. ソートボタンクリックで保存した順序に復元

```typescript
// 初回保存
const originalOrder = Array.from(imageSet.querySelectorAll(':scope > a'));

// 復元
imageSet.innerHTML = '';
originalOrder.forEach(card => imageSet.appendChild(card));
```

### flip and shuffle機能

**目的**: シャッフル + カード画像を裏面に置き換え

実装手順:
1. シャッフルを実行
2. すべての `img` 要素の `src` をカードバック画像に置き換え
3. 各カード（`<a>`要素）にクリックイベントを追加
4. クリック時に元の画像URLに戻す

カードバック画像:
- パス: `src/assets/card-back.png` または外部URL
- サイズ: オリジナルのカード画像と同じ

実装例:
```typescript
// 1. シャッフル実行
shuffleCards();

// 2. 全画像を裏面に
const images = imageSet.querySelectorAll('img');
images.forEach(img => {
  img.dataset.originalSrc = img.src;
  img.src = cardBackUrl;
});

// 3. クリックで表面表示
const cardLinks = imageSet.querySelectorAll('a');
cardLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const img = link.querySelector('img');
    if (img.dataset.originalSrc) {
      img.src = img.dataset.originalSrc;
      delete img.dataset.originalSrc;
    }
  });
});
```

## 技術的な注意点

### 1. セレクタの特定性

- `:scope > a` を使用して直下の`<a>`要素のみを取得
- `#deck_image #main.card_set` で明示的にスコープを限定

### 2. 元のイベントリスナーの保持

- `<a>`要素を移動してもイベントリスナーは保持される
- 元のドラッグ&ドロップ機能は影響を受けない

### 3. カードバック画像の準備

- `src/assets/card-back.png` を用意
- または公式のカードバック画像URLを使用

## 次のステップ

1. ✅ 調査完了
2. ⏭️ ボタンUI実装
3. ⏭️ シャッフル機能実装
4. ⏭️ ソート機能実装
5. ⏭️ flip and shuffle機能実装
6. ⏭️ ブラウザでの動作確認

## 参考資料

- phase2.md仕様: `docs/design/phase2.md`
- 調査スクリプト: `tmp/browser/investigate-deck-image-structure.js`
- サンプルHTML: `tmp/deck-display-page.html`

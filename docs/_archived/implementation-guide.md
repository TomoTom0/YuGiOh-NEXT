# 実装ガイド：調査結果からChrome拡張へ

## 概要

このドキュメントは、Playwrightによる調査結果をChrome拡張の実装にマッピングする方法を示します。

## 調査結果の活用マップ

### 1. カードタイプ別フィールドマッピング（最重要）

#### 調査結果
**場所**: `docs/research/api-investigation-results.md` の「カードタイプ別フィールド名マッピング」セクション

**発見内容**:
- すべてのカードタイプが同じID属性を使用
- name属性が異なる
- `querySelector('#card_id_1')` は間違い（最初のモンスターカードを返す）
- 正しくは `querySelector('#card_id_1[name="spellCardId"]')`

#### 実装への適用
**実装ファイル**: `extension/src/content/dom/fields.ts`

**調査スクリプト**: `tmp/save-deck-function.js` (行41-69)
```javascript
const getFieldNames = (cardType) => {
  if (cardType === 'モンスター') {
    return {
      name: 'monm',
      num: 'monum',
      cardIdPrefix: 'card_id',
      cardIdName: 'monsterCardId',
      imgs: 'imgs_mo'
    };
  } else if (cardType === '魔法') {
    return {
      name: 'spnm',
      num: 'spnum',
      cardIdPrefix: 'card_id',
      cardIdName: 'spellCardId',
      imgs: 'imgs_sp'
    };
  } // ...
};
```

**Chrome拡張での実装**:
```typescript
// extension/src/content/dom/fields.ts
export function getFieldNames(cardType: CardType): CardTypeFields {
  switch (cardType) {
    case 'モンスター':
      return {
        nameField: 'monm',
        numField: 'monum',
        cardIdPrefix: 'card_id',
        cardIdName: 'monsterCardId',
        imgsPrefix: 'imgs_mo',
      };
    // ...
  }
}

export function getCardIdField(index: number, cardType: CardType): HTMLInputElement | null {
  const fields = getFieldNames(cardType);
  // ⚠️ 重要：name属性も指定
  return document.querySelector<HTMLInputElement>(
    `#${fields.cardIdPrefix}_${index}[name="${fields.cardIdName}"]`
  );
}
```

---

### 2. デッキ保存操作

#### 調査結果
**場所**: `docs/research/api-investigation-results.md` の「デッキ保存API（ope=3）の実装」セクション

**発見内容**:
- API URL: `/yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja`
- メソッド: POST
- データ: `'ope=3&' + $('#form_regist').serialize()`
- レスポンス: `{"result": true}` または `{"error": ["..."]}`

#### 実装への適用
**実装ファイル**: `extension/src/content/deck/save.ts`

**調査スクリプト**: `tmp/save-deck-function.js` (行152-163)
```javascript
const saveResponse = await page.evaluate(async ({ cgid }) => {
  return new Promise((resolve) => {
    $.ajax({
      type: 'post',
      url: `/yugiohdb/member_deck.action?cgid=${cgid}&request_locale=ja`,
      data: 'ope=3&' + $('#form_regist').serialize(),
      dataType: 'json',
      success: (data) => resolve({ success: true, result: data.result }),
      error: (xhr) => resolve({ success: false, status: xhr.status })
    });
  });
}, { cgid });
```

**Chrome拡張での実装**:
```typescript
// extension/src/content/deck/save.ts
async function executeSave(): Promise<{ result: boolean; error?: string[] }> {
  return new Promise((resolve) => {
    const urlParams = new URLSearchParams(window.location.search);
    const cgid = urlParams.get('cgid');

    (window as any).$.ajax({
      type: 'post',
      url: `/yugiohdb/member_deck.action?cgid=${cgid}&request_locale=ja`,
      data: `ope=3&${(window as any).$('#form_regist').serialize()}`,
      dataType: 'json',
      success: (data: any) => resolve({ result: data.result, error: data.error }),
      error: () => resolve({ result: false, error: ['ネットワークエラー'] }),
    });
  });
}
```

---

### 3. カード情報の抽出

#### 調査結果
**場所**: `docs/research/card-information-structure.md` の「検索結果ページのHTML構造」セクション

**発見内容**:
- カード行: `.t_row.c_normal`
- カード名: `.card_name`
- カードID: `input.cid`
- **カードタイプ**: `.box_card_attribute span:last-child`（重要！）
- 画像ID: `img[alt]` の `src` から `ciid=(\d+)` で抽出

#### 実装への適用
**実装ファイル**: `extension/src/content/card/extract.ts`

**調査スクリプト**: `tmp/complete-workflow-with-card-type.js` (行22-51)
```javascript
const cardList = await page.evaluate(() => {
  const cards = [];
  const cardRows = Array.from(document.querySelectorAll('.t_row.c_normal')).slice(0, 3);

  for (const row of cardRows) {
    const nameElement = row.querySelector('.card_name');
    const cidInput = row.querySelector('input.cid');
    const cardTypeSpan = row.querySelector('.box_card_attribute span:last-child');
    const img = row.querySelector('img[alt]');

    let ciid = '1';
    if (img && img.src) {
      const ciidMatch = img.src.match(/ciid=(\d+)/);
      if (ciidMatch) ciid = ciidMatch[1];
    }

    if (nameElement && cidInput && cardTypeSpan) {
      const cardType = cardTypeSpan.textContent.trim();
      cards.push({
        name: nameElement.textContent.trim(),
        cardId: cidInput.value,
        ciid: ciid,
        cardType: cardType,
        quantity: 1
      });
    }
  }
  return cards;
});
```

**Chrome拡張での実装**:
```typescript
// extension/src/content/card/extract.ts
export function extractCardsFromSearchResult(): CardInfo[] {
  const cards: CardInfo[] = [];
  const cardRows = document.querySelectorAll('.t_row.c_normal');

  cardRows.forEach(row => {
    const nameElement = row.querySelector('.card_name');
    const cidInput = row.querySelector<HTMLInputElement>('input.cid');
    const cardTypeSpan = row.querySelector('.box_card_attribute span:last-child');
    const img = row.querySelector<HTMLImageElement>('img[alt]');

    if (!nameElement || !cidInput || !cardTypeSpan) return;

    let imageId = '1';
    if (img?.src) {
      const ciidMatch = img.src.match(/ciid=(\d+)/);
      if (ciidMatch) imageId = ciidMatch[1];
    }

    cards.push({
      name: nameElement.textContent?.trim() || '',
      cardId: cidInput.value,
      imageId,
      cardType: cardTypeSpan.textContent?.trim() as CardType,
    });
  });

  return cards;
}
```

---

### 4. フォームのクリア

#### 調査結果
**場所**: 調査スクリプト `tmp/save-deck-function.js`

**発見内容**:
- クリアすべきフィールド: `monm`, `monum`, `spnm`, `spnum`, `trnm`, `trnum`
- カードID: `monsterCardId`, `spellCardId`, `trapCardId`
- 画像ID: `imgs`, `imgsSide`

#### 実装への適用
**実装ファイル**: `extension/src/content/deck/save.ts`

**調査スクリプト**: `tmp/save-deck-function.js` (行53-82)
```javascript
// すべてのカードフィールドをクリア
const fieldTypes = ['monm', 'monum', 'spnm', 'spnum', 'trnm', 'trnum'];
for (const fieldType of fieldTypes) {
  const inputs = document.querySelectorAll(`input[name="${fieldType}"]`);
  for (const input of inputs) {
    if (input.value) {
      input.value = '';
      results.cleared++;
    }
  }
}

// カードIDと画像IDもクリア
const cardIdInputs = document.querySelectorAll('input[name="monsterCardId"], input[name="spellCardId"], input[name="trapCardId"]');
for (const input of cardIdInputs) {
  if (input.value) {
    input.value = '';
    results.cleared++;
  }
}
```

**Chrome拡張での実装**:
```typescript
// extension/src/content/deck/save.ts
function clearAllFields(): number {
  let count = 0;
  const fieldTypes = ['monm', 'monum', 'spnm', 'spnum', 'trnm', 'trnum'];

  for (const fieldType of fieldTypes) {
    const inputs = document.querySelectorAll<HTMLInputElement>(`input[name="${fieldType}"]`);
    inputs.forEach(input => {
      if (input.value) {
        input.value = '';
        count++;
      }
    });
  }

  // カードIDと画像IDもクリア
  const cardIdInputs = document.querySelectorAll<HTMLInputElement>(
    'input[name="monsterCardId"], input[name="spellCardId"], input[name="trapCardId"]'
  );
  cardIdInputs.forEach(input => {
    if (input.value) {
      input.value = '';
      count++;
    }
  });

  return count;
}
```

---

### 5. DOM セレクタ定数

#### 調査結果
**場所**: 調査スクリプト全体から抽出

**発見内容**:
- デッキ編集フォーム: `#form_regist`
- デッキ名: `input[name="dnm"]`
- デッキ説明: `textarea[name="deckdetail"]`
- CSRFトークン: `input[name="ytkn"]`
- 保存ボタン: `#btn_regist`

#### 実装への適用
**実装ファイル**: `extension/src/content/dom/selectors.ts`

**調査スクリプトからの抽出**:
```javascript
// tmp/save-deck-function.js より
document.querySelector('input[name="dnm"]')
document.querySelector('textarea[name="deckdetail"]')
$('#form_regist').serialize()

// tmp/complete-workflow-with-card-type.js より
document.querySelectorAll('.t_row.c_normal')
row.querySelector('.card_name')
row.querySelector('input.cid')
row.querySelector('.box_card_attribute span:last-child')
```

**Chrome拡張での実装**:
```typescript
// extension/src/content/dom/selectors.ts
export const SELECTORS = {
  DECK_EDIT: {
    FORM: '#form_regist',
    DECK_NAME: 'input[name="dnm"]',
    DECK_DESCRIPTION: 'textarea[name="deckdetail"]',
    YTKN: 'input[name="ytkn"]',
    SAVE_BUTTON: '#btn_regist',
  },
  CARD_SEARCH: {
    CARD_ROW: '.t_row.c_normal',
    CARD_NAME: '.card_name',
    CARD_ID_INPUT: 'input.cid',
    CARD_TYPE: '.box_card_attribute span:last-child',
    IMAGE: 'img[alt]',
  },
} as const;
```

---

## 実装チェックリスト

### フェーズ1: 型定義と定数
- [ ] `src/types/card.ts` - カード関連の型
- [ ] `src/types/deck.ts` - デッキ関連の型
- [ ] `src/types/message.ts` - メッセージング用の型
- [ ] `src/content/dom/selectors.ts` - DOMセレクタ定数

### フェーズ2: DOM操作ユーティリティ
- [ ] `src/content/dom/fields.ts` - フィールド名マッピング
  - [ ] `getFieldNames()` - カードタイプに応じたフィールド名取得
  - [ ] `getCardIdField()` - 正しいカードIDフィールド取得（name属性指定）
  - [ ] `findEmptySlot()` - 空のスロット検索

### フェーズ3: デッキ保存機能
- [ ] `src/content/deck/save.ts` - デッキ保存
  - [ ] `saveDeck()` - メイン関数
  - [ ] `clearAllFields()` - フォームクリア
  - [ ] `groupCardsByType()` - カードタイプごとにグループ化
  - [ ] `setCards()` - カード設定
  - [ ] `setDeckInfo()` - デッキヘッダー情報設定
  - [ ] `executeSave()` - 保存API実行

### フェーズ4: カード抽出機能
- [ ] `src/content/card/extract.ts` - カード情報抽出
  - [ ] `extractCardsFromSearchResult()` - 検索結果からカード抽出
  - [ ] `isValidCardType()` - カードタイプ検証

### フェーズ5: 統合とテスト
- [ ] Content Script統合
- [ ] Background Script実装
- [ ] Popup UI実装
- [ ] E2Eテスト

---

## 調査スクリプトの参照一覧

| 調査スクリプト | 主な発見内容 | 対応する実装ファイル |
|--------------|------------|-------------------|
| `tmp/save-deck-function.js` | デッキ保存の完全実装 | `src/content/deck/save.ts` |
| `tmp/complete-workflow-with-card-type.js` | カードタイプ判定と完全ワークフロー | `src/content/card/extract.ts`, `src/content/deck/save.ts` |
| `tmp/save-deck-debug.js` | serialize()内容の確認 | デバッグ用 |
| `tmp/verify-deck-4.js` | デッキ内容の検証 | テスト用 |

---

## トラブルシューティング

### 問題: カードが保存されない

**調査結果**: `tmp/save-deck-debug.js` の出力を確認
```
=== serialize()の内容（最初の500文字） ===
...monsterCardId=21580...
```

**原因**: 魔法カードなのにmonsterCardIdに設定されている

**解決**: `getCardIdField()` でname属性も指定
```typescript
querySelector(`#card_id_${index}[name="spellCardId"]`)
```

### 問題: カードタイプが判定できない

**調査結果**: `.box_card_attribute span:last-child` から取得

**確認方法**:
```typescript
const cardTypeSpan = row.querySelector('.box_card_attribute span:last-child');
console.log(cardTypeSpan?.textContent); // '魔法', 'モンスター', '罠'
```

---

## まとめ

このガイドにより：

1. **調査結果とChrome拡張実装の明確なマッピング**
2. **調査スクリプトを参照しながら実装できる構造**
3. **重要な発見（カードタイプ別フィールドマッピング）を見失わない**
4. **段階的な実装が可能なチェックリスト**

次のステップ：
1. 型定義から実装開始
2. DOM操作ユーティリティの実装
3. MVP（デッキ保存機能）の実装

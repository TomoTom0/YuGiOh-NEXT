# QRコードURLバグ修正

**修正日:** 2025-11-09
**バージョン:** 0.2.0
**重要度:** 🔴 Critical Bug Fix

## 問題の概要

デッキレシピ画像のQRコードに含まれるURLが、`dno`（デッキ番号）のみで、`cgid`（ユーザーID）が欠落していた。

これにより、QRコードをスキャンしてもデッキページにアクセスできない致命的なバグがあった。

## 根本原因

Yu-Gi-Oh! デッキデータベースでは、デッキは`cgid`（ユーザーID）と`dno`（デッキ番号）の組み合わせで一意に識別される。

異なるユーザーが同じ`dno`を持つ可能性があるため、`dno`だけではデッキを特定できない。

### 問題のあったURL

```typescript
// ❌ 動作しないURL
const qrUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&dno=${dno}`;
```

**結果:**
- URLにアクセスしても「Download Deck Recipe Form」ページが表示される
- デッキ情報（`#deck_image`）が表示されない

## 修正内容

### 1. 型定義の修正

**ファイル:** `src/types/deck-recipe-image.ts`

```typescript
export interface CreateDeckRecipeImageOptions {
  dno: string;
  cgid: string;  // ← 追加
  // ...
}
```

### 2. URL生成の修正

**ファイル:** `src/content/deck-recipe/createDeckRecipeImage.ts`

```typescript
// ✅ 正しいURL
const qrUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}`;
```

### 3. cgid取得処理の追加

**ファイル:** `src/content/deck-recipe/imageDialog.ts`

```typescript
// URLからcgidを抽出
const cgidMatch = url.match(/cgid=([a-f0-9]+)/);
if (!cgidMatch || !cgidMatch[1]) {
  console.error('[YGO Helper] Failed to get user ID from URL');
  return;
}
const cgid = cgidMatch[1];
```

### 4. テストUIの修正

**ファイル:** `src/content/test-ui/index.ts`

- `cgid`入力欄を追加（デフォルト値: `87999bd183514004b8aa8afa1ff1bdb9`）
- `downloadDeckRecipeImage`呼び出し時に`cgid`を渡すように修正

## 検証方法

### 1. dnoのみのURLテスト

```bash
node tmp/browser/test-dno-only-url.js
```

**結果:**
```json
{
  "hasDeckInfo": false,
  "bodyPreview": "Download Deck Recipe Form..."
}
```

### 2. cgid + dnoのURLテスト

```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
```

**結果:**
- ✅ デッキ情報が正常に表示される
- ✅ `#deck_image`要素が存在する

## 影響範囲

**修正前に生成された画像:**
- QRコードが機能しない
- ユーザーはURLを手動で入力する必要がある

**修正後に生成される画像:**
- QRコードから正常にデッキページにアクセス可能

## 今後の防止策

1. **URLパターンのテストケース追加**
   - QRコードURLが正しい形式か検証
   - cgid・dnoの両方が含まれているか確認

2. **型安全性の強化**
   - 必須パラメータを型定義で明示
   - コンパイル時にチェック

3. **ドキュメント化**
   - URL構造を明確に記載
   - パラメータの意味と必要性を説明

## 参考資料

- [デッキURL構造調査](../research/deck-url-structure.md)
- [QRコード生成実装](../api/qr-code-generation.md)

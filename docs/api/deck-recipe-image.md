# Deck Recipe Image API

デッキレシピ画像の作成とダウンロード関連のAPI。

## 主要な関数

### `downloadDeckRecipeImage(options: DownloadDeckRecipeImageOptions): Promise<void>`

デッキレシピ画像を作成してダウンロードする。

**パラメータ:**
- `options: DownloadDeckRecipeImageOptions` - ダウンロードオプション

**戻り値:**
- `Promise<void>`

**エラーハンドリング:**
- デッキ取得エラー、パースエラー、画像作成エラーなど、すべてのエラーが呼び出し元に投げられます
- 呼び出し元でtry-catchが必要です

**使用例:**
```typescript
try {
  await downloadDeckRecipeImage({
    dno: '232',
    color: 'red',
    includeQR: true,
    scale: 2
  });
  console.log('ダウンロード完了');
} catch (error) {
  console.error('エラー:', error.message);
}
```

**内部動作:**

1. **デッキデータの取得**（`deckData`が未指定の場合）:
   ```typescript
   const cgid = await sessionManager.getCgid();
   const url = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${options.dno}`;
   const response = await axios.get(url, { withCredentials: true });
   const doc = parser.parseFromString(response.data, 'text/html');
   const deckData = parseDeckDetail(doc);  // エラーが投げられる可能性あり
   ```

2. **画像作成**:
   ```typescript
   const result = await createDeckRecipeImage({
     ...options,
     deckData
   });
   ```

3. **ファイル名生成**:
   ```typescript
   const fileName = options.fileName || `${deckData.name}_${timestamp}.jpg`;
   ```

4. **ダウンロード実行**:
   ```typescript
   downloadBlob(blob, fileName);
   ```

---

### `createDeckRecipeImage(options: CreateDeckRecipeImageOptions): Promise<Blob | Buffer>`

デッキレシピ画像を作成する。

**パラメータ:**
- `options: CreateDeckRecipeImageOptions` - 画像作成オプション

**戻り値:**
- `Promise<Blob | Buffer>` - ブラウザ環境ではBlob、Node.js環境ではBuffer

**エラーハンドリング:**
- 画像作成エラーが発生した場合、エラーを投げます

**使用例:**
```typescript
const blob = await createDeckRecipeImage({
  deckData: deckInfo,
  color: 'blue',
  includeQR: true,
  scale: 2
});
```

---

## 型定義

### `DownloadDeckRecipeImageOptions`

```typescript
interface DownloadDeckRecipeImageOptions {
  dno?: string;                    // デッキ番号（deckData未指定の場合は必須）
  deckData?: DeckInfo;             // デッキ情報（指定すればdnoは不要）
  color?: 'red' | 'blue' | 'green' | 'yellow';  // 背景色（デフォルト: 'red'）
  includeQR?: boolean;             // QRコードを含めるか（デフォルト: false）
  scale?: number;                  // 画像のスケール（デフォルト: 2）
  fileName?: string;               // ファイル名（オプション）
}
```

### `CreateDeckRecipeImageOptions`

```typescript
interface CreateDeckRecipeImageOptions {
  deckData: DeckInfo;              // デッキ情報（必須）
  color?: 'red' | 'blue' | 'green' | 'yellow';
  includeQR?: boolean;
  scale?: number;
}
```

---

## エラーハンドリング

### エラーの種類

1. **セッションエラー**
   ```typescript
   // sessionManager.getCgid()から投げられる
   throw new Error('cgidが見つかりません');
   ```

2. **デッキ取得エラー**
   ```typescript
   // axios.get()から投げられる
   throw new Error('Network Error');
   ```

3. **パースエラー**
   ```typescript
   // parseDeckDetail()から投げられる
   throw new Error('#main980が見つかりません。デッキ表示ページではありません。');
   ```

4. **画像作成エラー**
   ```typescript
   // createDeckRecipeImage()から投げられる
   throw new Error('Failed to create image');
   ```

### エラーハンドリングの例

```typescript
try {
  await downloadDeckRecipeImage({ dno: '232' });
} catch (error) {
  if (error.message.includes('cgid')) {
    alert('ログインが必要です');
  } else if (error.message.includes('#main980')) {
    alert('デッキページの構造が不正です');
  } else if (error.message.includes('Network')) {
    alert('ネットワークエラーが発生しました');
  } else {
    alert(`エラー: ${error.message}`);
  }
}
```

---

## 画像仕様

### サイズ
- デフォルト: 1200 x 675 (scale: 2)
- scale: 1の場合: 600 x 337.5
- scale: 3の場合: 1800 x 1012.5

### フォーマット
- JPEG形式
- 品質: 90%

### レイアウト
- デッキ名
- メインデッキカード（最大60枚）
- エクストラデッキカード（最大15枚）
- サイドデッキカード（最大15枚）
- QRコード（オプション）

---

## 使用例

### 基本的な使用

```typescript
// dnoからデッキを取得して画像を作成
await downloadDeckRecipeImage({
  dno: '232'
});
```

### オプション指定

```typescript
// すべてのオプションを指定
await downloadDeckRecipeImage({
  dno: '232',
  color: 'blue',
  includeQR: true,
  scale: 2,
  fileName: 'my-deck.jpg'
});
```

### deckDataを直接指定

```typescript
// 既にDeckInfoを取得済みの場合
const deckInfo = await getDeckInfo();
await downloadDeckRecipeImage({
  deckData: deckInfo,
  color: 'red'
});
```

---

## ファイル名の生成規則

```typescript
// デフォルトのファイル名
`${deckName}_${timestamp}.jpg`

// 例
"完全版テスト成功_2025-11-07T12-30-45.jpg"
```

---

## 注意事項

1. **ログインが必要**: dnoからデッキを取得する場合、ログインが必要です。

2. **エラーハンドリング必須**: すべてのエラーが投げられるため、必ずtry-catchで囲む必要があります。

3. **パフォーマンス**: 画像作成には時間がかかる場合があります（数秒程度）。

4. **メモリ使用量**: scaleを大きくすると、メモリ使用量が増加します。

5. **ブラウザ互換性**: ダウンロード機能はモダンブラウザでのみ動作します。

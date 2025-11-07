# Session API

セッション管理関連のAPI。

## 主要な関数

### `sessionManager.getCgid(): Promise<string>`

現在のユーザーのcgid（ユーザー識別子）を取得する。

**戻り値:**
- `Promise<string>` - cgid文字列

**エラーハンドリング:**
- セッションが確立されていない場合、エラーを投げます
- 呼び出し元でtry-catchが必要です

**使用例:**
```typescript
try {
  const cgid = await sessionManager.getCgid();
  console.log('cgid:', cgid);

  // デッキURLを構築
  const deckUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=232`;
} catch (error) {
  console.error('cgid取得エラー:', error.message);
}
```

---

### `sessionManager.isSessionValid(): Promise<boolean>`

セッションが有効かどうかを確認する。

**戻り値:**
- `Promise<boolean>` - セッションが有効な場合true

**使用例:**
```typescript
const isValid = await sessionManager.isSessionValid();
if (!isValid) {
  console.warn('セッションが無効です。ログインが必要です。');
}
```

---

## セッション管理の仕組み

### cgidとは

cgidは遊戯王ニューロンの公式サイトで使用されるユーザー識別子です。

- ログイン時にサーバーから発行される
- デッキへのアクセスに必要
- 形式: 32文字の16進数文字列（例: `87999bd183514004b8aa8afa1ff1bdb9`）

### cgidの取得方法

1. **ページのHTMLから抽出**
   - `<input type="hidden" id="cgid" value="...">`を探す
   - JavaScriptコード内の`cgid=`パラメータを探す

2. **Cookieから取得**
   - ブラウザのCookieに保存されている場合がある

### セッションの有効期限

- セッションは一定時間で失効する
- 失効後は再ログインが必要

---

## エラーハンドリング

```typescript
try {
  const cgid = await sessionManager.getCgid();
  // 処理を続行
} catch (error) {
  if (error.message.includes('cgid')) {
    console.error('cgidが見つかりません。ログインしてください。');
  } else {
    console.error('セッションエラー:', error.message);
  }
}
```

---

## 使用例

### デッキ取得

```typescript
// 1. cgidを取得
const cgid = await sessionManager.getCgid();

// 2. デッキURLを構築
const deckUrl = `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}`;

// 3. デッキを取得
const response = await axios.get(deckUrl, { withCredentials: true });
```

### セッション確認

```typescript
// セッションが有効か確認してから処理を実行
if (await sessionManager.isSessionValid()) {
  const cgid = await sessionManager.getCgid();
  // デッキ操作
} else {
  alert('ログインが必要です');
}
```

---

## 注意事項

1. **ログインが必要**: cgidはログイン後にのみ取得できます。

2. **withCredentials**: HTTPリクエスト時は`withCredentials: true`を指定する必要があります。

3. **セキュリティ**: cgidは機密情報です。ログに出力する際は注意してください。

4. **有効期限**: セッションには有効期限があります。定期的な確認が推奨されます。

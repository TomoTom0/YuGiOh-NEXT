# Load時のciid保持修正 - 手動テスト手順

## 目的
Load操作で異なるciid（カード画像バリエーション）が正しく保持されるか確認する。

## 前提条件
- Chromiumが起動している（`./scripts/debug/setup/start-chrome.sh`で起動済み）
- 拡張機能がロードされている
- https://www.db.yugioh-card.com/yugiohdb/ にログイン済み

## テスト手順

### 1. テスト用デッキの準備

1. ブラウザで https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit にアクセス
2. 新規デッキを作成するか、既存のデッキを編集
3. 同じカード（例: cid=15239「青眼の白龍」）で異なるciid（アートワーク）を持つカードを追加
   - デッキ編集画面で、カード検索で「青眼の白龍」を検索
   - 検索結果のカードを右クリック → 「画像を変更」でciid=2を選択
   - メインデッキに追加
4. Saveボタンでデッキを保存（dno=8など、覚えやすい番号）

### 2. ブラウザコンソールを開く

1. F12キーを押して開発者ツールを開く
2. Consoleタブを選択
3. ログをクリア（Clear console）

### 3. Load操作を実行

1. デッキ編集画面で「New」ボタンをクリックして新規デッキにする
2. Loadボタン（フォルダアイコン）をクリック
3. dno=8（または保存したデッキ番号）を選択
4. ダイアログ内のLoadボタンをクリック

### 4. コンソールログを確認

以下のログが出力されることを確認：

```
[extractCiidByIndex] Section=main, Found XX cards with index-based ciid
[parseCardBase] Using index-based ciid: card=15239, index=0, ciid=2
```

「Using index-based ciid」のログで、ciid=2が正しく使用されていることを確認。

### 5. デッキ状態を確認

コンソールで以下を実行してデッキ状態を確認：

```javascript
const store = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]?.config?.globalProperties?.$pinia?.state?.value;
const deck = store?.deck;
console.log('Main deck cards (first 3):');
deck.deckInfo.main.slice(0, 3).forEach(c => {
  console.log(`  ${c.card.name}: cardId=${c.card.cardId}, ciid=${c.card.ciid}`);
});
```

出力例：
```
Main deck cards (first 3):
  青眼の白龍: cardId=15239, ciid=2
  ...
```

ciid=2が保持されていることを確認。

### 6. 視覚的確認

デッキ編集画面で、ロードしたカードの画像が正しいアートワーク（ciid=2）で表示されていることを確認。

## 期待される結果

- ✅ extractCiidByIndexがHTMLから正しくciidを抽出している
- ✅ parseCardBaseがインデックスベースのciidを優先的に使用している
- ✅ ロードしたデッキで、保存時のciidが保持されている
- ✅ カード画像が正しいアートワークで表示されている

## トラブルシューティング

### extractCiidByIndexのログが出ない

- ビルドとデプロイが正しく行われたか確認：
  ```bash
  npm run build && ./scripts/deploy.sh
  ```
- 拡張機能が再読み込みされたか確認（Chromiumを再起動）

### ciidが1のままになる

- HTMLに`#card_image_{index}_1`のパターンが存在するか確認：
  ```javascript
  // コンソールで実行
  const html = document.documentElement.innerHTML;
  const matches = html.match(/#card_image_\d+_1['"].*?cid=\d+(?:&(?:amp;)?ciid=\d+)?/g);
  console.log('Found', matches?.length, 'matches');
  console.log('First 3:', matches?.slice(0, 3));
  ```

### cgidエラーが出る

- ログインしているか確認
- デッキ一覧ページにアクセスしてcgidがセットされるか確認

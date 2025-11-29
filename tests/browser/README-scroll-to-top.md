# scroll-to-top機能テスト

## 概要

デッキ編集ページの各タブ（search, related, products）でscroll-to-topボタンの動作を確認するテストです。

## 実行方法

```bash
node tests/browser/test-scroll-to-top.js
```

## 前提条件

- Chromiumブラウザがリモートデバッグモードで起動していること
- `.chrome_playwright_ws`ファイルにWebSocket URLが記載されていること

起動方法:
```bash
./scripts/debug/setup/start-chrome.sh
```

## テスト内容

### 1. search tabでのscroll-to-top

- カード検索を実行
- `.card-list-results`要素にスクロール
- scroll-to-topボタンをクリック
- スクロール位置が0に戻ることを確認

**既知の制限:**
- 検索結果が少ない場合、スクロール可能な状態にならないためテストがスキップされる
- 手動テストでの確認を推奨

### 2. related tabでのscroll-to-top

- カードを選択してCard tabに移動
- Related tabに切り替え
- `.card-tab-content`要素にスクロール
- scroll-to-topボタンをクリック
- スクロール位置が0に戻ることを確認

**検証結果:** ✅ 正常動作

### 3. products tabでのscroll-to-top

- Products tabに切り替え
- パック情報を展開
- `.card-tab-content`要素にスクロール
- scroll-to-topボタンをクリック
- スクロール位置が0に戻ることを確認

**検証結果:** ✅ 正常動作（パックが存在する場合）

## テスト結果の見方

- ✅: テスト成功
- ❌: テスト失敗
- ⚠️: スキップ（スクロール可能でない、要素が見つからないなど）

## 手動テスト推奨

search tabのテストが自動化の制約でスキップされる場合があるため、以下の手動テストを推奨します：

1. デッキ編集ページ（`https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit`）を開く
2. Search tabで「効果」などの検索キーワードを入力して検索
3. 多数の検索結果が表示されたら下にスクロール
4. scroll-to-topボタン（上矢印アイコン）をクリック
5. スクロール位置が一番上に戻ることを確認

## トラブルシューティング

### 検索結果が0件になる

- ページのロード時間が不足している可能性があります
- `wait`の時間を増やしてみてください
- 手動で検索が機能することを確認してください

### スクロール可能にならない

- ブラウザウィンドウのサイズが大きすぎる可能性があります
- リサイズするか、より多くの検索結果が得られるキーワードを使用してください

### パックの展開ボタンが見つからない

- カードによってはパック情報がない場合があります
- 別のカードで試してください

# API ドキュメント

このディレクトリには、YGO Deck Helper 拡張機能の主要なAPIのドキュメントが含まれています。

## 概要

### パーサーAPI
- [card-search.md](./card-search.md) - カード検索とパース関連API
- [deck-detail-parser.md](./deck-detail-parser.md) - デッキ詳細ページのパース関連API

### セッション管理API
- [session.md](./session.md) - セッション管理（cgid取得など）

### デッキレシピ画像API
- [deck-recipe-image.md](./deck-recipe-image.md) - デッキレシピ画像作成・ダウンロード

## DOM階層の重要性

すべてのパーサーAPIは、正確なDOM階層を検証してからパースを実行します。

### デッキ表示ページ
```
#main980 > #article_body > #deck_detailtext > #detailtext_main > .t_body > .t_row
```

### 検索結果ページ
```
#main980 > #article_body > #card_list > .t_row
```

間違ったページを受け取った場合、適切なエラーメッセージを投げます。

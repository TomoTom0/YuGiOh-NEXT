# 遊戯王NEXT - 使い方

**遊戯王NEXT** (遊戯王 Neuron EXTension) は、遊戯王カードデータベースのデッキ管理を支援するChrome拡張です。

## 対象サイト

- **遊戯王カードデータベース**: https://www.db.yugioh-card.com/

## 主な機能

![デッキ編集機能の概要](./images/store-promo-01-easy-moving.png)

PC版の遊戯王Neuronでも、カード検索・追加・詳細確認が快適にできます。

## 機能一覧

本拡張機能は、以下のページで利用できます。

### 1. デッキ表示ページ

**URL**: `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&...`

既存のデッキ表示ページで利用できる機能です。

- **カードシャッフル**: デッキのカード順序をランダムに並べ替え
- **デッキ画像作成**: デッキレシピ画像を生成してダウンロード

詳細は [deck-show.md](./deck-show.md) を参照してください。

### 2. 独自デッキ編集画面

**URL**: `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit`

本拡張機能が提供する独自のデッキ編集画面です。

- **デッキ編集**: カードの追加・削除、並び替え
- **カード検索**: 高度な検索・フィルター機能
- **カード詳細表示**: Info/Related/Products/QAタブ
- **ソート機能**: 7種類のソートオプション
- **カテゴリ・タグ**: カードの自動分類

関連ドキュメント:
- [基本操作](./custom-deck-edit.md)
- [検索・フィルター](./search-filter.md)
- [ソート機能](./sort.md)
- [カテゴリ・タグ](./category-tag.md)
- [カード詳細](./card-detail.md)
- [デッキメタデータ](./deck-metadata.md)
- [インポート・エクスポート](./import-export.md)

### 3. オプションページ

拡張機能の設定を変更できます。

- 各機能のON/OFF切り替え
- デッキ編集のデフォルト設定
- アニメーション設定
- 言語設定

詳細は [options.md](./options.md) を参照してください。

言語設定については [language.md](./language.md) を参照してください。

## バージョン情報

現在のバージョン: 0.4.0

- v0.4.0: 検索・フィルター強化、ソート拡張、カテゴリ・タグ機能
- v0.3.1: カードリンク機能とコード品質改善
- v0.3.0: デッキ編集機能と多言語対応基盤
- v0.2.0: デッキ画像作成機能、シャッフル・ソート機能
- v0.1.0: 初期リリース

詳細な変更履歴は [CHANGELOG.md](../../CHANGELOG.md) を参照してください。

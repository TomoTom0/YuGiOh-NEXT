# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-11-13

### Added

#### デッキ編集機能
- **デッキ編集ページ** (`#/ytomo/edit`)
  - DNO入力によるデッキの読み込み
  - カード検索機能（名前、属性、種族、レベル、攻撃力、守備力で検索）
  - カード詳細表示（Info/Related/Products/QAタブ）
  - リスト/グリッド表示の切り替え
  - カードソート機能（公式順、レベル順、攻撃力順、守備力順）
  - レスポンシブデザイン（モバイル対応）
  - カード枚数制限（同一カードは3枚まで）

#### 多言語対応基盤
- 日本語・英語の自動検出機能
- 言語ごとのカード情報取得
- 属性・種族・モンスタータイプの多言語マッピング

#### オプションページ
- デッキ編集機能の詳細設定
  - 機能のON/OFF切り替え
  - デフォルト表示モード（リスト/グリッド）
  - デフォルトソート順
  - アニメーション有効化/無効化
  - 言語設定（自動/日本語/英語）

#### UI/UX改善
- テーマカラー統一（青緑→赤紫グラデーション）
- リンクマーカー表示の改善（直角二等辺三角形、正しい向き）
- カード詳細タブのアニメーション（フェードイン）
- Q&A・収録パック展開機能
- 自動スクロール調整機能

#### テスト
- ユニットテスト: 47 tests（language-detector, mapping-manager, card-animation等）
- 結合テスト: 34 tests（パーサー、API等）
- コンポーネントテスト: 54 tests（CardList, DeckCard, DeckSection等）

#### ドキュメント
- ユーザー向けドキュメント
  - `docs/usage/deck-edit.md`: デッキ編集機能の使い方
  - `README.md`: v0.3.0新機能の説明
- 開発者向けドキュメント
  - `docs/dev/architecture.md`: アーキテクチャ概要
  - `docs/dev/i18n.md`: 多言語対応の実装詳細
  - `docs/api/card-search.md`: カード検索APIの仕様

### Changed
- Card型の`imageId`を`ciid`に統一
- `ciid`と`imgs`を必須プロパティに変更
- `buildCardImageUrl`を非推奨化、`getCardImageUrl`に統一

### Fixed
- リンクマーカーのビット位置マッピング修正
- デッキエリアの下部余白追加（検索エリアで隠れない対策）
- CardListコンポーネントのスタイル統一
- テストファイルの`__dirname`問題修正（vitest対応）

### Known Issues
- Search areaのカードボックスは可変サイズではなく4行省略表示（一時対応）
  - 将来的にはRelated tabと同様に可変サイズにする予定

---

## [0.2.0] - 2025-11-09

### Added
- デッキレシピ画像作成機能
  - Canvas描画による画像生成
  - QRコード生成（公開デッキ用）
  - カラーバリエーション（赤/青）
- シャッフル・ソート・固定機能
  - デッキのカード順序をランダム化
  - 元の順序に戻すソート機能
  - 特定カードの固定機能
- オプションページ
  - 機能のON/OFF切り替え
  - 機能説明と使い方の表示

### Changed
- CardType型を英語識別子に統一

---

## [0.1.0] - 2025-11-07

### Added
- 基本的なカード検索API
- デッキ詳細パーサー
- カードFAQパーサー
- Chrome拡張機能の基本構造

---

[0.3.0]: https://github.com/TomoTom0/ygo-neuron-helper/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/TomoTom0/ygo-neuron-helper/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/TomoTom0/ygo-neuron-helper/releases/tag/v0.1.0

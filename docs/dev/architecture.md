# アーキテクチャ設計

## 概要

YGO Deck Helper は Chrome拡張機能として、遊戯王公式カードデータベース(Neuron)のデッキ管理ページを拡張します。

## 全体構成

```
┌─────────────────────────────────────┐
│   Chrome Extension (Manifest V3)   │
├─────────────────────────────────────┤
│                                     │
│  Content Scripts                    │
│  ├─ deck-edit.ts (デッキ編集UI)    │
│  ├─ deck-recipe (画像作成)         │
│  └─ shuffle (シャッフル機能)       │
│                                     │
│  Background Service Worker          │
│  └─ background.ts                   │
│                                     │
│  API Layer                          │
│  ├─ card-search.ts                  │
│  ├─ deck-detail-parser.ts           │
│  └─ session.ts                      │
│                                     │
│  Utilities                          │
│  ├─ language-detector.ts (言語検出)│
│  ├─ mapping-manager.ts (多言語対応)│
│  └─ card-animation.ts (アニメ)     │
│                                     │
└─────────────────────────────────────┘
```

## モジュール構成

### Content Scripts

#### 1. deck-edit.ts
デッキ編集UIのメインコントローラー

**主な機能:**
- デッキ編集ページへのUI注入
- ドラッグ&ドロップ処理
- カード追加/削除/移動
- 公式並び順へのソート
- アニメーション制御

**依存モジュール:**
- `components/` - Vue コンポーネント
- `api/deck-detail-parser.ts` - デッキデータ取得
- `utils/card-animation.ts` - カードアニメーション
- `utils/language-detector.ts` - 言語検出
- `utils/mapping-manager.ts` - 多言語マッピング

#### 2. deck-recipe/
デッキレシピ画像作成機能

**モジュール構成:**
- `index.ts` - エントリーポイント
- `addImageButton.ts` - ボタン追加
- `imageDialog.ts` - ダイアログUI
- `generateImage.ts` - 画像生成ロジック

#### 3. shuffle/
シャッフル機能

**モジュール構成:**
- `index.ts` - エントリーポイント
- `addShuffleButtons.ts` - ボタン追加
- `shuffleDeck.ts` - シャッフル処理
- `sortDeck.ts` - ソート処理
- `flipAndShuffle.ts` - 裏返し機能

### API Layer

#### card-search.ts
カード検索結果のパース

**機能:**
- カード検索結果HTMLのパース
- カード基本情報の抽出
- 多言語対応 (日本語/英語)

**戻り値:**
```typescript
interface Card {
  cid: number;
  ciid: number;
  name: string;
  imgs: string;
  imageUrl: string;
  cardType: CardType;
  // ...
}
```

#### deck-detail-parser.ts
デッキ詳細ページのパース

**機能:**
- デッキ詳細HTMLのパース
- メイン/エクストラ/サイドデッキの分離
- カード情報の抽出
- 多言語対応 (日本語/英語)

**戻り値:**
```typescript
interface DeckDetail {
  deckName: string;
  mainDeck: Card[];
  extraDeck: Card[];
  sideDeck: Card[];
}
```

### Utilities

#### language-detector.ts
ページ言語の自動検出

**検出方法（優先順）:**
1. `#nowlanguage` 要素の `data-lang` 属性
2. `<meta property="og:url">` の `request_locale` パラメータ
3. URLクエリパラメータ `request_locale`
4. デフォルト値 (`ja`)

#### mapping-manager.ts
多言語マッピング管理

**機能:**
- 属性・種族・タイプの多言語マッピング
- 日本語 ⇔ 英語変換
- フォールバック処理

**マッピング例:**
```typescript
{
  attribute: {
    ja: { '光': 'LIGHT', '闇': 'DARK', ... },
    en: { 'LIGHT': 'LIGHT', 'DARK': 'DARK', ... }
  }
}
```

#### card-animation.ts
カードの移動アニメーション

**機能:**
- カード位置の記録
- FLIP アニメーションによる移動
- UUID ベースの追跡

## データフロー

### デッキ編集機能

```
1. ページロード
   ↓
2. 言語検出 (language-detector)
   ↓
3. マッピング読み込み (mapping-manager)
   ↓
4. デッキデータ取得 (deck-detail-parser)
   ↓
5. UI構築 (Vue コンポーネント)
   ↓
6. ユーザー操作
   ├─ ドラッグ&ドロップ → カード移動 → アニメーション
   ├─ ボタンクリック → カード追加/削除
   └─ ソートボタン → 公式並び順へソート
```

### 多言語対応

```
1. 言語検出
   ├─ #nowlanguage[data-lang]
   ├─ <meta og:url> request_locale
   └─ URL パラメータ
   ↓
2. マッピング選択
   ├─ ja → 日本語マッピング
   └─ en → 英語マッピング
   ↓
3. パース処理
   ├─ テキストベース判定 (属性・種族など)
   └─ 画像ベース判定 (アイコン)
   ↓
4. 統一データ構造
   └─ 内部的に正規化された Card オブジェクト
```

## コンポーネント設計

### Vue コンポーネント階層

```
DeckEditLayout.vue (メインレイアウト)
├─ DeckMetadata.vue (デッキ情報・設定)
│  ├─ LoadDialog.vue (デッキ読み込み)
│  ├─ SaveDialog.vue (デッキ保存)
│  └─ OptionsDialog.vue (設定)
├─ DeckSection.vue (メイン/エクストラ/サイド)
│  ├─ SearchInputBar.vue (検索バー)
│  └─ CardList.vue
│     └─ DeckCard.vue (個別カード)
├─ RightArea.vue (右側パネル)
│  ├─ SearchInputBar.vue (検索バー)
│  ├─ SearchFilterDialog.vue (フィルター)
│  ├─ CardList.vue (検索結果)
│  └─ CardInfo.vue (カード詳細)
└─ TagDialog.vue (タグ・カテゴリ)
```

### 責務分離

- **DeckEditLayout**: 全体レイアウト管理、コンポーネント間の調整
- **DeckMetadata**: デッキ名・設定の表示と編集
- **DeckSection**: デッキセクション全体の管理、ドロップゾーン処理
- **CardList**: カードリストの表示、リスト/グリッド切り替え、ソート
- **DeckCard**: 個別カードの表示、ドラッグ開始、ボタンイベント
- **RightArea**: 検索・カード詳細表示エリア
- **SearchInputBar**: 検索入力の共通コンポーネント（v0.4.0で追加）
- **SearchFilterDialog**: 検索フィルター条件設定（v0.4.0で追加）
- **CardInfo**: カード詳細情報の表示
- **OptionsDialog**: 表示設定・機能設定
- **TagDialog**: カテゴリ・タグ自動分類表示

### v0.4.0 で追加されたコンポーネント

#### SearchInputBar.vue
検索入力バーの共通コンポーネント。DeckSectionとRightAreaで再利用。

**Props:**
- `modelValue`: 検索文字列
- `placeholder`: プレースホルダーテキスト
- `showFilterButton`: フィルターボタン表示

**Events:**
- `update:modelValue`: 入力値変更
- `filter-click`: フィルターボタンクリック

#### SearchFilterDialog.vue
検索フィルター条件を設定するダイアログ。

**フィルター条件:**
- カードタイプ（モンスター/魔法/罠）
- 属性
- 種族
- レベル/ランク/リンク
- モンスタータイプ

**Props:**
- `show`: 表示状態
- `filters`: 現在のフィルター条件

**Events:**
- `update:filters`: フィルター条件変更
- `close`: ダイアログ閉じる

#### OptionsDialog.vue
表示設定と機能設定を管理するダイアログ。

**設定項目:**
- 表示モード（リスト/グリッド）
- デフォルトソート順
- アニメーション有効/無効
- 検索バーの位置

## ビルド・デプロイ

### ビルドプロセス

```bash
npm run build
```

**処理内容:**
1. TypeScript コンパイル (`tsc`)
2. Webpack バンドル
3. `dist/` ディレクトリへ出力

### デプロイ

```bash
./scripts/deploy.sh
```

**処理内容:**
1. ビルド実行
2. `manifest.json` コピー
3. アイコン・HTML ファイルコピー
4. Chrome拡張機能として読み込み可能な状態

## テスト戦略

### 単体テスト (Unit Tests)

**対象:**
- `language-detector.ts`
- `mapping-manager.ts`
- `deck-edit.ts` (ロジック部分)
- `card-animation.ts`

**実行:**
```bash
npm run test:unit
```

### 結合テスト (Integration Tests)

**対象:**
- `card-search.ts` (日本語/英語)
- `deck-detail-parser.ts` (日本語/英語)

**実行:**
```bash
npm run test:integration
```

### コンポーネントテスト (Component Tests)

**対象:**
- `DeckCard.vue`
- `CardList.vue`
- `DeckSection.vue`

**実行:**
```bash
npm run test:components
```

## セキュリティ

### CSP (Content Security Policy)

Manifest V3 の CSP 制約に準拠:
- インラインスクリプト禁止
- `eval()` 使用禁止
- 外部リソース読み込み制限

### データ保護

- セッション情報はメモリ上でのみ保持
- ユーザーデータは公式サイトに保存 (拡張機能側では永続化しない)

## パフォーマンス最適化

### カードアニメーション

- FLIP アニメーション技法を使用
- GPU アクセラレーション (`transform` プロパティ使用)
- 不要な再描画を最小化

### 画像読み込み

- 遅延読み込み (`loading="lazy"`)
- 画像キャッシュ活用

## 今後の拡張性

### Phase 4 以降

- オプションページ (設定UI)
- 独自デッキ管理画面
- 簡易一人回し機能
- より多くの言語サポート

## 参考資料

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Vue.js 3](https://v3.vuejs.org/)
- [FLIP Animation](https://aerotwist.com/blog/flip-your-animations/)

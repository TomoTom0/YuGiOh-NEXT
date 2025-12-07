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
│  Cache Layer (v0.4.1追加)          │
│  ├─ UnifiedCacheDB                  │
│  │  ├─ TableA (カード基本情報)    │
│  │  ├─ TableB2 (テキスト分離)     │
│  │  └─ TableC (カード詳細)        │
│  └─ stale-while-revalidate戦略    │
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

### Cache Layer (v0.4.1追加)

#### UnifiedCacheDB
カード情報を効率的にキャッシュするためのデータベースシステム。

**テーブル構成:**
- **TableA**: カード基本情報（cid, name, ruby, imgs等）
- **TableB2**: カードテキスト・ペンデュラムテキスト（text, pendText分離）
- **TableC**: カード詳細情報（関連カード、Q&A、収録パック等）

**キャッシュ戦略:**
- **stale-while-revalidate**: キャッシュを即座に返しつつバックグラウンドで更新
- **自動クリーンアップ**: 古いキャッシュの定期削除

**利点:**
- 高速なカード情報取得
- ネットワーク負荷の軽減
- オフライン対応の基盤
- データ構造の統一（TempCardDBとの統合）

詳細: [キャッシュシステム設計](./cache-system.md)

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
v0.6.0のリファクタリングで大幅に機能強化され、2239行から1318行へ削減（41%削減）。

**主要機能:**

1. **検索入力**
   - リアルタイム検索クエリ入力
   - Enter キーで検索実行
   - プレースホルダー自動生成（検索モードに応じて変化）

2. **スラッシュコマンド**
   - `/c:` - カテゴリフィルター追加
   - `/r:` - 種族フィルター追加
   - `/a:` - 属性フィルター追加
   - `/l:` - レベル/ランク/リンクフィルター追加
   - `/mydeck:` - マイデッキ検索
   - `/help` - ヘルプ表示

3. **検索モード**
   - **title**: カード名検索（デフォルト）
   - **text**: カードテキスト検索
   - **all**: カード名+テキスト検索
   - **category**: カテゴリ検索
   - **race**: 種族検索
   - **attribute**: 属性検索
   - **level**: レベル/ランク/リンク検索
   - **mydeck**: マイデッキ検索

4. **フィルターチップ管理**
   - 選択されたフィルター条件をチップ表示
   - チップのクリックで個別削除
   - 一括クリア機能
   - フィルターアイコンのプレビュー

5. **候補リスト**
   - コマンド候補表示（スラッシュコマンド入力時）
   - フィルター候補表示（カテゴリ/種族/属性/レベル）
   - マイデッキ候補表示（/mydeck: 入力時）
   - キーボードナビゲーション（↑↓ Enter Esc）

6. **キーボードショートカット**
   - `Ctrl+F` / `Cmd+F`: 検索バーにフォーカス
   - `Esc`: 候補リストを閉じる
   - `↑` / `↓`: 候補リストのナビゲーション
   - `Enter`: 候補選択または検索実行

**Composables 構成:**
- `useSlashCommands`: スラッシュコマンド解析とバリデーション
- `useSearchFilters`: フィルター管理とチップ操作
- `useKeyboardNavigation`: キーボードナビゲーション管理
- `useMydeckOperations`: マイデッキ操作管理
- `useFilterInput`: フィルター入力とチップ管理
- `useSearchExecution`: 検索実行ロジック

**子コンポーネント:**
- `SearchFilterChips.vue`: フィルターチップの表示と管理
- `SearchModeSelector.vue`: 検索モードの切り替え
- `SuggestionList.vue`: 候補リストの表示とキーボードナビゲーション

**Props:**
- `compact` (boolean): コンパクトモード（デフォルト: false）
- `isBottomPosition` (boolean): 検索バーが下部にあるか（デフォルト: false）

**リファクタリング履歴:**
- Phase 1-6 (v0.6.0): God Component脱却（2239行 → 1318行、41%削減）
- スタイル移譲: 各コンポーネントのスタイルカプセル化（-349行）

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

#### CardList.vue
カードリスト表示コンポーネント。検索結果やデッキ内カードのリスト表示を行う。
v0.4.0でソート機能を集約し、label-utils.tsからラベル変換関数をインポート（コード重複削減）。

**主要機能:**

1. **表示モード切り替え**
   - **リスト表示**: カード詳細情報を含む縦一覧表示
   - **グリッド表示**: カード画像のみの格子状表示

2. **ソート機能**

   **ソートキー（sortBase）:**
   - **release**: 発売日順（デフォルト）
   - **name**: カード名順（五十音順）
   - **atk**: ATK順（モンスターのみ）
   - **def**: DEF順（モンスターのみ）
   - **level**: レベル/ランク/リンク順
   - **attribute**: 属性順
   - **race**: 種族順
   - **code**: コード順（マイデッキ検索時のみ表示）

   **ソート方向（sortDirection）:**
   - **asc**: 昇順（発売日: 古い→新しい、名前: あ→ん、ATK: 低い→高い）
   - **desc**: 降順（発売日: 新しい→古い、名前: ん→あ、ATK: 高い→低い）

   **ソートロジック:**
   ```
   1. カードタイプ優先（Monster > Spell > Trap）
   2. 選択されたソートキーで比較
   3. 同値の場合はカード名で比較（五十音順）
   ```

   **ソート順序の保存:**
   - `settings.appSettings.sortOrder` にソートキーを保存
   - `settings.appSettings.sortDirection` にソート方向を保存
   - ページリロード時も設定を維持

3. **カード詳細表示**
   - カードクリックで詳細情報を表示
   - ATK/DEF、レベル/ランク/リンク、属性、種族、モンスタータイプ等
   - リスト表示時はカードテキストも表示

4. **その他の機能**
   - カード数表示
   - スクロールトップボタン
   - 縮小ボタン（検索結果エリアを閉じる）

**Props:**
- `cards` (Array): 表示するカード配列（必須）
- `loading` (Boolean): ローディング状態
- `viewMode` (String): 表示モード（'list' または 'grid'）
- `showCollapseButton` (Boolean): 縮小ボタン表示
- `showCodeSort` (Boolean): コード順ソート表示（マイデッキ検索時）

**Events:**
- `collapse`: 縮小ボタンクリック時
- `scroll-to-top`: スクロールトップボタンクリック時
- `update:viewMode`: 表示モード変更時

**関連ユーティリティ:**
- `src/utils/label-utils.ts`: ラベル変換関数（getAttributeLabel, getRaceLabel 等）

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

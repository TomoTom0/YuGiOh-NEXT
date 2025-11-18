# データモデル仕様

YGO Deck Helperで使用される主要なデータ型とその関係性について説明します。

## 目次

1. [デッキ関連](#デッキ関連)
2. [カード関連](#カード関連)
3. [設定関連](#設定関連)
4. [メタデータ関連](#メタデータ関連)
5. [インポート/エクスポート関連](#インポートエクスポート関連)

## デッキ関連

### DeckInfo

**型定義**: [`src/types/deck.ts`](../../src/types/deck.ts)

デッキ全体の情報を表す最上位の型。

```typescript
interface DeckInfo {
  mainDeck: DeckCard[];    // メインデッキ
  extraDeck: DeckCard[];   // エクストラデッキ
  sideDeck: DeckCard[];    // サイドデッキ
}
```

**用途**:
- デッキ編集画面での状態管理
- エクスポート機能での入力
- インポート機能での出力

### DeckCard

**型定義**: [`src/types/deck.ts`](../../src/types/deck.ts)

デッキ内のカード情報（カード＋枚数）。

```typescript
interface DeckCard {
  card: CardInfo;    // カード詳細情報
  quantity: number;  // 枚数（1-3）
}
```

**枚数制限**:
- 通常: 1-3枚
- 禁止カード: 0枚
- 制限カード: 1枚
- 準制限カード: 2枚

### SimpleDeckInfo

**型定義**: [`src/utils/png-metadata.ts`](../../src/utils/png-metadata.ts)（内部型）

PNG埋め込み用の簡略デッキ情報。

```typescript
interface SimpleDeckInfo {
  main: SimpleDeckCard[];
  extra: SimpleDeckCard[];
  side: SimpleDeckCard[];
}

interface SimpleDeckCard {
  cid: string;       // カードID
  ciid: string;      // イラストID
  enc: string;       // 画像ハッシュ
  quantity: number;  // 枚数
}
```

**特徴**:
- カード名などの冗長な情報を省略
- サイズ最小化（PNG埋め込み用）
- JSON形式で保存

**変換**:
```typescript
// DeckInfo → SimpleDeckInfo
function simplifyDeckInfo(deckInfo: DeckInfo): SimpleDeckInfo;

// SimpleDeckInfo → DeckInfo（カード検索APIが必要）
async function expandSimpleDeckInfo(simple: SimpleDeckInfo): Promise<DeckInfo>;
```

## カード関連

### CardInfo

**型定義**: [`src/types/card.ts`](../../src/types/card.ts)

カードの詳細情報。

```typescript
interface CardInfo {
  cardId: string;              // カードID（cid）
  ciid: string;                // カードイラストID
  name: string;                // カード名
  cardType: CardType;          // カード種類
  attribute?: string;          // 属性（モンスターのみ）
  level?: number;              // レベル/ランク
  atk?: string;                // 攻撃力（"?" or 数値）
  def?: string;                // 守備力（"?" or 数値）
  types?: string[];            // 種族・タイプ
  effectText: string;          // 効果テキスト
  imgs: CardImage[];           // イラスト情報
  products?: CardProduct[];    // 収録パック情報
  relatedCards?: RelatedCard[];// 関連カード
}
```

**CardType**:
```typescript
type CardType = 
  | 'monster'   // モンスターカード
  | 'spell'     // 魔法カード
  | 'trap';     // 罠カード
```

### CardImage

**型定義**: [`src/types/card.ts`](../../src/types/card.ts)

カードイラスト情報。

```typescript
interface CardImage {
  ciid: string;      // イラストID
  imgHash: string;   // 画像ハッシュ（例: "12950_1_1_1"）
}
```

**画像URL生成**:
```typescript
const url = `https://www.db.yugioh-card.com/yugiohdb/card_image/${imgHash}.jpg`;
```

### CardType判定

カードタイプの判定方法:

```typescript
// モンスターの種類
const isExtraDeckMonster = (types: string[]) =>
  types.some(t => 
    t === 'fusion' || 
    t === 'synchro' || 
    t === 'xyz' || 
    t === 'link'
  );

// ペンデュラムモンスター
const isPendulum = (types: string[]) =>
  types.includes('pendulum');
```

## 設定関連

### AppSettings

**型定義**: [`src/types/settings.ts`](../../src/types/settings.ts)

アプリケーション全体の設定。

```typescript
interface AppSettings {
  // カードサイズ
  deckEditCardSize: CardSize;    // デッキ編集画面
  infoCardSize: CardSize;        // カード詳細
  gridCardSize: CardSize;        // グリッド表示
  listCardSize: CardSize;        // リスト表示
  
  // 外観
  theme: Theme;                  // テーマ
  language: Language;            // 言語
  
  // レイアウト
  middleDecksLayout: MiddleDecksLayout;  // Extra/Sideの配置
  
  // 機能
  enableBanlistCheck: boolean;   // 禁止制限リストチェック
}
```

**CardSize**:
```typescript
type CardSize = 'small' | 'medium' | 'large' | 'xlarge';

const CARD_SIZE_MAP = {
  small: 59,
  medium: 88,
  large: 117,
  xlarge: 146
};
```

**Theme**:
```typescript
type Theme = 'light' | 'dark' | 'system';
```

**Language**:
```typescript
type Language = 
  | 'auto'   // 自動検出
  | 'ja'     // 日本語
  | 'en'     // 英語
  | 'ko'     // 韓国語
  | 'ae'     // アラビア語
  | 'cn'     // 中国語
  | 'de'     // ドイツ語
  | 'fr'     // フランス語
  | 'it'     // イタリア語
  | 'es'     // スペイン語
  | 'pt';    // ポルトガル語
```

### FeatureSettings

**型定義**: [`src/types/settings.ts`](../../src/types/settings.ts)

機能のON/OFF設定。

```typescript
interface FeatureSettings {
  [featureId: string]: boolean;
}
```

**デフォルト**:
```typescript
const DEFAULT_FEATURE_SETTINGS = {
  'shuffle-sort': true,   // シャッフル・ソート機能
  'deck-image': true,     // デッキ画像作成機能
  'deck-edit': true       // デッキ編集機能（Vue Edit）
};
```

### DeckEditUIState

デッキ編集画面のUI状態。

```typescript
interface DeckEditUIState {
  viewMode: 'list' | 'grid';           // 表示モード
  sortOrder: SortOrder;                // ソート順
  activeTab: 'search' | 'card' | 'metadata';  // アクティブタブ
  cardTab: 'info' | 'qa' | 'related' | 'products';  // カードタブ
  showDetail: boolean;                 // 詳細表示
}
```

**SortOrder**:
```typescript
type SortOrder = 
  | 'default'   // デッキ内順序
  | 'name'      // カード名
  | 'type'      // カード種類
  | 'level'     // レベル
  | 'atk'       // 攻撃力
  | 'def';      // 守備力
```

## メタデータ関連

### DeckMetadata

デッキに付与するメタデータ。

```typescript
interface DeckMetadata {
  name: string;               // デッキ名
  isPublic: boolean;          // 公開/非公開
  deckType?: string;          // デッキタイプ（例: "テーマデッキ"）
  deckStyle?: string;         // デッキスタイル（例: "コントロール"）
  categories: string[];       // カテゴリ（例: ["ビートダウン", "コンボ"]）
  tags: string[];             // タグ（例: ["初心者向け", "低予算"]）
  description: string;        // デッキ説明（最大1000文字）
}
```

**デッキタイプ例**:
- テーマデッキ
- ファンデッキ
- トーナメントデッキ
- メタデッキ
- 練習用デッキ

**デッキスタイル例**:
- アグロ（Aggro）
- コントロール（Control）
- ミッドレンジ（Midrange）
- コンボ（Combo）
- ビートダウン（Beatdown）
- バーン（Burn）
- ロック（Lock）

**カテゴリ例**:
- ビートダウン
- コンボ
- ロックバーン
- パーミッション
- ワンキル（OTK）
- エクストラ依存
- 除去主体
- 特殊召喚封じ

## インポート/エクスポート関連

### ImportResult

インポート処理の結果。

```typescript
interface ImportResult {
  success: boolean;       // 成功/失敗
  error?: string;         // エラーメッセージ
  deckInfo?: DeckInfo;    // デッキ情報（成功時）
  warnings?: string[];    // 警告メッセージ
}
```

**使用例**:
```typescript
const result = importFromCSV(csvContent);
if (result.success) {
  // デッキ情報をストアに反映
  deckStore.loadDeckInfo(result.deckInfo!);
  
  if (result.warnings && result.warnings.length > 0) {
    // 警告を表示
    showWarnings(result.warnings);
  }
} else {
  // エラーを表示
  showError(result.error!);
}
```

### ExportOptions

エクスポート時のオプション。

```typescript
interface ExportOptions {
  includeSide?: boolean;  // サイドデッキを含めるか（デフォルト: true）
}
```

### ExportRow

エクスポート用の行データ（内部使用）。

```typescript
interface ExportRow {
  section: 'main' | 'extra' | 'side';  // セクション
  name: string;                        // カード名
  cid: string;                         // カードID
  ciid: string;                        // イラストID
  enc: string;                         // 画像ハッシュ
  quantity: number;                    // 枚数
}
```

**CSV出力フォーマット**:
```csv
section,name,cid,ciid,enc,quantity
main,灰流うらら,12950,1,12950_1_1_1,2
```

**TXT出力フォーマット**:
```
=== Main Deck (3 cards) ===
2x 灰流うらら (12950:1:12950_1_1_1)
1x 増殖するG (4861:2:4861_2_1_1)
```

## 型の関係性

### データフロー図

```
┌─────────────┐
│ 公式サイト  │
└──────┬──────┘
       │ スクレイピング
       ↓
┌─────────────┐
│  CardInfo   │
└──────┬──────┘
       │ デッキ構築
       ↓
┌─────────────┐     ┌──────────────┐
│  DeckCard   │────→│  DeckInfo    │
└─────────────┘     └──────┬───────┘
                            │
                ┌───────────┼───────────┐
                ↓           ↓           ↓
         ┌──────────┐ ┌─────────┐ ┌─────────┐
         │ Export   │ │ PNG埋込 │ │ ストア  │
         │ CSV/TXT  │ │SimpleDeck│ │ 管理    │
         └──────────┘ └─────────┘ └─────────┘
```

### 型変換パス

```
CardInfo (from API)
    ↓
DeckCard = CardInfo + quantity
    ↓
DeckInfo = { main, extra, side }
    ↓
┌────────────┬────────────┐
↓            ↓            ↓
ExportRow    SimpleDeck   Store
(CSV/TXT)    (PNG)        (state)
```

## ストレージ

### chrome.storage.local

```typescript
interface StorageSettings {
  appSettings?: AppSettings;
  featureSettings?: FeatureSettings;
}
```

**保存**:
```typescript
chrome.storage.local.set({
  appSettings,
  featureSettings
});
```

**読み込み**:
```typescript
chrome.storage.local.get(['appSettings', 'featureSettings'], (result) => {
  const appSettings = { ...DEFAULT_APP_SETTINGS, ...result.appSettings };
  const featureSettings = { ...DEFAULT_FEATURE_SETTINGS, ...result.featureSettings };
});
```

### URLパラメータ

UI状態はURLパラメータにも保存されます。

```
#/edit?mode=grid&sort=name&tab=search&detail=1
```

**マッピング**:
- `mode` → viewMode
- `sort` → sortOrder
- `tab` → activeTab
- `ctab` → cardTab
- `detail` → showDetail
- `size` → cardSize
- `theme` → theme
- `lang` → language
- `dno` → デッキ番号

## バリデーション

### カード枚数制限

```typescript
function validateCardQuantity(
  cid: string,
  currentQuantity: number,
  maxQuantity: number = 3
): { valid: boolean; error?: string } {
  if (currentQuantity > maxQuantity) {
    return {
      valid: false,
      error: `このカードは${maxQuantity}枚までしか入れられません`
    };
  }
  return { valid: true };
}
```

### デッキ枚数制限

```typescript
const DECK_LIMITS = {
  main: { min: 40, max: 60 },
  extra: { min: 0, max: 15 },
  side: { min: 0, max: 15 }
};

function validateDeckSize(deckInfo: DeckInfo): boolean {
  const mainCount = deckInfo.mainDeck.reduce((sum, c) => sum + c.quantity, 0);
  const extraCount = deckInfo.extraDeck.reduce((sum, c) => sum + c.quantity, 0);
  const sideCount = deckInfo.sideDeck.reduce((sum, c) => sum + c.quantity, 0);
  
  return (
    mainCount >= DECK_LIMITS.main.min &&
    mainCount <= DECK_LIMITS.main.max &&
    extraCount <= DECK_LIMITS.extra.max &&
    sideCount <= DECK_LIMITS.side.max
  );
}
```

## 参考資料

### 型定義ファイル
- `src/types/deck.ts` - デッキ関連の型
- `src/types/card.ts` - カード関連の型
- `src/types/settings.ts` - 設定関連の型

### 実装ファイル
- `src/stores/deck-edit.ts` - デッキ編集ストア
- `src/stores/settings.ts` - 設定ストア
- `src/utils/deck-import.ts` - インポート処理
- `src/utils/deck-export.ts` - エクスポート処理
- `src/utils/png-metadata.ts` - PNG埋め込み処理

### ドキュメント
- [PNG形式仕様](./png-format-spec.md)
- [インポート・エクスポート機能](../usage/import-export.md)
- [デッキメタデータ機能](../usage/deck-metadata.md)

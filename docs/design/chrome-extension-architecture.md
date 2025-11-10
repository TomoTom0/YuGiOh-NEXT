# 遊戯王デッキヘルパー Chrome拡張 アーキテクチャ設計

## 概要

このドキュメントは、遊戯王公式データベースのデッキ管理を支援するChrome拡張の設計仕様を定義します。
すべての機能は、調査により判明した公式サイトのDOM構造とAPI仕様に基づいて実装されます。

## 調査結果サマリー

Playwrightによる調査で判明した重要な技術的知見：

### DOM構造の特徴
1. **カードタイプ別フィールドマッピング**（最重要）
   - すべてのカードタイプが同じID属性を使用するが、**name属性が異なる**
   - モンスター: `id="card_id_1"`, `name="monsterCardId"`
   - 魔法: `id="card_id_1"`, `name="spellCardId"`
   - 罠: `id="card_id_1"`, `name="trapCardId"`
   - **正しいセレクタ**: `querySelector('#card_id_1[name="spellCardId"]')`

2. **フォーム構造**
   - デッキ編集フォーム: `#form_regist`
   - カード入力スロット: 65個（各カードタイプ）
   - CSRFトークン: `input[name="ytkn"]`（ページ遷移ごとに変更）

3. **カード検索結果**
   - カードアイテム: `.t_row.c_normal`
   - カードタイプ判定: `.box_card_attribute span:last-child`
   - カードID取得: `input.cid`

### API仕様
- 保存API: `POST /yugiohdb/member_deck.action?cgid={cgid}&request_locale=ja`
- データ形式: `'ope=3&' + $('#form_regist').serialize()`
- レスポンス: `{"result": true}` または `{"error": ["..."]}`

### セッション情報
- cgid: 32文字hex（ユーザー識別子）
- ytkn: 64文字hex（CSRFトークン、ページ遷移で変更）

参照ドキュメント：
- `docs/research/api-investigation-results.md`
- `docs/research/card-information-structure.md`

## Chrome拡張の構成

```
extension/
├── manifest.json              # 拡張機能の設定（Manifest V3）
├── src/
│   ├── types/                 # 型定義
│   │   ├── card.ts           # カード関連の型
│   │   ├── deck.ts           # デッキ関連の型
│   │   └── message.ts        # メッセージング用の型
│   ├── content/               # Content Scripts
│   │   ├── main.ts           # メインのContent Script
│   │   ├── deck/             # デッキ操作
│   │   │   ├── save.ts       # デッキ保存
│   │   │   ├── load.ts       # デッキ読み込み
│   │   │   └── utils.ts      # デッキ操作ユーティリティ
│   │   ├── card/             # カード操作
│   │   │   ├── search.ts     # カード検索
│   │   │   └── extract.ts    # カード情報抽出
│   │   └── dom/              # DOM操作
│   │       ├── selectors.ts  # セレクタ定数
│   │       ├── fields.ts     # フィールド操作
│   │       └── observers.ts  # DOM変更監視
│   ├── background/            # Background Service Worker
│   │   ├── main.ts           # メインのBackground Script
│   │   ├── storage.ts        # データ永続化
│   │   └── api.ts            # API通信管理
│   ├── popup/                 # Popup UI
│   │   ├── index.html        # Popup HTML
│   │   ├── index.ts          # Popup ロジック
│   │   └── styles.css        # Popup スタイル
│   ├── utils/                 # 共通ユーティリティ
│   │   ├── validators.ts     # バリデーション関数
│   │   ├── formatters.ts     # フォーマット関数
│   │   └── errors.ts         # エラー定義
│   └── constants/             # 定数
│       └── config.ts         # 設定定数
├── public/                    # 静的ファイル
│   ├── icons/                # アイコン画像
│   └── _locales/             # 多言語対応
└── dist/                      # ビルド出力（gitignore）
```

## データモデル設計

### 型定義

調査結果から判明した実際のデータ構造に基づいて型を定義：

```typescript
// src/types/card.ts

/**
 * カードタイプ（調査結果より）
 */
export type CardType = 'モンスター' | '魔法' | '罠';

/**
 * カード基本情報（検索結果から取得可能）
 */
export interface CardInfo {
  /** カード名 */
  name: string;
  /** カードID (cid) */
  cardId: string;
  /** カード画像ID (ciid) - デフォルト '1' */
  imageId: string;
  /** カードタイプ */
  cardType: CardType;
}

/**
 * デッキ内カード情報
 */
export interface DeckCard extends CardInfo {
  /** 枚数 */
  quantity: number;
}

/**
 * フィールド名マッピング（調査で発見した重要な構造）
 */
export interface CardTypeFields {
  /** カード名フィールド name */
  nameField: string;
  /** 枚数フィールド name */
  numField: string;
  /** カードIDフィールドの ID prefix */
  cardIdPrefix: string;
  /** カードIDフィールドの name属性 */
  cardIdName: 'monsterCardId' | 'spellCardId' | 'trapCardId';
  /** 画像IDフィールド ID prefix */
  imgsPrefix: string;
}
```

```typescript
// src/types/deck.ts

import { DeckCard } from './card';

/**
 * デッキ情報
 */
export interface DeckInfo {
  /** デッキ番号 (1-100) */
  dno: string;
  /** デッキ名 */
  name: string;
  /** デッキ説明 */
  description?: string;
  /** カードリスト */
  cards: DeckCard[];
}

/**
 * デッキ保存結果
 */
export interface DeckSaveResult {
  /** 成功フラグ */
  success: boolean;
  /** クリアしたフィールド数 */
  clearedCount?: number;
  /** 追加したカード数 */
  addedCount?: number;
  /** エラー情報 */
  errors?: Array<{
    cardName: string;
    message: string;
  }>;
}
```

```typescript
// src/types/message.ts

/**
 * Content ScriptとBackground間のメッセージ型
 */
export type MessageType =
  | 'SAVE_DECK'
  | 'LOAD_DECK'
  | 'GET_SESSION_INFO'
  | 'SEARCH_CARDS'
  | 'EXTRACT_DECK';

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Content Scripts 設計

Content Scriptsは遊戯王DBのページに注入され、DOMを直接操作します。

### DOM セレクタ定数

調査結果に基づいたセレクタ定数：

```typescript
// src/content/dom/selectors.ts

/**
 * DOM セレクタ定数
 * 調査により判明したセレクタを定義
 */
export const SELECTORS = {
  /** デッキ編集フォーム */
  DECK_EDIT: {
    FORM: '#form_regist',
    DECK_NAME: 'input[name="dnm"]',
    DECK_DESCRIPTION: 'textarea[name="deckdetail"]',
    YTKN: 'input[name="ytkn"]',
    SAVE_BUTTON: '#btn_regist',
  },

  /** カード検索 */
  CARD_SEARCH: {
    SEARCH_FORM: '#form_search',
    CARD_ROW: '.t_row.c_normal',
    CARD_NAME: '.card_name',
    CARD_ID_INPUT: 'input.cid',
    // 重要：カードタイプはこのセレクタで取得
    CARD_TYPE: '.box_card_attribute span:last-child',
    IMAGE: 'img[alt]',
  },

  /** デッキリスト */
  DECK_LIST: {
    DECK_ROW: '.t_row',
    DECK_NAME: '.deck_name',
    DECK_LINK: '.link_value',
    CARD_COUNT: '.card_count',
  },
} as const;
```

### フィールド名マッピング

調査で発見した重要な知見を関数化：

```typescript
// src/content/dom/fields.ts

import { CardType, CardTypeFields } from '../../types/card';

/**
 * カードタイプに応じたフィールド名を取得
 *
 * 重要な発見：
 * - すべてのカードタイプが同じID属性を使用
 * - name属性が異なる点に注意
 * - セレクタ使用時は必ずname属性も指定すること
 */
export function getFieldNames(cardType: CardType): CardTypeFields {
  switch (cardType) {
    case 'モンスター':
      return {
        nameField: 'monm',
        numField: 'monum',
        cardIdPrefix: 'card_id',
        cardIdName: 'monsterCardId',
        imgsPrefix: 'imgs_mo',
      };
    case '魔法':
      return {
        nameField: 'spnm',
        numField: 'spnum',
        cardIdPrefix: 'card_id',
        cardIdName: 'spellCardId',
        imgsPrefix: 'imgs_sp',
      };
    case '罠':
      return {
        nameField: 'trnm',
        numField: 'trnum',
        cardIdPrefix: 'card_id',
        cardIdName: 'trapCardId',
        imgsPrefix: 'imgs_tr',
      };
  }
}

/**
 * 正しいカードIDフィールドを取得
 *
 * ⚠️ 重要：IDだけでは不十分
 * querySelector('#card_id_1') → 最初のモンスターカードフィールドを返す（誤り）
 * querySelector('#card_id_1[name="spellCardId"]') → 魔法カードフィールドを返す（正しい）
 */
export function getCardIdField(index: number, cardType: CardType): HTMLInputElement | null {
  const fields = getFieldNames(cardType);
  return document.querySelector<HTMLInputElement>(
    `#${fields.cardIdPrefix}_${index}[name="${fields.cardIdName}"]`
  );
}

/**
 * 空のカードスロットを探す
 */
export function findEmptySlot(cardType: CardType): { input: HTMLInputElement; index: string } | null {
  const fields = getFieldNames(cardType);
  const nameInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name="${fields.nameField}"]`)
  );

  const emptyInput = nameInputs.find(inp => !inp.value || inp.value.trim() === '');
  if (!emptyInput) return null;

  const index = emptyInput.id.replace(`${fields.nameField}_`, '');
  return { input: emptyInput, index };
}
```

### デッキ保存操作

調査結果に基づくデッキ保存機能：

```typescript
// src/content/deck/save.ts

import { DeckInfo, DeckSaveResult } from '../../types/deck';
import { getFieldNames, findEmptySlot, getCardIdField } from '../dom/fields';
import { SELECTORS } from '../dom/selectors';

/**
 * デッキを保存
 * 調査により判明した保存手順を実装
 */
export async function saveDeck(deckInfo: DeckInfo): Promise<DeckSaveResult> {
  try {
    // 1. フォームをクリア
    const clearedCount = clearAllFields();

    // 2. カードタイプごとにグループ化
    const cardsByType = groupCardsByType(deckInfo.cards);

    // 3. カードを設定
    const { added, errors } = setCards(cardsByType);

    // 4. デッキヘッダー情報を設定
    setDeckInfo(deckInfo);

    // 5. 保存APIを実行
    const saveResponse = await executeave();

    return {
      success: saveResponse.result === true,
      clearedCount,
      addedCount: added.length,
      errors: errors.map(e => ({ cardName: e.cardName, message: e.error })),
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ cardName: 'システム', message: String(error) }],
    };
  }
}

/**
 * すべてのフィールドをクリア
 */
function clearAllFields(): number {
  let count = 0;
  const fieldTypes = ['monm', 'monum', 'spnm', 'spnum', 'trnm', 'trnum'];

  for (const fieldType of fieldTypes) {
    const inputs = document.querySelectorAll<HTMLInputElement>(`input[name="${fieldType}"]`);
    inputs.forEach(input => {
      if (input.value) {
        input.value = '';
        count++;
      }
    });
  }

  return count;
}

/**
 * カードをカードタイプごとにグループ化
 */
function groupCardsByType(cards: DeckCard[]) {
  const groups: Record<CardType, DeckCard[]> = {
    モンスター: [],
    魔法: [],
    罠: [],
  };

  cards.forEach(card => {
    groups[card.cardType].push(card);
  });

  return groups;
}

/**
 * カードを設定
 */
function setCards(cardsByType: Record<CardType, DeckCard[]>) {
  const added: Array<{ cardName: string; cardType: CardType; index: string }> = [];
  const errors: Array<{ cardName: string; error: string }> = [];

  for (const [cardType, cards] of Object.entries(cardsByType) as [CardType, DeckCard[]][]) {
    for (const card of cards) {
      const slot = findEmptySlot(cardType);
      if (!slot) {
        errors.push({ cardName: card.name, error: '空のスロットがありません' });
        continue;
      }

      const { input, index } = slot;
      const fields = getFieldNames(cardType);

      // カード名を設定
      input.value = card.name;

      // 枚数を設定
      const numInput = document.querySelector<HTMLInputElement>(`#${fields.numField}_${index}`);
      if (numInput) numInput.value = String(card.quantity);

      // カードIDを設定（重要：name属性も指定）
      const cardIdInput = getCardIdField(Number(index), cardType);
      if (cardIdInput) cardIdInput.value = card.cardId;

      // 画像IDを設定
      const imgsInput = document.querySelector<HTMLInputElement>(`#${fields.imgsPrefix}_${index}`);
      if (imgsInput) imgsInput.value = `${card.cardId}_${card.imageId}_1_1`;

      added.push({ cardName: card.name, cardType, index });
    }
  }

  return { added, errors };
}

/**
 * デッキヘッダー情報を設定
 */
function setDeckInfo(deckInfo: DeckInfo): void {
  const nameInput = document.querySelector<HTMLInputElement>(SELECTORS.DECK_EDIT.DECK_NAME);
  if (nameInput) nameInput.value = deckInfo.name || '';

  const descTextarea = document.querySelector<HTMLTextAreaElement>(SELECTORS.DECK_EDIT.DECK_DESCRIPTION);
  if (descTextarea) descTextarea.value = deckInfo.description || '';
}

/**
 * 保存APIを実行
 * 調査により判明したAPI仕様に基づく
 */
async function executeSave(): Promise<{ result: boolean; error?: string[] }> {
  return new Promise((resolve) => {
    // cgidを取得（URLパラメータから）
    const urlParams = new URLSearchParams(window.location.search);
    const cgid = urlParams.get('cgid');

    if (!cgid) {
      resolve({ result: false, error: ['cgidが見つかりません'] });
      return;
    }

    // jQueryを使用（公式サイトで使用されているため）
    (window as any).$.ajax({
      type: 'post',
      url: `/yugiohdb/member_deck.action?cgid=${cgid}&request_locale=ja`,
      data: `ope=3&${(window as any).$('#form_regist').serialize()}`,
      dataType: 'json',
      success: (data: any) => resolve({ result: data.result, error: data.error }),
      error: () => resolve({ result: false, error: ['ネットワークエラー'] }),
    });
  });
}
```

### カード検索・抽出

```typescript
// src/content/card/extract.ts

import { CardInfo, CardType } from '../../types/card';
import { SELECTORS } from '../dom/selectors';

/**
 * 検索結果ページからカード情報を抽出
 * 調査により判明した抽出方法を実装
 */
export function extractCardsFromSearchResult(): CardInfo[] {
  const cards: CardInfo[] = [];
  const cardRows = document.querySelectorAll(SELECTORS.CARD_SEARCH.CARD_ROW);

  cardRows.forEach(row => {
    const nameElement = row.querySelector(SELECTORS.CARD_SEARCH.CARD_NAME);
    const cidInput = row.querySelector<HTMLInputElement>(SELECTORS.CARD_SEARCH.CARD_ID_INPUT);
    // 重要：カードタイプはこのセレクタで取得
    const cardTypeSpan = row.querySelector(SELECTORS.CARD_SEARCH.CARD_TYPE);
    const img = row.querySelector<HTMLImageElement>(SELECTORS.CARD_SEARCH.IMAGE);

    if (!nameElement || !cidInput || !cardTypeSpan) return;

    const cardType = cardTypeSpan.textContent?.trim() as CardType;
    if (!isValidCardType(cardType)) return;

    // 画像IDを抽出（ciid）
    let imageId = '1';
    if (img?.src) {
      const ciidMatch = img.src.match(/ciid=(\d+)/);
      if (ciidMatch) imageId = ciidMatch[1];
    }

    cards.push({
      name: nameElement.textContent?.trim() || '',
      cardId: cidInput.value,
      imageId,
      cardType,
    });
  });

  return cards;
}

/**
 * カードタイプの妥当性チェック
 */
function isValidCardType(cardType: string): cardType is CardType {
  return cardType === 'モンスター' || cardType === '魔法' || cardType === '罠';
}
```

## Background Service Worker 設計

```typescript
// src/background/main.ts

import { Message, MessageResponse } from '../types/message';

/**
 * メッセージハンドラー
 */
chrome.runtime.onMessage.addListener((
  message: Message,
  sender,
  sendResponse: (response: MessageResponse) => void
) => {
  handleMessage(message)
    .then(data => sendResponse({ success: true, data }))
    .catch(error => sendResponse({ success: false, error: error.message }));

  return true; // 非同期レスポンスを示す
});

/**
 * メッセージを処理
 */
async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'SAVE_DECK':
      return handleSaveDeck(message.payload);
    case 'LOAD_DECK':
      return handleLoadDeck(message.payload);
    case 'GET_SESSION_INFO':
      return handleGetSessionInfo();
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
```

## Popup UI 設計

```typescript
// src/popup/index.ts

import { DeckInfo } from '../types/deck';

/**
 * Popup初期化
 */
document.addEventListener('DOMContentLoaded', async () => {
  // デッキリストを取得
  const decks = await getDecks();
  renderDeckList(decks);

  // イベントリスナーを設定
  setupEventListeners();
});

/**
 * デッキリストをレンダリング
 */
function renderDeckList(decks: DeckInfo[]): void {
  // UI実装
}

/**
 * Content Scriptにメッセージを送信
 */
async function sendMessageToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) throw new Error('No active tab');

  const response = await chrome.tabs.sendMessage<Message, MessageResponse<T>>(tab.id, message);
  if (!response.success) throw new Error(response.error);

  return response.data!;
}
```

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "遊戯王デッキヘルパー",
  "version": "1.0.0",
  "description": "遊戯王カードデータベースのデッキ管理を支援",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.db.yugioh-card.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.db.yugioh-card.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## ビルド設定

```json
// tsconfig.json（拡張用）
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./extension/src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["chrome"]
  },
  "include": ["extension/src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 開発ワークフロー

### 1. 型定義の実装
- `src/types/` 配下の型を実装

### 2. DOM操作ユーティリティの実装
- `src/content/dom/` の実装（調査結果を活用）

### 3. コア機能の実装
- デッキ保存: `src/content/deck/save.ts`
- カード抽出: `src/content/card/extract.ts`

### 4. UI実装
- Popup UIの実装

### 5. テストとデバッグ
- `chrome://extensions/` でロード
- DevToolsでデバッグ

## 調査結果の活用方法

Playwrightでの調査結果（`tmp/`のスクリプト）は：

1. **実装時の参照**
   - DOM操作のロジックを確認
   - セレクタの正確性を確認
   - API呼び出しの詳細を確認

2. **テストケースの作成**
   - 調査スクリプトをE2Eテストに変換
   - 期待される動作を検証

3. **ドキュメント化**
   - `docs/research/` に記載された情報を設計に反映

## まとめ

この設計は、Playwrightによる調査結果を基に：

1. **調査で判明したDOM構造**を正確に反映
2. **カードタイプ別フィールドマッピング**の重要な発見を活用
3. **Chrome拡張の特性**に最適化した設計
4. **型安全性と保守性**を確保

次のステップ：
1. 型定義の実装
2. DOM操作ユーティリティの実装
3. デッキ保存機能の実装（MVP）

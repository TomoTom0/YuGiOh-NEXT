# 遊戯王デッキヘルパー 実装設計書

最終更新: 2025-11-04

## 1. プロジェクト構造

### ディレクトリ構成

```
ygo-deck-helper/
├── extension/                  # Chrome拡張のソースコード
│   ├── src/
│   │   ├── types/             # 型定義
│   │   │   ├── card.ts
│   │   │   ├── deck.ts
│   │   │   ├── session.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── api/               # API層
│   │   │   ├── deck-operations.ts    # デッキ操作API
│   │   │   ├── card-search.ts        # カード検索API
│   │   │   ├── session.ts            # セッション情報取得
│   │   │   └── parsers.ts            # HTML パーサー
│   │   │
│   │   ├── content/           # Content Scripts
│   │   │   ├── main.ts
│   │   │   ├── deck/
│   │   │   │   ├── operations.ts    # デッキ操作の実装
│   │   │   │   └── fields.ts        # フィールド操作
│   │   │   ├── card/
│   │   │   │   ├── detector.ts      # カードタイプ判定
│   │   │   │   └── extractor.ts     # カード情報抽出
│   │   │   └── ui/
│   │   │       └── injector.ts      # UI注入
│   │   │
│   │   ├── background/        # Background Service Worker
│   │   │   ├── main.ts
│   │   │   └── storage.ts
│   │   │
│   │   ├── popup/             # Popup UI
│   │   │   ├── index.html
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── DeckList.ts
│   │   │   │   ├── DeckEditor.ts
│   │   │   │   └── CardSearch.ts
│   │   │   └── styles/
│   │   │       └── main.css
│   │   │
│   │   ├── utils/             # 共通ユーティリティ
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   └── constants.ts
│   │   │
│   │   └── manifest.json
│   │
│   └── public/                # 静的アセット
│       ├── icons/
│       └── _locales/
│
├── docs/                      # ドキュメント
│   ├── research/             # 調査結果
│   └── design/               # 設計ドキュメント
│
├── scripts/                  # ビルドスクリプト
│   └── build.sh
│
├── tmp/                      # 調査用スクリプト（gitignore）
│   └── wip/                  # 実装設計作業用
│
├── package.json
├── tsconfig.json
├── webpack.config.js
└── .gitignore
```

## 2. データモデル設計

### 2.1 型定義

```typescript
// extension/src/types/card.ts

/**
 * カードタイプ
 */
export type CardType = 'モンスター' | '魔法' | '罠';

/**
 * カード基本情報
 */
export interface CardInfo {
  /** カード名 */
  name: string;
  /** カードID (cid) */
  cardId: string;
  /** カードタイプ */
  cardType: CardType;
  /** 画像ID（オプション、デフォルト '1'） */
  imageId?: string;
}

/**
 * デッキ内カード
 */
export interface DeckCard extends CardInfo {
  /** 枚数 */
  quantity: number;
}

/**
 * カードタイプ別フィールド名
 *
 * 重要な発見（調査結果より）:
 * - すべてのカードタイプが同じID属性を使用
 * - name属性が異なる
 */
export interface CardTypeFields {
  nameField: string;
  numField: string;
  cardIdPrefix: string;
  cardIdName: 'monsterCardId' | 'spellCardId' | 'trapCardId';
  imgsPrefix: string;
}
```

```typescript
// extension/src/types/deck.ts

import { DeckCard } from './card';

/**
 * デッキ情報
 */
export interface DeckInfo {
  /** デッキ番号 */
  dno: number;
  /** デッキ名 */
  name: string;
  /** メインデッキ */
  mainDeck: DeckCard[];
  /** エクストラデッキ */
  extraDeck: DeckCard[];
  /** サイドデッキ */
  sideDeck: DeckCard[];
  /** 公開/非公開 */
  isPublic?: boolean;
  /** デッキタイプ */
  deckType?: number;
  /** コメント */
  comment?: string;
}

/**
 * 操作結果
 */
export interface OperationResult {
  success: boolean;
  error?: string[];
  /** 新しいデッキ番号（新規作成・複製時） */
  newDno?: number;
}
```

```typescript
// extension/src/types/session.ts

/**
 * セッション情報
 */
export interface SessionInfo {
  /** ユーザー識別子（32文字hex） */
  cgid: string;
  /** CSRFトークン（64文字hex、ページ遷移ごとに変わる） */
  ytkn: string;
}
```

## 3. API層設計

### 3.1 デッキ操作API

```typescript
// extension/src/api/deck-operations.ts

import { DeckInfo, OperationResult } from '../types/deck';
import { SessionInfo } from '../types/session';
import { getYtkn, getCgid } from './session';
import { buildDeckFormData } from './parsers';

/**
 * デッキ操作APIクラス
 */
export class DeckOperationsAPI {
  /**
   * デッキ新規作成（ope=6）
   */
  static async createNew(cgid: string): Promise<string> {
    const url = `/yugiohdb/member_deck.action?ope=6&cgid=${cgid}&request_locale=ja`;
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });
    return response.url;
  }

  /**
   * デッキ保存（ope=3）
   *
   * 重要:
   * - ytknは保存前に毎回取得する必要がある
   * - カードタイプ別にフィールド名が異なる
   */
  static async save(
    cgid: string,
    dno: number,
    deckData: DeckInfo,
    ytkn: string
  ): Promise<OperationResult> {
    const url = `/yugiohdb/member_deck.action?cgid=${cgid}&request_locale=ja`;

    // フォームデータを構築
    const formData = buildDeckFormData(dno, deckData, ytkn);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();
    return {
      success: result.result === true,
      error: result.error
    };
  }

  /**
   * デッキ複製（ope=8）
   */
  static async duplicate(cgid: string, dno: number): Promise<string> {
    const url = `/yugiohdb/member_deck.action?ope=8&cgid=${cgid}&dno=${dno}&request_locale=ja`;
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });
    return response.url;
  }

  /**
   * デッキ削除（ope=7）
   */
  static async delete(cgid: string, dno: number, ytkn: string): Promise<string> {
    const url = `/yugiohdb/member_deck.action?ope=7&wname=MemberDeck&ytkn=${ytkn}&cgid=${cgid}&dno=${dno}&request_locale=ja`;
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });
    return response.url;
  }

  /**
   * デッキ一覧取得（ope=4）
   */
  static async list(cgid: string): Promise<DeckInfo[]> {
    const url = `/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=${cgid}&request_locale=ja`;
    const response = await fetch(url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // デッキ一覧をパース（実装は parsers.ts）
    return parseDeckList(doc);
  }

  /**
   * デッキ詳細取得（ope=1）
   */
  static async getDetail(cgid: string, dno: number): Promise<DeckInfo> {
    const url = `/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}&request_locale=ja`;
    const response = await fetch(url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // デッキ詳細をパース（実装は parsers.ts）
    return parseDeckDetail(doc, dno);
  }
}
```

### 3.2 カード検索API

```typescript
// extension/src/api/card-search.ts

import { CardInfo } from '../types/card';
import { parseSearchResults } from './parsers';

/**
 * カード検索APIクラス
 */
export class CardSearchAPI {
  /**
   * カード検索
   *
   * @param keyword - 検索キーワード
   * @param ctype - カードタイプフィルター
   *   - "" (空文字列): すべてのカード
   *   - "1": モンスターカード
   *   - "2": 魔法カード
   *   - "3": 罠カード
   */
  static async search(
    keyword: string,
    ctype: '' | '1' | '2' | '3' = ''
  ): Promise<CardInfo[]> {
    const params = new URLSearchParams({
      ope: '1',
      sess: '1',
      keyword: keyword,
      ctype: ctype,
      request_locale: 'ja'
    });

    const url = `/yugiohdb/card_search.action?${params.toString()}`;
    const response = await fetch(url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return parseSearchResults(doc);
  }
}
```

### 3.3 セッション情報取得

```typescript
// extension/src/api/session.ts

import { SessionInfo } from '../types/session';

/**
 * セッション情報APIクラス
 */
export class SessionAPI {
  /**
   * cgidをクッキーから取得
   */
  static getCgid(): string | null {
    const cgid = document.cookie
      .split('; ')
      .find(row => row.startsWith('cgid='))
      ?.split('=')[1];
    return cgid || null;
  }

  /**
   * ytknをデッキ編集ページから取得
   *
   * 重要: ytknはページ遷移ごとに変わるため、
   * 保存・削除の前に毎回取得する必要がある
   */
  static async getYtkn(cgid: string, dno: number): Promise<string> {
    const url = `/yugiohdb/member_deck.action?ope=2&cgid=${cgid}&dno=${dno}&request_locale=ja`;
    const response = await fetch(url);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const ytknInput = doc.querySelector<HTMLInputElement>('input[name="ytkn"]');
    if (!ytknInput) {
      throw new Error('ytkn not found');
    }

    return ytknInput.value;
  }

  /**
   * セッション情報を取得
   */
  static async getSessionInfo(dno: number): Promise<SessionInfo> {
    const cgid = this.getCgid();
    if (!cgid) {
      throw new Error('cgid not found in cookies');
    }

    const ytkn = await this.getYtkn(cgid, dno);

    return { cgid, ytkn };
  }
}
```

### 3.4 HTMLパーサー

```typescript
// extension/src/api/parsers.ts

import { DeckInfo, DeckCard } from '../types/deck';
import { CardInfo, CardType } from '../types/card';
import { detectCardType } from '../content/card/detector';

/**
 * デッキ詳細HTMLをパース
 */
export function parseDeckDetail(doc: Document, dno: number): DeckInfo {
  const deckName = doc.querySelector<HTMLInputElement>('input[name="dnm"]')?.value || '';
  const comment = doc.querySelector<HTMLTextAreaElement>('textarea[name="biko"]')?.value || '';

  const mainDeck: DeckCard[] = [];
  const extraDeck: DeckCard[] = [];
  const sideDeck: DeckCard[] = [];

  // カードリストをパース（実装詳細は省略）
  // ...

  return {
    dno,
    name: deckName,
    mainDeck,
    extraDeck,
    sideDeck,
    comment
  };
}

/**
 * カード検索結果HTMLをパース
 */
export function parseSearchResults(doc: Document): CardInfo[] {
  const cards: CardInfo[] = [];
  const cardRows = doc.querySelectorAll('.t_row.c_normal');

  cardRows.forEach(row => {
    const nameElement = row.querySelector('.card_name');
    const cidInput = row.querySelector<HTMLInputElement>('input.cid');

    if (!nameElement || !cidInput) return;

    // DOM属性ベースのカードタイプ判定（最新の調査結果）
    const cardType = detectCardType(row);
    if (!cardType) return;

    cards.push({
      name: nameElement.textContent?.trim() || '',
      cardId: cidInput.value,
      cardType,
      imageId: '1'
    });
  });

  return cards;
}

/**
 * デッキ保存用のフォームデータを構築
 */
export function buildDeckFormData(
  dno: number,
  deckData: DeckInfo,
  ytkn: string
): URLSearchParams {
  const formData = new URLSearchParams();
  formData.append('ope', '3');
  formData.append('dno', dno.toString());
  formData.append('ytkn', ytkn);
  formData.append('dnm', deckData.name);

  if (deckData.comment) {
    formData.append('biko', deckData.comment);
  }

  // カードデータの追加
  const allCards = [
    ...deckData.mainDeck,
    ...deckData.extraDeck,
    ...deckData.sideDeck
  ];

  allCards.forEach(card => {
    const fieldNames = getFieldNamesForCardType(card.cardType);
    formData.append(fieldNames.name, card.name);
    formData.append(fieldNames.num, card.quantity.toString());
    if (card.cardId) {
      formData.append(fieldNames.cardId, card.cardId);
    }
  });

  return formData;
}

/**
 * カードタイプに応じたフィールド名を取得
 */
function getFieldNamesForCardType(cardType: CardType) {
  switch (cardType) {
    case 'モンスター':
      return { name: 'monm', num: 'monum', cardId: 'monsterCardId' };
    case '魔法':
      return { name: 'spnm', num: 'spnum', cardId: 'spellCardId' };
    case '罠':
      return { name: 'trnm', num: 'trnum', cardId: 'trapCardId' };
  }
}
```

## 4. カードタイプ判定の実装

### 4.1 DOM属性ベースの判定（推奨）

```typescript
// extension/src/content/card/detector.ts

import { CardType } from '../../types/card';

/**
 * DOM属性ベースのカードタイプ判定
 *
 * 調査結果（2025-11-04）:
 * - img要素のsrc属性を使用
 * - ロケール非依存
 * - 保守性が高い
 *
 * @param row - カード行要素
 * @returns カードタイプ
 */
export function detectCardType(row: Element): CardType | null {
  const img = row.querySelector<HTMLImageElement>('.box_card_attribute img');
  if (!img || !img.src) return null;

  const src = img.src;

  if (src.includes('attribute_icon_spell')) {
    return '魔法';
  } else if (src.includes('attribute_icon_trap')) {
    return '罠';
  } else if (src.includes('attribute_icon_')) {
    // light, dark, water, fire, earth, wind, divine
    return 'モンスター';
  }

  return null;
}

/**
 * テキストベースのカードタイプ判定（非推奨）
 *
 * 理由:
 * - ロケール依存（日本語以外で動作しない）
 * - テキスト変更に脆弱
 * - 保守性が低い
 *
 * この関数は互換性のためだけに残す
 */
export function detectCardTypeByText(row: Element): CardType | null {
  const span = row.querySelector('.box_card_attribute span:last-child');
  if (!span) return null;

  const text = span.textContent?.trim();

  if (text === '魔法') return '魔法';
  if (text === '罠') return '罠';
  // モンスターの場合は属性名（光属性、闇属性など）が返される
  return 'モンスター';
}
```

## 5. 状態管理とデータフロー

### 5.1 状態管理

Chrome拡張では以下の状態を管理：

1. **セッション状態**（Runtime）
   - cgid: クッキーから取得（変更なし）
   - ytkn: 操作前に毎回取得（キャッシュ不可）

2. **デッキデータ**（chrome.storage.local）
   - ローカルで編集中のデッキ
   - オフライン対応のため

3. **UI状態**（Popup/Content Script内）
   - 選択中のデッキ
   - 編集モード
   - 検索結果

### 5.2 データフロー

```
[公式サイト] ←→ [Content Script] ←→ [Background] ←→ [Popup]
     ↓                  ↓                    ↓
  DOM操作          API層 (fetch)     chrome.storage
  fetch            パーサー           メッセージング
```

#### フロー例: デッキ保存

```
1. Popup: ユーザーが「保存」クリック
2. Popup → Background: SAVE_DECK メッセージ送信
3. Background: chrome.storage.local にデッキデータを保存
4. Background → Content Script: デッキ保存要求
5. Content Script:
   a. SessionAPI.getYtkn() でytknを取得
   b. DeckOperationsAPI.save() でデッキ保存
6. Content Script → Background: 結果を返す
7. Background → Popup: 結果を返す
8. Popup: ユーザーに結果を表示
```

## 6. 実装優先度

### Phase 1: MVP（最小限の機能）

1. **セッション情報取得**
   - cgid取得
   - ytkn取得

2. **デッキ一覧表示**
   - デッキ一覧取得（fetch + DOMParser）
   - Popupでリスト表示

3. **デッキ詳細表示**
   - デッキ詳細取得
   - カード情報表示

### Phase 2: コア機能

4. **デッキ保存**
   - フォームデータ構築
   - API呼び出し

5. **カード検索**
   - カード検索API
   - カードタイプ判定（DOM属性ベース）

6. **デッキ編集**
   - カード追加/削除/枚数変更
   - ローカル編集

### Phase 3: 追加機能

7. **デッキ操作**
   - 新規作成
   - 複製
   - 削除

8. **オフライン対応**
   - chrome.storage.local活用
   - 編集内容の一時保存

## 7. テスト戦略

### 7.1 ユニットテスト

- パーサー関数
- カードタイプ判定関数
- フォームデータ構築関数

### 7.2 統合テスト

- API層のテスト（モックfetch）
- メッセージングのテスト

### 7.3 E2Eテスト

- 調査スクリプト（Playwright）をE2Eテストに変換
- 実際の公式サイトでの動作確認

## 8. 次のステップ

1. ✅ デッキ操作関数の仕様作成（完了）
2. ✅ 実装設計書の作成（本ドキュメント）
3. ⏳ プロジェクトのセットアップ
   - package.json
   - tsconfig.json
   - webpack.config.js
4. ⏳ 型定義の実装
5. ⏳ API層の実装
6. ⏳ Content Scriptsの実装
7. ⏳ Popup UIの実装

## 参考資料

- [調査結果まとめ](../research/api-investigation-results.md)
- [デッキ操作関数仕様](../../tmp/wip/chrome-extension-deck-operations.ts)
- [カード情報HTML構造](../research/card-information-structure.md)
- [Chrome拡張アーキテクチャ](./chrome-extension-architecture.md)

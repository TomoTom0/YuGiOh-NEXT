# LLM Deck Assistant - 設計ドキュメント

## 概要

自然言語でデッキ操作を行う機能。Gemini Nano（ローカル）または Z.ai API（ユーザー設定）を使用。

## アーキテクチャ

```
ユーザー入力（自然言語）
  ↓
LLM Chat Service
  ├─ Gemini Nano Adapter（ローカル）
  └─ Z.ai API Adapter（クラウド）
  ↓
LLM応答（ツール呼び出し or 質問返し or 結果報告）
  ↓
Tool Executor（カード名解決 → ツール実行）
  ↓
既存ストア（deck-edit, search, card-detail）経由で操作
  ↓
結果 → LLM に返却 → ユーザーに表示
```

### 既存ストアとの統合

- `Tool Executor` は既存の `useDeckEditStore` / `useSearchStore` / `useCardDetailStore` を直接呼び出す
- LLM操作も Undo/Redo 対応 — 既存のコマンドパターン（`deck-edit.ts`の履歴管理）がそのまま機能する
- `addCard` は単一追加のため、quantity > 1 の場合は Tool Executor 側でループ呼び出し

## カード名解決フロー

ユーザーの略称・部分一致からカードを特定する優先順位：

```
1. メインデッキ + エクストラデッキ（同列）→ name/ruby 部分一致
2. サイドデッキ → 同様
3. トラッシュ → 同様
4. 現在の検索結果 → 同様
5. searchCards API → 同様

各段階:
  1件ヒット → 対象確定
  複数件ヒット → 候補を提示してユーザーに確認
  0件 → 次の段階へ

最終0件 → 「該当するカードが見つかりません」で聞き返し
```

### 検索対象フィールド

- `card.name`（カード名）部分一致
- `card.ruby`（ふりがな）部分一致
- case-insensitive

### 解決結果の型

カード名解決で特定されたカードは、以降のツール呼び出しで `cardId` + `ciid` を保持する。
既存の `addCard` は `CardInfo` オブジェクトを要求するため、Tool Executor 側で `TempCacheDB` から完全な `CardInfo` を取得してからストアメソッドに渡す。

```typescript
interface CardResolution {
  cardId: string;
  ciid: string;
  name: string;
  isAmbiguous: boolean;
  alternatives?: Array<{ cardId: string; ciid: string; name: string }>;
}
```

## ツール定義（Function Calling形式）

### 1. searchCards

カードを検索する。LLMは自然言語から検索条件を抽出して呼び出す。

```json
{
  "name": "searchCards",
  "description": "カードを検索する。キーワード、カード種類、種族、属性、レベルなどで絞り込み可能。",
  "parameters": {
    "type": "object",
    "properties": {
      "keyword": {
        "type": "string",
        "description": "検索キーワード（カード名の一部など）"
      },
      "searchType": {
        "type": "string",
        "enum": ["name", "text"],
        "description": "name=カード名検索, text=効果テキスト検索"
      },
      "cardType": {
        "type": "string",
        "enum": ["monster", "spell", "trap"],
        "description": "カード種類で絞り込み"
      },
      "attributes": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["light", "dark", "water", "fire", "earth", "wind", "divine"]
        },
        "description": "属性で絞り込み（複数可）"
      },
      "races": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["dragon", "zombie", "fiend", "pyro", "seaserpent", "rock", "machine", "fish", "dinosaur", "insect", "beast", "beastwarrior", "plant", "aqua", "warrior", "windbeast", "fairy", "spellcaster", "thunder", "reptile", "psychic", "divine", "creatorgod", "wyrm", "cyberse", "illusion"]
        },
        "description": "種族で絞り込み（複数可）"
      },
      "monsterTypes": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["normal", "effect", "fusion", "ritual", "toon", "spirit", "union", "gemini", "tuner", "synchro", "xyz", "flip", "pendulum", "special", "link"]
        },
        "description": "モンスタータイプで絞り込み（複数可）"
      },
      "levelValue": {
        "type": "integer",
        "description": "レベル/ランク/リンク値"
      },
      "levelType": {
        "type": "string",
        "enum": ["level", "rank", "link"],
        "description": "レベル種別"
      },
      "atkMin": { "type": "integer", "description": "攻撃力の下限" },
      "atkMax": { "type": "integer", "description": "攻撃力の上限" },
      "defMin": { "type": "integer", "description": "守備力の下限" },
      "defMax": { "type": "integer", "description": "守備力の上限" }
    },
    "required": ["keyword"]
  }
}
```

**戻り値**: `Array<{ cardId: string, name: string, cardType: string, race?: string, attribute?: string, levelValue?: number, atk?: number, def?: number, text?: string }>`

### 2. getCardDetail

カードの詳細情報（効果テキスト全文、関連カード）を取得する。

```json
{
  "name": "getCardDetail",
  "description": "カードの詳細情報を取得する。効果テキスト全文、関連カード、収録情報など。",
  "parameters": {
    "type": "object",
    "properties": {
      "cardId": {
        "type": "string",
        "description": "カードID (cid)"
      }
    },
    "required": ["cardId"]
  }
}
```

**戻り値**: `{ cardId, name, cardType, text, pendulumText?, attribute?, race?, levelType?, levelValue?, atk?, def?, types?, isExtraDeck?, limitRegulation?, relatedCards: Array<{cardId, name}> }`

### 3. getDeckState

現在のデッキ状態を取得する。

```json
{
  "name": "getDeckState",
  "description": "現在のデッキ状態を取得する。メインデッキ、エクストラデッキ、サイドデッキ、トラッシュの全カードと枚数を返す。",
  "parameters": {}
}
```

**戻り値**:
```json
{
  "mainDeck": [{ "cardId": "...", "name": "...", "quantity": 3 }],
  "extraDeck": [{ "cardId": "...", "name": "...", "quantity": 1 }],
  "sideDeck": [{ "cardId": "...", "name": "...", "quantity": 2 }],
  "trash": [{ "cardId": "...", "name": "...", "quantity": 1 }],
  "mainCount": 40,
  "extraCount": 15,
  "sideCount": 15
}
```

### 4. addCardToDeck

カードをデッキに追加する。

```json
{
  "name": "addCardToDeck",
  "description": "カードをデッキに追加する。section未指定の場合、モンスターはisExtraDeckに基づいて自動判定。",
  "parameters": {
    "type": "object",
    "properties": {
      "cardId": {
        "type": "string",
        "description": "カードID (cid)"
      },
      "quantity": {
        "type": "integer",
        "description": "追加枚数（デフォルト1）",
        "default": 1
      },
      "section": {
        "type": "string",
        "enum": ["main", "extra", "side"],
        "description": "追加先セクション（未指定時は自動判定）"
      }
    },
    "required": ["cardId"]
  }
}
```

**戻り値**: `{ success: boolean, error?: string, cardName?: string, quantity?: number, section?: string }`

### 5. removeCardFromDeck

デッキからカードを削除する。

```json
{
  "name": "removeCardFromDeck",
  "description": "デッキからカードを削除する。",
  "parameters": {
    "type": "object",
    "properties": {
      "cardId": {
        "type": "string",
        "description": "カードID (cid)"
      },
      "quantity": {
        "type": "integer",
        "description": "削除枚数（デフォルト：そのカードの全枚数）"
      },
      "section": {
        "type": "string",
        "enum": ["main", "extra", "side", "trash"],
        "description": "削除元セクション"
      }
    },
    "required": ["cardId"]
  }
}
```

**戻り値**: `{ success: boolean, error?: string, cardName?: string }`

### 6. moveCard

デッキ内でカードを移動する。

```json
{
  "name": "moveCard",
  "description": "デッキ内でカードを移動する。",
  "parameters": {
    "type": "object",
    "properties": {
      "cardId": {
        "type": "string",
        "description": "カードID (cid)"
      },
      "from": {
        "type": "string",
        "enum": ["main", "extra", "side", "trash"],
        "description": "移動元セクション"
      },
      "to": {
        "type": "string",
        "enum": ["main", "extra", "side", "trash"],
        "description": "移動先セクション"
      }
    },
    "required": ["cardId", "from", "to"]
  }
}
```

**戻り値**: `{ success: boolean, error?: string, cardName?: string }`

### 7. getChatHistory

このセッション内で過去に実行したツールの呼び出し履歴と結果を取得する。ユーザーが過去の結果を参照した場合に使用。

```json
{
  "name": "getChatHistory",
  "description": "セッション内の過去のツール実行履歴を取得する。",
  "parameters": {}
}
```

**戻り値**: `Array<{ name: string, args: object, result: object }>`

### 8. resolveCardName

カード名をデッキ内で照合して特定する。

```json
{
  "name": "resolveCardName",
  "description": "カード名をデッキ内で照合して特定する。",
  "parameters": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "カード名（略称可）"
      }
    },
    "required": ["name"]
  }
}
```

**戻り値**: `{ cardId: string, ciid: string, name: string, isAmbiguous: boolean, alternatives?: Array<{cardId, ciid, name}> }`

## LLMへのコンテキスト（システムプロンプト）

Gemini Nano / Z.ai API 共通で送信する最小コンテキスト：

```
あなたは遊戯王デッキ構築アシスタントです。
ユーザーの自然言語による指示を解釈し、適切なツールを呼び出してください。

## ルール
- カード名は略称で指定されることがあります。ツール呼び出しの前にカード名の特定が必要な場合は
  searchCards を使用してください。
- 指示内容が不明瞭な場合は、ユーザーに確認してください。
- カード効果についての質問には getCardDetail で実際のテキストを取得して回答してください。
  自身の知識で推測しないでください。
- デッキ操作の実行結果はツールの戻り値で確認し、ユーザーに報告してください。

## 現在のデッキ状態
（getDeckStateの結果をここに挿入）

## 現在フォーカス中のカード
（選択中のカード情報を挿入、なければ「なし」）
```

## searchDeckCards の kind パラメータ

| kind | 検索対象 | 説明 |
|------|---------|------|
| `name` | カード名 | `card.name` の部分一致 |
| `race` | 種族 | 種族名の完全一致（モンスターのみ） |
| `attribute` | 属性 | 属性名の完全一致（モンスターのみ） |
| `type` | モンスタータイプ | タイプ名の完全一致（モンスターのみ） |
| `text` | 効果テキスト | `card.text` / `card.pendulumText` の部分一致 |
| `auto` | 全フィールド | 上記すべてを検索（省略時デフォルト） |

- 配列指定（例: `["name", "text"]`）で複数kindのOR検索が可能
- 検索結果に `text`（効果テキスト）が含まれる

## 会話履歴の引き継ぎ

- 各ターンのtool実行結果（生データ）を `ChatMessage.toolResultData` に保存
- 次回のLLM呼び出し時に会話履歴（user/assistant/tool）を引き継ぎ
- tool結果は `[ツール searchDeckCards OK] {"cards":[...]}` 形式でLLMに渡される
- LLMは自然な文脈でフォローアップ質問に対応可能

## 指示の分類

### 検索系
- 「〇〇を探して」→ searchCards
- 「このカードで特殊召喚できるカード」→ getCardDetail → searchCards(text)
- 「レベル4の戦士族」→ searchCards(races, levelValue)
- 「攻撃力3000以上のドラゴン」→ searchCards(races, atkMin)

### 追加系
- 「〇〇を3枚追加」→ resolveCardName → addCardToDeck
- 「このカードをデッキに」→ addCardToDeck（フォーカスカード使用）
- 「手札誘発を入れたい」→ searchCards → ユーザー確認 → addCardToDeck

### 削除・移動系
- 「〇〇を抜いて」→ resolveCardName → removeCardFromDeck
- 「サイドの〇〇をメインに」→ moveCard
- 「トラッシュの〇〇を戻して」→ moveCard

### 分析系
- 「デッキのバランスを教えて」→ getDeckState → 分析コメント
- 「制限カードは入ってる？」→ getDeckState → チェック

### 複合系（複数ツール呼び出し）
- 「このカードと相性の良いカードを追加」→ getCardDetail → searchCards → ユーザー確認 → addCardToDeck
- 「デッキを40枚にして」→ getDeckState → 削除候補提案 → removeCardFromDeck

## LLMエンジン差異

| 項目 | Gemini Nano | Z.ai API |
|------|-------------|----------|
| 呼び出し方法 | Chrome Built-in AI API | fetch (OpenAI互換) |
| 入力サイズ | ~4K tokens | ~128K tokens |
| 複雑な推論 | 2-3ステップ程度 | 多段階可 |
| コンテキスト | ツール定義 + デッキ状態のみ | より詳細なルール説明も可 |
| Function Calling | プロンプトで指示（JSON出力） | ネイティブサポート |

## ファイル構成案

```
src/
  services/
    llm/
      types.ts              # ツール定義、LLM応答の型
      llm-chat-service.ts   # LLM通信の統合サービス
      gemini-nano.ts        # Gemini Nano アダプタ
      zai-api.ts            # Z.ai API アダプタ
      tool-executor.ts      # ツール実行エンジン
      card-name-resolver.ts # カード名解決
      context-builder.ts    # コンテキスト構築
```

# 実装方針確定版

## アーキテクチャ方針

### Chrome拡張機能の構成

#### Content Script（メイン）
**公式サイト上で直接動作**

```javascript
// https://www.db.yugioh-card.com/* で実行
// ページのDOM、Cookie、セッションに直接アクセス可能

// 例：ページ内のデータ取得
const cgid = document.querySelector('[name="cgid"]')?.value;
const ytkn = document.querySelector('[name="ytkn"]')?.value;

// 例：既存のUIに機能追加
const deckList = document.querySelector('.deck-list');
const enhancedUI = createEnhancedDeckUI();
deckList.appendChild(enhancedUI);
```

**メリット:**
- ✅ 認証を気にする必要なし
- ✅ DOMに直接アクセス可能
- ✅ ページのデータをそのまま利用可能
- ✅ 既存UIを拡張できる

#### Background Script（補助）
**データ管理のみ**

```javascript
// データ永続化
chrome.storage.local.set({ cachedDecks: [...] });

// Content Scriptからのメッセージ処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // データ保存・取得など
});
```

**注意: 認証関連の処理は不要**
- Content Scriptがページ上で動作するため
- ユーザーは既に公式サイトでログイン済み
- 拡張機能は認証を意識しない

#### Popup（オプション）
**簡易的なステータス表示・設定画面**

### 開発環境の工夫

#### セッション情報の取得・利用

**ステップ1: ブラウザからセッション取得**
```bash
# Chrome DevToolsのConsoleで実行
document.cookie
# または
copy(document.cookie)
```

**ステップ2: 開発環境で利用**
```javascript
// dev/test-api.js
const SESSION_COOKIE = 'JSESSIONID=YOUR_SESSION_HERE';

async function testDeckAPI() {
  const response = await fetch('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=xxx', {
    headers: {
      'Cookie': SESSION_COOKIE,
      'User-Agent': 'Mozilla/5.0...'
    }
  });
  const html = await response.text();
  console.log(html);
}
```

**ステップ3: セッション情報管理**
```javascript
// .env.local (gitignoreに追加)
JSESSIONID=51A5E95CB43D1C1ED7F52E56D4A8A3AF
CGID=87999bd183514004b8aa8afa1ff1bdb9
YTKN=fc078c7fa46938e2b20f3c998792bedf...
```

## 実装優先順位（修正版）

### Phase 1: Content Scriptの基本実装 ⭐ 最優先
1. **ページ内データ抽出**
   - [ ] cgid, ytkn の取得
   - [ ] デッキ情報の抽出
   - [ ] カード情報の抽出

2. **DOM操作・UI拡張**
   - [ ] 既存UIへのボタン追加
   - [ ] 簡易的な機能追加（例：エクスポートボタン）

3. **開発用ツール**
   - [ ] HTMLパーサーのテスト環境
   - [ ] セッション情報を使ったAPI呼び出しテスト

### Phase 2: コア機能実装
4. **デッキ管理UI**
   - [ ] 拡張されたデッキ編集画面
   - [ ] ドラッグ&ドロップ
   - [ ] 検索・フィルター強化

5. **データ永続化**
   - [ ] chrome.storage での保存
   - [ ] キャッシュ管理

### Phase 3: 高度な機能
6. **履歴管理**
7. **インポート/エクスポート**
8. **統計・分析**

## 開発環境セットアップ

### 必要なもの
```json
{
  "devDependencies": {
    "typescript": "^5.5.0",
    "cheerio": "^1.0.0",  // HTMLパーサー（Node.js環境用）
    "node-html-parser": "^6.0.0",  // 軽量HTMLパーサー
    "dotenv": "^16.0.0"  // 環境変数管理
  }
}
```

### ディレクトリ構造（修正版）
```
ygo-deck-helper/
├── src/
│   ├── content/           # Content Script（メイン）
│   │   ├── index.ts
│   │   ├── dom-extractor.ts    # DOM/データ抽出
│   │   ├── ui-enhancer.ts      # UI拡張
│   │   └── deck-manager.ts     # デッキ管理ロジック
│   ├── background/        # Background Script
│   │   └── index.ts
│   ├── popup/            # Popup UI
│   ├── utils/            # 共通ユーティリティ
│   │   ├── parser.ts     # HTMLパーサー
│   │   └── storage.ts    # ストレージ管理
│   └── types/            # TypeScript型定義
├── dev/                  # 開発用ツール ⭐ 新規
│   ├── test-api.ts       # API動作確認スクリプト
│   ├── extract-data.ts   # データ抽出テスト
│   └── session.example.env  # セッション情報テンプレート
└── public/
    └── manifest.json
```

## 次のステップ

### 1. 実機でのデータ構造確認（最優先）
**実際にログインして調査:**
```javascript
// Chrome DevTools Console で実行
// cgid, ytkn の場所を特定
console.log('cgid:', document.querySelector('[name="cgid"]')?.value);
console.log('ytkn:', document.querySelector('[name="ytkn"]')?.value);

// デッキデータの構造確認
console.log('Deck elements:', document.querySelectorAll('.deck-card'));
```

### 2. 開発用スクリプト作成
**セッション情報を使ったAPI呼び出しテスト**
```typescript
// dev/test-api.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const COOKIE = `JSESSIONID=${process.env.JSESSIONID}`;

async function testGetDecks() {
  const response = await fetch(
    `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4&wname=MemberDeck&cgid=${process.env.CGID}`,
    { headers: { Cookie: COOKIE } }
  );
  const html = await response.text();
  // パース処理
}
```

### 3. Content Scriptプロトタイプ
**最小限の機能でテスト**
```typescript
// src/content/index.ts
console.log('YGO Deck Helper loaded');

// ページ内データ抽出
const cgid = extractCgid();
const ytkn = extractYtkn();
console.log({ cgid, ytkn });

// 簡易的なボタン追加
const exportBtn = document.createElement('button');
exportBtn.textContent = 'Export Deck';
exportBtn.onclick = () => {
  const deckData = extractDeckData();
  console.log(deckData);
};
document.body.appendChild(exportBtn);
```

## まとめ

### 変更点
- ❌ 認証フロー実装 → 不要（Content Scriptなので）
- ✅ Content Script中心の実装
- ✅ 開発環境でのセッション情報活用

### メリット
- シンプルな実装
- 開発効率向上（ローカルでテスト可能）
- セキュリティリスク最小化

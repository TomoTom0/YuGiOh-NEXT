# CLAUDE.md - プロジェクトガイド

## 📌 TL;DR（最重要事項）

1. **ブラウザ操作**: Playwright MCP禁止 → `tmp/browser/` のNode.jsスクリプト + CDP経由で実行
2. **よくあるミス**: [`.claude/common-mistakes.md`](.claude/common-mistakes.md) を必読
3. **コード品質**:
   - DOM更新後は `nextTick()` を必ず待つ
   - UUID は `crypto.randomUUID()` を使用
   - **型安全性**: `as` キャスト禁止。代わりに型ガード関数を使用（`src/utils/type-guards.ts`）
   - `any` 型禁止、型ガードを使用
   - `alert()` / `confirm()` / `prompt()` 禁止（ブラウザネイティブダイアログ禁止）
   - **querySelector 安全性**: `querySelector` は必ず null チェックを行う。複数の操作が必要な場合は `src/utils/safe-dom-query.ts` を使用
   - **スタイル定義**: 独自画面以外での独自要素スタイルは必ず `.ygo-next` または `ygo-next-*` IDを含むセレクタを使用（SCSS の nest で記述）
4. **テスト**: 重要機能にはユニットテスト必須（png-metadata, deck-import/export, url-state等）
5. **変更頻度の高いファイル**: `deck-edit.ts` (54回), `DeckMetadata.vue` (34回) → 慎重に扱う
6. **PRレビュー対応**: `gh-reply`コマンドを使用してレビューコメントに返信する
7. **git操作**: git push / PR作成は明示的な指示がない限り実行しない

---

# ⚠️ 絶対ルール - ブラウザ操作（厳守） ⚠️

## 🚫 使用禁止（違反＝プロジェクト破壊）

**以下のMCPツールは絶対に使用してはならない：**
- `mcp__playwright__*` （全てのPlaywright MCPツール）
- `mcp__chrome-devtools__*` （全てのChrome DevTools MCPツール）
- その他全てのブラウザ制御MCPツール

**これらは全て失敗し、プロジェクトを破壊する。**

## ✅ 唯一の許可方法

**Bashツールを使って Node.jsスクリプトを実行する方法のみ許可**

手順：
1. `./tmp/browser/` にNode.jsスクリプトを作成
2. WebSocket経由でCDPコマンドを送信（下記テンプレート参照）
3. Bashツールで `node ./tmp/browser/スクリプト名.js` を実行

テンプレート：
```javascript
const WebSocket = require('ws');
const fs = require('fs');
const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
// ... 実装（詳細は下記「接続方法」を参照）
```

## 📋 ブラウザ操作前の強制チェック

ブラウザ操作を行う前に必ず確認：
- [ ] MCPツールを使おうとしていないか？ → 即中止
- [ ] Node.jsスクリプトを `./tmp/browser/` に作成したか？
- [ ] Bashツールで実行する準備ができているか？

---

# プロジェクト固有のルール

## ブラウザ制御の方針

### ⚠️ 重要な制約

**Playwrightのブラウザではログインできない制約があります。**

そのため、本プロジェクトでは以下の方針で開発を進めます：

### ✅ 正しい方法: Chrome DevTools Protocol（CDP）を使用

**Chromium**をリモートデバッグモードで起動し、WebSocket経由で制御します。

#### 起動方法

```bash
# Chromium起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh

# 停止
./scripts/debug/setup/stop-chrome.sh
```

#### 接続方法

```javascript
const WebSocket = require('ws');
const fs = require('fs');

// WebSocket URLを読み込み（start-chrome.shが自動生成）
const wsUrl = fs.readFileSync('.chrome_playwright_ws', 'utf8').trim();
const ws = new WebSocket(wsUrl);

// Chrome DevTools Protocolでコマンド送信
function sendCommand(method, params = {}) {
  return new Promise((resolve) => {
    const id = messageId++;
    const handler = (data) => {
      const message = JSON.parse(data);
      if (message.id === id) {
        ws.off('message', handler);
        resolve(message.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// ページ操作例
await sendCommand('Page.navigate', { url: 'https://...' });
await sendCommand('Runtime.evaluate', { expression: 'document.title' });
```

#### この方法の利点

1. **ログイン可能**: Chromiumブラウザなので、ユーザーが手動でログインできる
2. **セッション永続化**: `--user-data-dir=.chrome_cache` でログイン状態を保持
3. **拡張機能ロード**: `--load-extension` でChrome拡張を読み込める（Google Chromeと異なり正式サポート）
4. **実機での動作確認**: 本番環境に近いブラウザで動作確認できる

### ❌ 避けるべき方法

#### 1. Google Chromeの使用

```bash
# これは動作しない！
google-chrome --load-extension=... --remote-debugging-port=9222
```

**理由**:
- Google Chromeは `--load-extension` フラグを無視する
- ログに `WARNING: --load-extension is not allowed in Google Chrome, ignoring.` が出力される
- **そのためChromium（chromium-browser）を使用する**

#### 2. Playwright persistentContext

```javascript
// これは使わない！
const browser = await chromium.launchPersistentContext(userDataDir, {
  args: ['--load-extension=...']
});
```

**理由**:
- Playwrightが使用するChromiumはログイン制約がある
- 本番環境との動作差異が発生する可能性

### 参考ドキュメント

- **セットアップスクリプト**: `scripts/debug/setup/`

## Build & Deploy

**ソースコード更新後は必ず以下を実行すること：**

```bash
bun run build-and-deploy
```

このコマンドはビルドとデプロイを一括で行う。

### デプロイ先

- WSL環境: `/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`
- Windows環境: `C:\Users\tomo\Mine\_chex\src_ygoNeuronHelper`

## テスト

```bash
# ユニットテスト（Vitest）
bun run test:vitest

# E2Eテスト（Chrome CDP経由）
bun run tmp/test-*.js
```

### デッキ編集ページ

拡張機能のデッキ編集UIは `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit` でアクセスできます。

## ファイル構成の重要なルール

### `.gitignore` 管理

以下のディレクトリは`.gitignore`に含まれています：
- `tmp/` - 一時的なテストスクリプトやデバッグファイル
- `.chrome_cache/` - Chromiumのユーザープロファイル
- `dist/` - ビルド出力
- `node_modules/` - bunパッケージキャッシュ

### `tasks/` ディレクトリの管理

`tasks/` は別リポジトリで管理されています。通常のリポで commit 保存すると、自動的に `tasks/` 内もcommit 保存されるため、以下の点に注意してください：

- **tasks/ 内のファイル修正時**: 通常通り編集してもよい（git add/commit は**不要**）
- **git add / commit の対象**: `tasks/` を含める必要はない
- **自動連動**: メインリポの commit 時に `tasks/` 内の変更も自動的に反映される
- **意識すべきこと**: `tasks/` 内を編集した後、メインリポで通常の add/commit を実行すれば十分

### `tmp/` と `/tmp/` の区別

- `./tmp/` : プロジェクトルートのtmpディレクトリ（一時的なテストスクリプト）
- `/tmp/` : システムのtmpディレクトリ

**必ずプロジェクトルートの`./tmp/`を使用すること！**

## バージョン管理

**package.jsonのversionフィールドで管理する**

- `package.json` の `"version"` フィールドで管理（`version.dat` は廃止済み）
- バージョン更新は**必ずスクリプトを使用**すること

```bash
# バージョン更新スクリプト
./scripts/dev/update-version.sh <新バージョン>

# 例
./scripts/dev/update-version.sh 0.4.5   # パッチバージョンアップ
./scripts/dev/update-version.sh 0.5.0   # マイナーバージョンアップ
./scripts/dev/update-version.sh 1.0.0   # メジャーバージョンアップ
```

**スクリプトが自動更新するファイル:**
- `package.json` の `version`
- `public/manifest.json` の `version`

**更新時の基準（セマンティックバージョニング）:**
- **メジャー**: 大きな変更や互換性のない変更
- **マイナー**: 新機能の追加や改善
- **パッチ**: バグ修正や小さな変更

## 通知

**beep音は使用禁止**

- `printf '\a'` などのbeep音を鳴らすコマンドは使用しないこと
- 完了通知が必要な場合はテキストメッセージで伝えること

## テストとサンプルデータ

### sample

- アクセス先のページのurlやhtmlは適当に調べるのではなく、`tests/sample/`に従ってアクセスおよびダウンロード済みhtmlの調査をする

### ブラウザ自動テスト

- ブラウザ操作の自動テストスクリプトは `tests/browser/` にある
- 新しいブラウザテストを作成する際は、既存のテストスクリプト（`test-buttons.js`, `test-shuffle.js`等）を参考にすること
- `tmp/browser/` のスクリプトは動作確認されていない一時的なものなので、根拠として使用しないこと

#### テストコード作成時の厳守事項

**必ずソースコードから仕様を確認すること**

テストコードを書く前に、以下を必ずソースコードから確認する：

1. **セレクタ・クラス名**: 推測で書かず、ソースコードから実際のクラス名を確認
2. **イベントハンドラの動作**: ボタンがどの関数を呼ぶか、その関数が何をするかを確認
3. **データ属性**: data-*属性が存在するか、何が格納されているかを確認
4. **DOM構造**: 要素の親子関係、兄弟関係を確認

禁止事項：
- **禁止**: 推測でセレクタやクラス名を書くこと
- **禁止**: 推測でボタンの動作を決めること（例：「下ボタン=side移動」など）
- **禁止**: Vue/Piniaの内部プロパティ（`__vue_app__`, `$pinia._s`等）にアクセスすること

必須事項：
- **必須**: ソースコードを読んで、実際に使用されているクラス名・属性・セレクタを確認すること
- **必須**: イベントハンドラ関数の中身を読んで、実際の動作を確認すること
- **必須**: DOM要素とその公開属性のみを使用すること

例：
- ❌ 悪い例: `document.querySelector('.deck-section[data-section-type="main"]')` （推測で書いた）
- ✅ 良い例: ソースコードで `.main-deck` クラスを確認してから `document.querySelector('.main-deck')` を使用
- ❌ 悪い例: 「下ボタンはside移動だろう」と推測して `.bottom-right` をクリック
- ✅ 良い例: DeckCard.vueで `handleTopRight()` が `moveCardToSide()` を呼ぶことを確認してから `.top-right` をクリック

## 絵文字の使用禁止

**絵文字は絶対に使用してはならない**

- ソースコード、HTML、Vue template、CSS、JavaScript/TypeScriptなど全てのコードで絵文字を使用しないこと
- アイコンが必要な場合は以下の方法を使用すること：
  - SVGアイコン
  - フォントアイコン（Font Awesome等）
  - テキスト記号（例: `×`, `⋯`, `▼`など）
  - CSS擬似要素による描画
- コミットメッセージやドキュメント内でも絵文字は使用しないこと

## PRレビュー対応

**gh-replyコマンドを使用すること**

PRのレビューコメントに返信する際は、`gh-reply`コマンドを使用する。

### 基本的な使い方

```bash
# PRの詳細を確認
gh-reply show <PR番号>

# PRのレビューコメント一覧を取得
gh-reply comment list <PR番号>

# ドラフト返信を追加 (comment listで取得したthreadIdを指定)
gh-reply draft add <PR番号> <threadId> "返信内容"

# ドラフト一覧を確認
gh-reply draft show <PR番号>

# ドラフトを送信
gh-reply draft send <PR番号>
```

### ワークフロー

1. `gh-reply comment list <PR番号>` でレビューコメントを確認
2. 各コメントに対して `gh-reply draft add` でドラフト返信を作成
3. 必要な修正をコードに反映してコミット・プッシュ
4. `gh-reply draft send <PR番号>` でドラフトを一括送信

## スタイル定義ルール

### SCSS での独自要素スタイル定義

**ルール**: 独自画面（デッキ表示ページなど）以外での独自要素のスタイル定義は、**必ず `.ygo-next` クラスまたは `ygo-next-*` IDを含むセレクタを使用する**。

#### 正しい例（nest を使用）：

```scss
// src/content/styles/buttons.scss
.ygo-next {
  &.ytomo-neuron-btn.loading {
    background: #4CAF50 !important;
    pointer-events: none;
  }

  &.ytomo-neuron-btn.loading2 {
    background: #FF9800 !important;
    pointer-events: none;
  }
}

// または ID セレクタを使用
#ygo-next-edit-btn {
  &.custom-state {
    // スタイル定義
  }
}
```

#### 誤った例（使用禁止）：

```scss
// 誤り：.ygo-next を含まない
.ytomo-neuron-btn.loading {
  background: #4CAF50 !important;
}

// 誤り：インラインスタイルを使用
button.style.background = '#4CAF50'; // NG
```

#### 理由：
- 独自画面要素と公式サイトの要素が混在するため、セレクタの特異性を明確に区分する必要がある
- `.ygo-next` クラスで修飾することで、公式サイトのスタイルとの競合を防ぎ、保守性を向上させる
- SCSS の nest を使用することで、構造を明確に保つ

---

## querySelector 安全性パターン

### 概要

`querySelector` は null を返す可能性があるため、必ず null チェックを行う必要があります。本プロジェクトでは、安全で一貫性のあるパターンを提供しています。

### 推奨パターン

#### 1. シンプルな場合（単一の操作）

直接 null チェックを行う：

```typescript
// 良い例：null チェック後に操作
const elem = document.querySelector('#myElement');
if (elem) {
  elem.textContent = 'Hello';
}

// または Optional chaining を使用
document.querySelector('#myElement')?.addEventListener('click', () => {
  // ...
});
```

#### 2. 複数の操作が必要な場合

`src/utils/safe-dom-query.ts` の安全なユーティリティを使用：

```typescript
import { safeQuery, safeQueryAndRun, safeGetAttribute, safeAddClass } from '@/utils/safe-dom-query';

// 単純な検索と操作
const elem = safeQuery('#myElement');
if (elem) {
  elem.textContent = 'Updated';
}

// コールバック付き安全実行
safeQueryAndRun('#myButton', (button) => {
  button.addEventListener('click', () => {
    console.log('Clicked');
  });
});

// 属性値を安全に取得
const href = safeGetAttribute('#myLink', 'href');
if (href) {
  window.location.href = href;
}

// クラスを安全に追加
safeAddClass('#element', 'active');

// 複数要素の検索
const items = safeQueryAll('.item');
items.forEach(item => {
  // 処理
});
```

### ユーティリティ関数一覧

| 関数 | 用途 | 戻り値 |
|------|------|--------|
| `safeQuery` | 単一要素を検索 | `Element \| null` |
| `safeQueryWithWarn` | 単一要素を検索（見つからない場合は警告） | `Element \| null` |
| `safeQueryAll` | 複数要素を検索 | `Element[]` |
| `safeQueryAndRun` | 要素を検索してコールバック実行 | `void` |
| `safeGetAttribute` | 属性値を取得 | `string \| null` |
| `safeGetText` | テキスト内容を取得 | `string \| null` |
| `safeSetHTML` | HTML を設定 | `boolean` |
| `safeSetAttribute` | 属性を設定 | `boolean` |
| `safeAddClass` | クラスを追加 | `boolean` |
| `safeRemoveClass` | クラスを削除 | `boolean` |
| `safeAddEventListener` | イベントリスナーを追加 | `boolean` |

### パターン別ガイド

#### DOMの存在チェック

```typescript
// 良い例
const elem = safeQuery('#element');
if (!elem) {
  console.warn('Element not found');
  return;
}
// 以降、elem は安全に使用可能
```

#### querySelector のチェーン操作

```typescript
// 避けるべき：クラッシュの可能性がある
const img = document.querySelector('#parent')?.querySelector('img');

// 推奨：明示的に null チェック
const parent = safeQuery('#parent');
const img = parent?.querySelector('img');
```

#### querySelectorAll の安全な処理

```typescript
// 推奨：safeQueryAll を使用
const items = safeQueryAll('.item');
items.forEach(item => {
  item.textContent = 'Updated';
});

// 代替案：null チェック付き
const itemList = document.querySelectorAll('.item');
if (itemList.length > 0) {
  itemList.forEach(item => {
    // 処理
  });
}
```

### テスト

`safe-dom-query.ts` の全ユーティリティ関数は 32 個のテストでカバーされています。

```bash
bun run test:vitest src/utils/__tests__/safe-dom-query.test.ts
```

### デバッグ時のコツ

null チェックの失敗を調査する場合：

```typescript
// セレクタが正しいか確認
const elem = safeQueryWithWarn('#myElement', 'Custom error message');

// HTMLを確認
console.log(document.body.innerHTML);

// セレクタの構文を確認
const valid = document.querySelector('valid-selector');
const complex = document.querySelector('parent > child.class[attr]');
```

---

## 型ガードの使用（as キャスト の代替）

### 概要

`as` キャストは TypeScript の型チェックを迂回し、実行時エラーの原因となります。本プロジェクトでは、型ガード関数を使用して安全な型変換を行います。

### 問題となる 'as' キャストの例

```typescript
// 悪い例：null を HTMLInputElement として扱う
const input = document.querySelector('input') as HTMLInputElement;
if (input) {
  console.log(input.value); // querySelector が null を返した場合、クラッシュ
}

// 悪い例：間違った型にキャスト
const img = document.querySelector('div') as HTMLImageElement;
const src = img.src; // img は div なので undefined

// 悪い例：型情報が失われる
const data: any = API.fetch();
const result = data as { id: string };
result.id.toString(); // data が null だったら実行時エラー
```

### 推奨パターン

#### 1. HTML 要素の安全な取得

```typescript
import { safeQueryAs, isHTMLInputElement, isHTMLImageElement } from '@/utils/type-guards';

// 良い例：型ガードを使用
const input = safeQueryAs('#my-input', isHTMLInputElement);
if (input) {
  console.log(input.value); // 安全：input は確実に HTMLInputElement
}

// または直接型ガードを使用
const element = document.querySelector('input');
if (isHTMLInputElement(element)) {
  console.log(element.value); // 安全：type guard で型が絞られた
}
```

#### 2. オブジェクトの安全なキャスト

```typescript
import { safeCastAs, isRecord, hasProperty } from '@/utils/type-guards';

// 良い例：型ガード関数で検証
const data: unknown = API.fetch();
const result = safeCastAs(data, isRecord);
if (result && hasProperty(result, 'id') && hasProperty(result, 'name')) {
  console.log(result.id, result.name); // 安全：プロパティの存在確認済み
}
```

#### 3. 複合型チェック

```typescript
import { allGuards, anyGuard, isHTMLElement } from '@/utils/type-guards';

// 複数条件を AND で結合
if (allGuards(element, isHTMLElement, (el) => el.classList.contains('active'))) {
  // element は HTMLElement かつ active クラスを持つ
}

// 複数条件を OR で結合
if (anyGuard(value, isString, isNumber)) {
  // value は string または number
}
```

### 型ガード関数一覧

#### HTML 要素関連

| 関数 | チェック対象 |
|------|-----------|
| `isHTMLElement` | 汎用 HTML 要素 |
| `isHTMLInputElement` | input 要素 |
| `isHTMLImageElement` | img 要素 |
| `isHTMLSelectElement` | select 要素 |
| `isHTMLButtonElement` | button 要素 |
| `isHTMLAnchorElement` | a 要素 |

#### オブジェクト・値関連

| 関数 | チェック対象 |
|------|-----------|
| `isRecord` | オブジェクト（`Record<string, any>`） |
| `hasProperty` | オブジェクトのプロパティ存在確認 |
| `isDefined` | null/undefined ではない |
| `isString` | 文字列 |
| `isNumber` | 数値（NaN を除く） |
| `isBoolean` | 真偽値 |
| `isArray` | 配列 |
| `isEnumMember` | enum メンバーシップ確認 |

#### 安全なクエリ・キャスト関数

| 関数 | 用途 |
|------|------|
| `safeQueryAs` | querySelector と型ガードを組み合わせた安全な検索 |
| `safeCastAs` | 型ガードを使用した安全なキャスト |
| `allGuards` | 複数の型ガード条件を AND で結合 |
| `anyGuard` | 複数の型ガード条件を OR で結合 |

### コンバージョンガイド

#### 悪い 'as' キャスト → 良い型ガード

```typescript
// Before（悪い）
const input = document.querySelector('input') as HTMLInputElement;

// After（良い）
const input = safeQueryAs('input', isHTMLInputElement);
// または
const input = document.querySelector('input');
if (isHTMLInputElement(input)) {
  // 使用
}
```

```typescript
// Before（悪い）
const data = response as { id: string; name: string };

// After（良い）
const data = safeCastAs(response, (obj) =>
  isRecord(obj) &&
  hasProperty(obj, 'id') &&
  hasProperty(obj, 'name')
);
```

### テスト

`type-guards.ts` の全関数は 30 個のテストでカバーされています。

```bash
bun run test:vitest src/utils/__tests__/type-guards.test.ts
```

### 既存コード の段階的改善

本プロジェクトの既存コードに含まれる 'as' キャストは、以下の段階的に改善されます：

1. **Phase 1**（実施済み）: 型ガード関数の実装と基本的な使用例
2. **Phase 2**（今後）: card-search.ts など API 関連ファイルの改善
3. **Phase 3**（今後）: その他の utilities の改善

### パフォーマンス考慮事項

型ガード関数は実行時チェックを行うため、多数の呼び出しがある場合は以下のパターンを推奨：

```typescript
// Good: 一度だけチェックして結果を再利用
const input = safeQueryAs('#my-input', isHTMLInputElement);
if (input) {
  // input を複数回使用
  input.value = 'text';
  input.addEventListener('change', handler);
}

// Avoid: 毎回チェック
for (const selector of selectors) {
  const element = safeQueryAs(selector, isHTMLElement);
  if (element) {
    element.style.display = 'none';
  }
}
```

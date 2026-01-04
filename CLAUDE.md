# CLAUDE.md - プロジェクトガイド

## 📌 TL;DR（最重要事項）

1. **タスク管理**: `tm` コマンドを使用（`tm list`, `tm update <ID> --status wip`, `tm finish <ID>`）
2. **ブラウザ操作**: Playwright MCP禁止 → Node.js + CDP（`scripts/debug/setup/start-chrome.sh`）
3. **よくあるミス**: [`.claude/common-mistakes.md`](.claude/common-mistakes.md) を必読
4. **コード品質**:
   - DOM更新後は `nextTick()` を必ず待つ
   - UUID は `crypto.randomUUID()` を使用
   - **型安全性**: `as` キャスト禁止。型ガード関数を使用（`src/utils/type-guards.ts`）
   - **querySelector 安全性**: null チェック必須。`src/utils/safe-dom-query.ts` 使用推奨
   - **スタイル定義**: `.ygo-next` スコープ必須（SCSS nest）
   - **デバッグログ**: `console.debug()` 使用（Verboseレベルでのみ表示）
   - **localStorage キー**: 全て `ygoNext:` プレフィックス必須
5. **テスト**: 重要機能にユニットテスト必須（png-metadata, deck-import/export, url-state等）
6. **PRレビュー対応**: `gh-reply`コマンド使用
7. **git操作**: 明示的な指示がない限りpush/PR作成しない
8. **alcom使用時**: `alcom status/diff`を使用（`git status/diff`ではない）

---

# ⚠️ 絶対ルール - ブラウザ操作（厳守） ⚠️

## 🚫 使用禁止

**以下のMCPツールは絶対に使用してはならない：**
- `mcp__playwright__*` （全てのPlaywright MCPツール）
- `mcp__chrome-devtools__*` （全てのChrome DevTools MCPツール）
- その他全てのブラウザ制御MCPツール

## ✅ 許可されているブラウザ操作方法

**Node.js + Chrome DevTools Protocol（CDP）のみ許可**

### 起動方法

```bash
# Chromium起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh

# 停止
./scripts/debug/setup/stop-chrome.sh
```

### 接続方法

```javascript
const WebSocket = require('ws');
const fs = require('fs');
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
```

### 重要な制約

- **Playwrightのブラウザではログインできない**
- **Chromium（chromium-browser）を使用**（Google Chromeは`--load-extension`を無視）
- 詳細：`scripts/debug/setup/`参照

---

# プロジェクト固有のルール

## Build & Deploy

**ソースコード更新後は必ず以下を実行すること：**

```bash
bun run build-and-deploy
```

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

拡張機能のデッキ編集UIは `https://www.db.yugioh-card.com/yugiohdb/#/ytomo/edit` でアクセス可能。

### テストコード作成時の厳守事項

**必ずソースコードから仕様を確認すること**

- **禁止**: 推測でセレクタやクラス名を書くこと
- **禁止**: 推測でボタンの動作を決めること
- **禁止**: Vue/Piniaの内部プロパティ（`__vue_app__`, `$pinia._s`等）にアクセス
- **必須**: ソースコードを読んで、実際に使用されているクラス名・属性・セレクタを確認
- **必須**: イベントハンドラ関数の中身を読んで、実際の動作を確認

参考：`tests/browser/`の既存テストスクリプト

## ファイル構成の重要なルール

### `.gitignore` 管理

以下のディレクトリは`.gitignore`に含まれています：
- `tmp/` - 一時的なテストスクリプトやデバッグファイル
- `.chrome_cache/` - Chromiumのユーザープロファイル
- `dist/` - ビルド出力
- `node_modules/` - bunパッケージキャッシュ

## バージョン管理

**リリース準備ワークフロー全体は `.claude/skills/release-prep.md` を参照**

update-versionコマンドで以下を自動更新：
- `package.json`
- `public/manifest.json`
- `docs/changelog/unreleased.md` → `docs/changelog/v{version}.md`

詳細は `.claude/skills/release-prep.md` の「バージョン更新（update-versionコマンド）」セクション参照。

## テストとサンプルデータ

### sample

アクセス先のページのurlやhtmlは適当に調べるのではなく、`tests/sample/`に従ってアクセスおよびダウンロード済みhtmlの調査をする。

### ブラウザ自動テスト

ブラウザ操作の自動テストスクリプトは `tests/browser/` にある。新しいテストを作成する際は既存のテスト（`test-buttons.js`, `test-shuffle.js`等）を参考にすること。

## デバッグログのルール

**ログレベルの使い分け**

| ログレベル | 用途 | 本番環境 | 表示条件 |
|-----------|------|---------|---------|
| `console.temp()` | 一時デバッグ用 | 利用後は必ず削除 | Verboseレベル有効時のみ |
| `console.debug()` | デバッグ用ログ | 一時的に残してOK | Verboseレベル有効時のみ |
| `console.log()` | 通常のログ | 削除必須 | 常に表示（本番では使用しない） |
| `console.warn()` | 警告メッセージ | 残す | 常に表示 |
| `console.error()` | エラーメッセージ | 残す | 常に表示 |

**console.temp()**: `console.debug()`のエイリアス。一時的なデバッグ専用で、利用後は必ず削除するか`console.debug()`に変更。

## localStorage キー規約

**全てのlocalStorageキーは `ygoNext:` プレフィックスで統一する**

### 現在使用しているキー

| キー名 | 用途 | 保存データ |
|--------|------|----------|
| `ygoNext:settings` | 拡張機能設定 | AppSettings（JSON） |
| `ygoNext:deckListOrder` | デッキリスト順序 | デッキ番号配列 |
| `ygoNext:deckThumbnails` | デッキサムネイル | Map<デッキ番号, Data URL> |
| `ygoNext:deckInfoCache` | デッキ情報キャッシュ | Map<デッキ番号, CachedDeckInfo> |
| `ygoNext:lastDeckDno` | 最後に使用したデッキ番号 | デッキ番号 |

### 新しいキーを追加する場合

1. **必ず `ygoNext:` プレフィックスを使用する**
2. **キャメルケースで命名する**（例: `ygoNext:newFeature`）
3. **上記の表に追加する**

## スタイル定義ルール

### SCSS での独自要素スタイル定義

**ルール**: 独自画面以外での独自要素のスタイル定義は、**必ず `.ygo-next` クラスまたは `ygo-next-*` IDを含むセレクタを使用する**。

#### 正しい例（nest を使用）：

```scss
// src/content/styles/buttons.scss
.ygo-next {
  &.ytomo-neuron-btn.loading {
    background: #4CAF50 !important;
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

#### 適用ファイル：

- `src/styles/common.scss` - グローバルスタイル（全て `.ygo-next` 内に定義）
- `src/content/styles/buttons.scss` - ボタン関連スタイル
- `src/styles/themes.scss` - テーマ変数定義

## テーマシステム

**テーマ定義は `src/styles/themes.scss` で一元管理**

- ライトテーマ: `[data-ygo-next-theme="light"]`
- ダークテーマ: `[data-ygo-next-theme="dark"]`
- 約300個のCSS変数を定義
- コンポーネントは `var(--変数名)` で参照

変更方法：
1. `src/styles/themes.scss` を編集
2. `bun run build-and-deploy`
3. オプション画面でテーマ切り替えを確認

## querySelector 安全性パターン

`querySelector` は null を返す可能性があるため、必ず null チェックを行う。

### 推奨パターン

```typescript
// シンプルな場合
const elem = document.querySelector('#myElement');
if (elem) {
  elem.textContent = 'Hello';
}

// 複数の操作が必要な場合
import { safeQuery, safeQueryAndRun } from '@/utils/safe-dom-query';

const elem = safeQuery('#myElement');
if (elem) {
  elem.textContent = 'Updated';
}

safeQueryAndRun('#myButton', (button) => {
  button.addEventListener('click', () => {
    console.log('Clicked');
  });
});
```

詳細：`src/utils/safe-dom-query.ts` (32個のテストでカバー)

## 型ガードの使用（as キャスト の代替）

`as` キャストは TypeScript の型チェックを迂回し、実行時エラーの原因となる。型ガード関数を使用する。

### 推奨パターン

```typescript
import { safeQueryAs, isHTMLInputElement } from '@/utils/type-guards';

// 型ガードを使用
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

詳細：`src/utils/type-guards.ts` (30個のテストでカバー)

## マッピング定数の使用ルール

**禁止**: マッピング定数のハードコード

```typescript
// ❌ 悪い例
const labels = { monster: 'M', spell: '魔', trap: '罠' }

// ✅ 良い例
import { CARD_TYPE_ID_TO_SHORTNAME } from '@/types/card-maps'
const label = CARD_TYPE_ID_TO_SHORTNAME[cardType]
```

---

## 参考ドキュメント

詳細な実装ガイドは以下を参照：

### プロジェクト構成

- **ドキュメント構成**: `docs/README.md` (ドキュメント構成、常時更新が必要なドキュメント一覧)
- **テスト構成**: `tests/README.md` (テスト構成、テスト更新が必要なタイミング、命名規則)

### 開発ガイド

- **ブラウザ操作**: `scripts/debug/setup/` (start-chrome.sh, stop-chrome.sh)
- **テストガイド**: `tests/browser/` (既存のテストスクリプト)
- **安全なDOM操作**: `src/utils/safe-dom-query.ts`
- **型安全性**: `src/utils/type-guards.ts`
- **カードマッピング**: `src/types/card-maps.ts`

### ワークフロー（Agent Skills）

- **リリース準備**: `~/.claude/skills/release-prep.md` (changelog管理、バージョン更新)
- **ドキュメント更新漏れチェック**: `~/.claude/skills/check-doc-updates.md` (docs/README.md参照)
- **テスト更新漏れチェック**: `~/.claude/skills/check-test-updates.md` (tests/README.md参照)

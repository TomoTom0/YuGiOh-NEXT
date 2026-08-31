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

# ⚠️ 絶対ルール - ユーザーの指摘への対応（厳守） ⚠️

## 基本原則

**ユーザーが指摘したことは、自分の調査結果より優先する**

### 指摘を無視しないためのルール

1. **ユーザーが同じことを2回以上言ったとき**
   - 自分の調査方法が間違っている可能性が高い
   - 調査をやり直す
   - 自分の前提を疑う

2. **情報に矛盾があったとき**
   - ユーザーの情報（有料プラン、設定など）と調査結果（残高不足、エラー）が矛盾したら
   - 自分の調査結果を疑う
   - ユーザーの情報が正しい前提で再調査する

3. **検証の方法**
   - 複数の候補を試す
   - 自分の前提（URL、設定、方法）を疑う
   - 結果を鵜呑みにしない
   - エラーメッセージも絶対ではない

4. **やってはいけないこと**
   - Web検索結果を「正しい」と決めつける
   - エラーメッセージを鵜呑みにする
   - 「自分が調べたから正しい」と思い込む
   - ユーザーの主張を「意見」だと思って無視する

### 複数指摘があった場合の対応フロー

**ユーザーから複数の指摘を一度に受けた場合、必ず以下の手順を実行する:**

1. **指摘の分割**: ユーザーの本文をそのまま分割し、個別の指摘として抽出する
2. **タスク起票**: 各指摘ごとにタスクを起票し、以下の情報を記載する:
   - **指摘**: ユーザーの原文（そのまま）
   - **現状の問題**: コード上の問題点（ソースコード確認後に記載）
   - **現在の仕様である理由**: もしあれば（確認後に記載）
   - **修正方針**: どう修正するか（確認後に記載）
   - **修正結果**: 修正後の状態（修正完了後に記載）
3. **列挙の提示**: タスク起票後、全指摘について以下の形式でユーザーに提示して認識合わせを行う:
   - **分割された原文**: ユーザーの原文をそのまま記載
   - **現状の問題**: コード上の問題点
   - **現状である理由**: なぜその問題が起きているか
   - **修正方針**: どう修正するか
   - **修正後の挙動**: 修正後にどうなるか
4. **修正開始**: 認識合わせの後に修正を開始する

**絶対にやってはいけないこと:**
- 指摘を勝手に解釈して要約すること
- 指摘の一部だけを対応して残りを無視すること
- 認識合わせなしに修正を開始すること
- ユーザーの指摘の正しさを検証・確認しようとすること（指摘は正しい前提で進める）
- 同種の指摘を複数タスクに分割すること（根本原因が共通する場合は1タスクにまとめる）
- コードを読んだ推測（妄想）で修正すること（認識合わせで各指摘の現状・原因・方針を明確にしてから修正する）

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
const { WS_FILE } = require('./tests/browser/cdp-helper.cjs');
const wsUrl = fs.readFileSync(WS_FILE, 'utf8').trim();
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
mise run build-deploy
```

普段の動作確認はdevビルド（コロンなし＝dev）を使う。リリース前の最終確認のみ`mise run build-deploy:prod`を使う。

`package.json`の全scriptsは`mise.toml`にもtaskとして登録済み（`mise tasks ls`で一覧表示）。内部実装はpnpmを使用。

### デプロイ先

実際のデプロイ先は`.env`の`RSYNC_PATH`が正。以下は参考値であり、`.env`と食い違う場合は`.env`を優先する。

- WSL環境: `/home/tomo/user/Mine/_chex/src_ygo-next`
- Windows環境: `C:\Users\tomo\Mine\_chex\src_ygo-next`

`src_ygoNeuronHelper`はプロジェクト名変更前の旧フォルダで無関係（残存しているが更新されていない）。

## テスト

```bash
# ユニットテスト（Vitest）
mise run test:vitest

# E2Eテスト（Chrome CDP経由）
node tmp/test-*.js
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

## 機能の有効/無効

**機能を無効化する場合はコードの削除やハードコードではなく、feature flag を使用する。**

feature flag のデフォルト値はコードに直書きせず、`configs/features.toml` で管理する（Single Source of Truth。webpack / vitest がビルド時に注入）。JS/TS定数への直書きもハードコード扱いで禁止。

- `configs/features.toml`: デフォルト値を追加（`true` / `false` / `"dev-only"` = 開発ビルドのみ有効）
- `src/types/settings.ts`: `FEATURE_IDS` と `FeatureSettings` にIDを追加（デフォルト値は書かない）
- `docs/feature/featureSettings.toml`: `category` / `ui` / `note` を記載（default値は書かない）
- カテゴリ定義は `docs/feature/README.md` 参照

## ファイル構成の重要なルール

### `.gitignore` 管理

以下のディレクトリは`.gitignore`に含まれています：
- `tmp/` - 一時的なテストスクリプトやデバッグファイル
- `.chrome_cache/` - Chromiumのユーザープロファイル
- `dist/` - ビルド出力
- `node_modules/` - pnpmパッケージキャッシュ

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

ブラウザ操作の自動テストスクリプトは `tests/browser/` にある。新しいテストを作成する際は既存のテスト（`test-buttons.cjs`, `test-shuffle.cjs`等）を参考にすること。

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
2. `mise run build-deploy`
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

### LLM機能開発（カードテキストのインタラクティブ・リンク化）

#### カードテキストの表現ルール（ユーザー説明）

**重要な表現の意味:**
- 「あいうえお」融合モンスター ＝ カード名に「あいうえお」を含む融合モンスター
- 「カード名が記された」 ＝ テキスト内にそのカード名を含まれるカード（千眼の楽章など）
- 「～以外」 ＝ 除外条件

#### 抽出条件のデータ構造

AI（LLM）を使った機能開発時の重要仕様

#### カードテキストからの条件抽出（提案1: インタラクティブ・リンク化）

**抽出条件のデータ構造:**

```typescript
interface ExtractedCondition {
  text: string;  // 原文から抽出した条件部分のテキスト
  filters: {
    cardTypes?: ['monster' | 'spell' | 'trap'];
    monsterTypes?: ['fusion' | 'synchro' | 'xyz' | 'link' | 'ritual' | 'pendulum'];
    races?: ['warrior' | 'dragon' | ...];
    attributes?: ['light' | 'dark' | ...];
    level?: { operator: '==' | '<=' | '>=', value: number };
    attack?: { operator: '==' | '<=' | '>=', value: number };
    nameQuery?: { operator: 'has' | '!=', value: 'カード名' };
    textQuery?: string;  // テキスト内に含まれる文字列（operatorなし）
  };
  logic: 'and' | 'or';
  negated: boolean;
  startIndex: number;
  endIndex: number;
}
```

**重要な仕様（ユーザー説明より）:**
- 「あいうえお」融合モンスター ＝ カード名に「あいうえお」を含む融合モンスター
  → `nameQuery: {operator: "has", value: "あいうえお"}`
- 「カード名が記された」 ＝ テキスト内にそのカード名を含むカード
  → `textQuery: "カード名"`（operatorなし、単なる文字列）
- 「～以外」 ＝ `nameQuery`のoperatorを"!="にする

**プロンプトでの注意点:**
- 小文字のみ指定すると、元の大文字小文字が保持されない
- `nameQuery`は`{operator: "has" | "!=" , value: "..."}`形式
- `textQuery`は単なる文字列（operatorなし）

### ワークフロー（Agent Skills）

- **リリース準備**: `~/.claude/skills/release-prep.md` (changelog管理、バージョン更新)
- **ドキュメント更新漏れチェック**: `~/.claude/skills/check-doc-updates.md` (docs/README.md参照)
- **テスト更新漏れチェック**: `~/.claude/skills/check-test-updates.md` (tests/README.md参照)

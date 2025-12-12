# CLAUDE.md - プロジェクトガイド

## 📌 TL;DR（最重要事項）

1. **タスク管理**: `tm` コマンドを使用（`tm list`, `tm update <ID> --status wip`, `tm finish <ID>`）
2. **ブラウザ操作**: Playwright MCP禁止 → `tmp/browser/` のNode.jsスクリプト + CDP経由で実行
3. **よくあるミス**: [`.claude/common-mistakes.md`](.claude/common-mistakes.md) を必読
4. **コード品質**:
   - DOM更新後は `nextTick()` を必ず待つ
   - UUID は `crypto.randomUUID()` を使用
   - **型安全性**: `as` キャスト禁止。代わりに型ガード関数を使用（`src/utils/type-guards.ts`）
   - `any` 型禁止、型ガードを使用
   - `alert()` / `confirm()` / `prompt()` 禁止（ブラウザネイティブダイアログ禁止）
   - **querySelector 安全性**: `querySelector` は必ず null チェックを行う。複数の操作が必要な場合は `src/utils/safe-dom-query.ts` を使用
   - **スタイル定義**: 独自画面以外での独自要素スタイルは必ず `.ygo-next` または `ygo-next-*` IDを含むセレクタを使用（SCSS の nest で記述）
   - **デバッグログ**: `console.debug()` を使用（本番でも残してOK、ブラウザのVerboseレベルでのみ表示）
5. **テスト**: 重要機能にはユニットテスト必須（png-metadata, deck-import/export, url-state等）
6. **変更頻度の高いファイル**: `deck-edit.ts` (54回), `DeckMetadata.vue` (34回) → 慎重に扱う
7. **PRレビュー対応**: `gh-reply`コマンドを使用してレビューコメントに返信する
8. **git操作**: git push / PR作成は明示的な指示がない限り実行しない
9. **alcom使用時のgitコマンド**: `alcom`使用中は`git status`ではなく`alcom status`、`git diff`ではなく`alcom diff`を使用する（一時コミットの影響を除外）

---

# ⚠️ 絶対ルール - ブラウザ操作（厳守） ⚠️

## 🚫 使用禁止（違反＝プロジェクト破壊）

**以下のMCPツールは絶対に使用してはならない：**
- `mcp__playwright__*` （全てのPlaywright MCPツール）
- `mcp__chrome-devtools__*` （全てのChrome DevTools MCPツール）
- その他全てのブラウザ制御MCPツール

**これらは全て失敗し、プロジェクトを破壊する。**

## ✅ 唯一の許可方法

おろかさが回復するまで、ブラウザ操作はしない。
どうせすべて失敗するのだから。

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

## タスク管理

**tmコマンドを使用してタスクを管理する**

本プロジェクトでは、`tasks/` ディレクトリの代わりに `tm` コマンドラインツールを使用してタスクを管理します。

### 基本的な使い方

```bash
# 新しいタスクを作成（自動的に version: "tbd" が設定される）
tm new "タスクのタイトル" --body "タスクの詳細説明" --status todo

# タスク一覧を表示（todo, wipのみ）
tm list

# 全てのオープンタスクを表示（todo, wip, pending, long）
tm list --open

# 全てのタスクを表示（done, closedも含む）
tm list --status-all

# タスクの詳細を表示
tm get <タスクID>

# タスクの詳細を履歴込みで表示
tm get <タスクID> --history

# タスクのステータスを変更
tm update <タスクID> --status wip   # 作業中に変更
tm update <タスクID> --status todo  # 未着手に戻す

# タスクを完了としてマーク（CHANGELOG用の情報をbodyに記載）
tm finish <タスクID> --body "CHANGELOG: Bug fix - カード名に特殊文字が含まれる場合のインポート失敗を修正"

# バージョンを設定（CHANGELOG記載後）
tm release <タスクID> --version 0.5.5

# タスクをクローズ（キャンセル・不要になった場合）
tm close <タスクID> --body "機能が不要になったためクローズ"
```

### タスクステータス

- `todo`: 未着手のタスク
- `wip`: 作業中のタスク（Work In Progress）
- `pending`: 保留中のタスク（他のタスクの完了待ち、判断保留など）
- `long`: 長期タスク（マイルストーン的なもの、複数のサブタスクを含む）
- `done`: 完了したタスク
- `closed`: クローズされたタスク（キャンセル、不要になった等）

**注意**:
- `tm list` は `todo` と `wip` のタスクのみを表示します（デフォルト）
- `tm list --open` で `todo, wip, pending, long` を含む全てのオープンタスクを表示
- `tm list --status-all` で `done, closed` を含む全てのタスクを表示
- 新規タスクには自動的に `version: "tbd"` が設定される

### フィルタリングオプション

`tm list` コマンドでは、以下の強力なフィルタリングオプションが使用できます：

**注**: `tm ls` は `tm list` の alias です。どちらでも使用可能です。

| オプション | 説明 | 使用例 |
|-----------|------|--------|
| `--open` | 全てのオープンタスク（todo, wip, pending, long）を表示 | `tm list --open` |
| `--status-all, -a` | 全てのタスク（done/closedを含む）を表示 | `tm list --status-all` |
| `--priority <p>` | 優先度でフィルタ | `tm list --priority high` |
| `--status <s>` | ステータスでフィルタ | `tm list --status wip` |
| `--version <v>` | バージョンでフィルタ | `tm list --version 0.5.5` |
| `--tbd` | **version='tbd'のタスクを表示（done/closedも含む）** | `tm list --tbd` |
| `--released` | **リリース済みタスクを表示（version≠tbd、done/closedも含む）** | `tm list --released` |

### ワークフロー

#### 通常のタスク管理

1. **タスク開始前**: `tm list` または `tm list --open` でタスクを確認
2. **タスク開始**: `tm update <ID> --status wip` で作業中に変更
3. **作業中**: タスクの詳細を確認したい場合は `tm get <ID>` または `tm get <ID> --history`
4. **タスク完了**: `tm finish <ID> --body "CHANGELOG: ..."` で完了としてマーク（CHANGELOG用の説明を追加）
5. **進捗確認**: `tm list` または `tm list --open` で状態を確認

#### リリース準備ワークフロー

1. **CHANGELOG未記載タスクの確認**: `tm ls --tbd` で version='tbd' のタスクを全て表示
2. **タスク詳細の確認**: `tm get <ID>` で各タスクのbodyからCHANGELOG項目を取得
3. **CHANGELOGへの記載**: 各タスクの情報をCHANGELOG.mdに追記
4. **バージョンの確定**: `tm release <ID> --version 0.5.5` で各タスクにバージョンを設定
5. **リリース確認**: `tm ls --released --version 0.5.5` でリリース済みタスクを確認

#### CHANGELOGとの連携

新規タスクには自動的に `version: "tbd"` が設定されるため、以下のワークフローでCHANGELOG記載漏れを防げます：

```bash
# タスク完了時にCHANGELOG用の情報をbodyに記載
tm finish 5 --body "CHANGELOG: Bug fix - デッキインポート時にカード名に特殊文字が含まれると失敗する問題を修正"

# リリース準備時にversion='tbd'のタスクを確認
tm ls --tbd

# 各タスクの詳細を確認してCHANGELOGに記載
tm get 5  # bodyからCHANGELOG項目をコピー

# CHANGELOG記載後、バージョンを確定
tm release 5 --version 0.5.5

# リリース済みタスクの確認
tm ls --released --version 0.5.5
```

**利点**:
- ✅ **記載漏れ防止**: `tm ls --tbd` で未記載タスクを一発確認
- ✅ **情報の集約**: bodyにCHANGELOG用の説明を書いておけば、履歴を遡る必要がない
- ✅ **効率的なリリース作業**: 完了済みタスクも含めて全ての未記載タスクを確認可能

### タスク作成時の注意事項

- **タイトル**: 簡潔で分かりやすいタスク名（例: "REQ-18: CardList.vue のレビュー確認"）
- **本文（--body）**: 詳細な説明、関連ファイル、レポートへのリンク等を記載
- **優先度（--priority）**: `high`, `medium`, `low` などを設定（タイトルに含めるのではなく、オプションで設定）
- **ファイル参照**:
  - `--add-file`: 編集対象のファイルを追加（タスクと関連ファイルを明確に紐付け）
  - `--read-file`: 参考資料として読み取り専用ファイルを追加（ドキュメント、レポート等）

### 例

```bash
# 高優先度のレビュータスクを作成（ファイル参照付き）
tm new "REQ-18: CardList.vue のレビュー確認" \
  --priority high \
  --status todo \
  --add-file src/components/CardList.vue \
  --read-file docs/internal-reviews/reports/CardList-review.md \
  --body "ソート複数キーの処理順序確認
displayOrder との連携確認
大量カード（200+）時のパフォーマンス確認"

# 長期タスクを作成
tm new "REQ-20: 全体的なリファクタリング計画" --status long --priority high

# 保留タスクを作成（他のタスク完了待ち）
tm new "CardDetail.vue の最適化" --status pending --body "CardList.vue のリファクタリング完了後に実施"

# タスクを作業中に変更
tm update 1 --status wip

# ファイルを追加・削除
tm update 1 --add-file src/components/CardDetail.vue
tm update 1 --rm-file src/components/OldComponent.vue

# 複数タスクのステータスを一括変更（コンテキスト切り替え）
tm update 1 --status done 2 --status wip --body "次のタスクに着手"

# 履歴を含めてタスク詳細を表示
tm get 1 --history

# タスクを完了（CHANGELOG情報を含む）
tm finish 1 --body "CHANGELOG: Feature - カードリストのソート機能を強化"

# バージョンを設定
tm release 1 --version 0.5.5

# CHANGELOG未記載のタスクを確認
tm list --tbd

# 特定バージョンのリリース済みタスクを確認
tm list --released --version 0.5.5

# 高優先度のオープンタスクのみ表示
tm list --open --priority high

# 作業中のタスクのみ表示
tm list --status wip
```

### コードレビュー依頼

**tm reviewコマンドでコードレビューを依頼できる**

コードの品質チェックや改善提案を受けるために、レビューリクエストを作成できます。

#### 基本的な使い方

```bash
# レビューリクエストを作成
tm review new "リファクタリングの妥当性確認" --body "deck-edit.tsのリファクタリング内容をレビューしてください"

# レビューリクエスト一覧を表示
tm review list

# レビューリクエストの詳細を表示
tm review get <ID>

# レビューリクエストの詳細を履歴込みで表示
tm review get <ID> --history

# レビューリクエストのステータスを更新
tm review update <ID> --status reviewing --body "レビュー中です"

# レビュー結果を返信
tm review return <ID> --status reviewed --body "以下の点を改善してください..."

# レビューを承認（新しいタスクを作成することも可能）
tm review accept <ID> --new "指摘事項の修正" --new "追加のリファクタリング"

# レビューを却下
tm review reject <ID>
```

#### レビューステータス

- `pending`: レビュー待ち
- `reviewing`: レビュー中
- `reviewed`: レビュー完了（フィードバック返信済み）
- `accepted`: 承認済み
- `rejected`: 却下

#### ワークフロー

1. **レビュー依頼**: `tm review new` でレビューリクエストを作成
2. **レビュー実施**: レビュアーが内容を確認し、`tm review return` でフィードバック
3. **対応**: 指摘事項を修正し、必要に応じて再レビュー依頼
4. **承認/却下**: `tm review accept` または `tm review reject` で完了

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

## alcom（always-commit）の使用

**LLM支援コーディングセッション中の一時スナップショット管理ツール**

本プロジェクトでは、`.claude/config.json`のhooks設定により、ユーザーメッセージ送信時に自動的に`alcom save`が実行されます。

### 基本コマンド

```bash
# セッション中の変更を確認（git statusの代わり）
alcom status

# セッション開始以降の差分を確認（git diffの代わり）
alcom diff

# 一時スナップショットの履歴を確認
alcom git log --oneline @base..HEAD

# セッション開始時のコミットハッシュを取得
alcom base-hash

# セッション終了時：全ての一時スナップショットを1つのコミットにまとめる
alcom finish "最終的なコミットメッセージ"

# 最後のスナップショットを取り消す
alcom undo
```

### 重要な注意事項

**alcom使用中は通常のgitコマンドを使用しない**

- ❌ `git status` → 一時コミットが大量に表示される
- ❌ `git log` → 一時コミットが大量に表示される
- ❌ `git diff` → 最後の一時コミットとの差分のみ表示

- ✅ `alcom status` → セッション開始以降の実質的な変更を表示
- ✅ `alcom diff` → セッション開始以降の実質的な差分を表示
- ✅ `alcom git <args>` → `@base`プレースホルダーサポート付きでgitコマンドを実行

### ワークフロー

1. **セッション中**: 自動的に`alcom save`が実行される（hooks設定による）
2. **進捗確認**: `alcom status`や`alcom diff`で変更を確認
3. **セッション終了**: `alcom finish "feat: 実装した機能の説明"`で一時コミットをまとめる

### `@base`プレースホルダー

`alcom git`コマンドでは、`@base`がセッション開始時のコミットハッシュに自動展開されます。

```bash
# セッション開始以降の変更ファイルを表示
alcom git diff --name-status @base

# セッション開始以降のコミットログを表示
alcom git log --oneline @base..HEAD
```

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

## デバッグログのルール

**ログレベルの使い分け**

本プロジェクトでは、以下のルールでconsoleログを使い分けます：

| ログレベル | 用途 | 本番環境 | 表示条件 |
|-----------|------|---------|---------|
| `console.debug()` | デバッグ用ログ | 一時的に残してOK | ブラウザのVerboseレベルを有効化した時のみ表示 |
| `console.log()` | 通常のログ | 削除必須 | 常に表示（本番では使用しない） |
| `console.warn()` | 警告メッセージ | 残す | 常に表示（潜在的な問題の検出に必要） |
| `console.error()` | エラーメッセージ | 残す | 常に表示（エラー発生時のログに必要） |

### console.debug() の利点と注意事項

**利点:**
1. **本番環境でユーザーに見えない**: デフォルトでは非表示
2. **必要な時だけ確認可能**: Chrome DevToolsの Console タブで "Verbose" レベルを有効化すれば表示される
3. **一時的に残せる**: 本番ビルド前に即座に削除する必要がない（デバッグ中の利便性向上）

**注意事項:**
- **不要になったら削除する**: デバッグが完了したら、不要な `console.debug()` は削除すること
- **長期的に必要なログではない**: 一時的なデバッグ用途のみ。長期的に残す理由がない場合は削除すべき
- **コードレビュー時に確認**: PRレビュー時に、残されている `console.debug()` が本当に必要か確認する

### 記述例

```typescript
// ✅ 良い例: デバッグログ（一時的に残してOK、デバッグ完了後は削除）
console.debug('[MappingManager] Initializing for language:', lang);
console.debug('[handleSearch] Query:', query, 'Filters:', filters);

// ❌ 悪い例: console.log でデバッグ（本番前に削除が必要）
console.log('[DEBUG] Initializing...');
console.warn('[DEBUG] Query:', query); // warn をデバッグに使うのも不適切

// ✅ 良い例: エラーログ（本番でも必要、削除しない）
console.error('[MappingManager] Failed to initialize:', error);

// ✅ 良い例: 警告ログ（本番でも必要、削除しない）
console.warn('[MappingManager] Stored mappings are invalid, fetching fresh data...');
```

### デバッグログの削除タイミング

以下の場合は `console.debug()` を削除すること：

1. **デバッグ完了後**: 問題が解決し、ログが不要になった時
2. **機能実装完了時**: その機能のデバッグが終わり、安定動作している時
3. **PRマージ前**: コードレビューで不要と判断された時

ただし、以下のような場合は一時的に残すことも可能：

- 複雑な処理で、将来的なデバッグに役立つ可能性がある
- 段階的な開発中で、次のフェーズでも使用する予定がある

**原則**: 迷ったら削除する。必要になったら再度追加すればよい。

### Chrome DevToolsでの表示方法

デバッグログを確認する手順：

1. Chrome DevToolsを開く（F12）
2. Console タブを選択
3. フィルターアイコン（漏斗マーク）をクリック
4. "Verbose" にチェックを入れる

これで `console.debug()` のログが表示されるようになります。

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

# レビューコメントに返信
gh-reply comment reply <PR番号> <threadId> "返信内容"
```

### ワークフロー

1. `gh-reply comment list <PR番号>` でレビューコメントを確認
2. 必要な修正をコードに反映
3. `gh-reply comment reply <PR番号> <threadId> "返信内容"` で各コメントに返信

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

## テーマシステム

**テーマ定義は `src/styles/themes.scss` で一元管理**

本プロジェクトでは、ライトテーマとダークテーマをSCSSで定義し、CSS変数（カスタムプロパティ）として提供しています。

### テーマ切り替えの仕組み

- ライトテーマ: `[data-ygo-next-theme="light"]`
- ダークテーマ: `[data-ygo-next-theme="dark"]`
- 約300個のCSS変数を定義
- コンポーネントは `var(--変数名)` で参照

### 変更方法

1. `src/styles/themes.scss` を編集してテーマ変数を変更
2. ビルド: `bun run build-and-deploy`
3. オプション画面でテーマ切り替えを確認

### 注意事項

- **themes.tsは廃止済み**: 動的CSS変数注入は行わない（パフォーマンス改善のため）
- **SCSSのみが信頼できる情報源**: themes.scssのみがテーマ定義
- **型安全性の欠如**: CSS変数名のタイポ検出はIDE拡張やstylelintに依存

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
| `safeQuery` | 単一要素を検索 | `Element | null` |
| `safeQueryWithWarn` | 単一要素を検索（見つからない場合は警告） | `Element | null` |
| `safeQueryAll` | 複数要素を検索 | `Element[]` |
| `safeQueryAndRun` | 要素を検索してコールバック実行 | `void` |
| `safeGetAttribute` | 属性値を取得 | `string | null` |
| `safeGetText` | テキスト内容を取得 | `string | null` |
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

---

## マッピング定数の使用ルール

**禁止**: マッピング定数のハードコード

❌ 悪い例:
```typescript
const labels = { monster: 'M', spell: '魔', trap: '罠' }
```

✅ 良い例:
```typescript
import { CARD_TYPE_ID_TO_SHORTNAME } from '@/types/card-maps'
const label = CARD_TYPE_ID_TO_SHORTNAME[cardType]
```
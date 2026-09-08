# ブラウザテスト

Chrome拡張機能の実装された機能に関する動作確認を行うテストスイートです。

Chrome DevTools Protocol（CDP）を使用して、Chromiumブラウザ上で拡張機能が正しく動作することを確認します。

## 前提条件

### 1. Chromiumの起動

テストを実行する前に、拡張機能をロードした状態でChromiumを起動する必要があります。

```bash
# Chromium起動（リモートデバッグモード + 拡張機能ロード）
./scripts/debug/setup/start-chrome.sh
```

このスクリプトは以下を実行します：
- Chromiumをリモートデバッグモードで起動
- 拡張機能を自動ロード
- WebSocket URLを `configs/browser.toml` の `chrome.ws_file` に指定されたファイルに保存

### 2. 依存パッケージのインストール

WebSocket通信のため、`ws` パッケージが必要です。

```bash
npm install
```

## テストファイル一覧

### `cdp-helper.cjs`

Chrome DevTools Protocolを使用するための共通ヘルパー関数です。

**主な機能**:
- `connectCDP()`: WebSocket接続を確立
- `evaluate(expression)`: JavaScriptコードを評価
- `navigate(url)`: ページに移動
- `wait(ms)`: 指定時間待機
- `close()`: 接続を閉じる

### `test-buttons.cjs`

ボタンの表示状態を確認するテストです。

**確認項目**:
1. シャッフルボタンの存在
2. ソートボタンの存在
3. デッキ画像作成ボタンの存在
4. カメラアイコンのSVG塗りつぶしがないこと（`fill: none`）
5. ボタンの配置位置

**実行方法**:
```bash
node tests/browser/test-buttons.cjs
```

### `test-shuffle.cjs`

カードシャッフル・ソート機能の動作確認テストです。

**確認項目**:
1. シャッフルボタンをクリックしてカードの順序が変わること
2. ソートボタンをクリックしてカードが元の順序に戻ること
3. アニメーションクラス（`animating`）が適用されること

**実行方法**:
```bash
node tests/browser/test-shuffle.cjs
```

### `test-lock.cjs`

Lock機能（sortfix）の動作確認テストです。

**確認項目**:
1. `.top-right` ボタンをクリックしてロック状態になること
2. ロック状態のカードに視覚的フィードバックがあること
   - `data-ygo-next-sortfix` 属性の付与
   - `.top-right` ボタンの `.is-sortfixed` クラス
   - 南京錠アイコン（SVG）
3. シャッフル時にロックされたカードが先頭に保持されること
4. もう一度クリックするとロックが解除されること

**前提**: 公開デッキURL（認証不要）で実行。クリック対象は `<a>` ではなく子の `.ygo-next-card-btn.top-right` ボタン（DOMイベントは子孫に伝播しないため）。

**実行方法**:
```bash
node tests/browser/test-lock.cjs
```

### `test-dialog.cjs`

デッキ画像作成ダイアログの動作確認テストです。

**確認項目**:
1. カメラボタンをクリックしてダイアログが表示されること
2. デッキ名入力フィールドが存在すること
3. ダイアログをクリックして背景色が切り替わること（赤↔青）
4. QRトグルボタンでQRコードのON/OFF切り替えができること
5. ダウンロードボタンが存在すること
6. オーバーレイをクリックしてダイアログが閉じること

**実行方法**:
```bash
node tests/browser/test-dialog.cjs
```

### `test-scroll-to-top.cjs`

scroll-to-top機能の動作確認テストです。

**確認項目**:
1. search tabでのscroll-to-top動作
   - カード検索後、スクロール可能であることを確認
   - scroll-to-topボタンをクリックしてトップに戻ること
2. related tabでのscroll-to-top動作
   - 関連カードが多いカード（ブラック・マジシャン）で確認
   - scroll-to-topボタンをクリックしてトップに戻ること
3. products tabでのscroll-to-top動作
   - パック展開後、scroll-to-topボタンをクリックしてトップに戻ること

**実行方法**:
```bash
node tests/browser/test-scroll-to-top.cjs
```

**詳細**: [README-scroll-to-top.md](./README-scroll-to-top.md) を参照

### `test-card-add-animation.cjs`

カード追加アニメーションの動作確認テストです。

**確認項目**:
1. 左下ボタンクリックでアニメーションが発生すること
2. 右クリックでアニメーションが発生すること
3. 中クリックでアニメーションが発生すること

**実行方法**:
```bash
node tests/browser/test-card-add-animation.cjs
```

### `test-card-search-flow.cjs`

カード検索フロー（検索 → パース → キャッシュ）の完全フロー確認テストです。

**確認項目**:
- キーワード入力 → 検索実行 → 結果表示 → キャッシュ動作確認

**実行方法**:
```bash
node tests/browser/test-card-search-flow.cjs
```

### `test-cardinfo-menu.cjs`

CardInfo メニューボタンの表示テストです。

**確認項目**:
1. メニューボタンと画像選択ボタンがサイドバイサイドで表示されること（flex-row）
2. メニュー外をクリックするとメニューが閉じること
3. メニューを閉じるときにアニメーションが実行されること

**実行方法**:
```bash
node tests/browser/test-cardinfo-menu.cjs
```

### `test-deck-code-issuance.cjs`

デッキコード発行機能のテストです（PR #82）。デッキ詳細ページでデッキコードが正しく発行・ローカルストレージに保存されることを確認します。

**実行方法**:
```bash
node tests/browser/test-deck-code-issuance.cjs
```

### `test-deck-creation.cjs`

デッキ新規作成機能のテストです。デッキ編集ページ（`#/ytomo/edit`）で新規デッキが正しく作成されることを確認します。

**実行方法**:
```bash
node tests/browser/test-deck-creation.cjs
```

### `test-save-flow.cjs`

デッキ保存フローのテストです。固定テスト用デッキ dno=3「テスト自動生成デッキ」（TASK-317）を対象に、保存ボタンで保存成功トーストが表示されることを確認します。保存ボタンは現在の並び順で保存し直すだけでカード構成は変えないため、繰り返し実行しても安全・可逆です。

**実行方法**:
```bash
node tests/browser/test-save-flow.cjs                  # 書き込みなし（ボタン存在確認まで）
YGO_WRITE_TESTS=1 node tests/browser/test-save-flow.cjs # 実際に保存を実行
```

### `test-sort-all-alt-save.cjs`

全ソート＋代替ソート保存のテストです。固定テスト用デッキ dno=3 を対象に、メニューの「全ソート」「代替ソートで保存」がいずれも並び順のみを変更しカード構成を変えないことを利用し、繰り返し実行しても安全・可逆です。

**実行方法**:
```bash
node tests/browser/test-sort-all-alt-save.cjs                  # 書き込みなし（メニュー項目存在確認まで）
YGO_WRITE_TESTS=1 node tests/browser/test-sort-all-alt-save.cjs # 実際に全ソート→代替ソート保存を実行
```

### `test-unsaved-changes.cjs`

未保存の変更ダイアログのテストです。固定テスト用デッキ dno=3 を対象に、デッキ名末尾への半角スペース付与（低リスクに確実な差分を作れる方法）で未保存の変更を作り、再読み込み操作時にダイアログが表示されること、「処理を中断」でキャンセルできることを確認します。`YGO_WRITE_TESTS=1` 時は「保存して続ける」経路も検証し、直後にデッキ名を元の値へ復元して dno=3 の状態を変更前に戻します。

**実行方法**:
```bash
node tests/browser/test-unsaved-changes.cjs                  # 書き込みなし（キャンセル経路のみ）
YGO_WRITE_TESTS=1 node tests/browser/test-unsaved-changes.cjs # 「保存して続ける」経路も検証（デッキ名を復元）
```

### `test-genesys-ocg-regulation.cjs`

GENESYSポイント取得（TASK-302）のE2Eテストです。公開デッキ表示ページ（認証不要）で、background service workerからのCORS越えfetch、content script→background→chrome.storageの往復、GENESYS_FETCH_TEXTリレー経路が機能することを確認します。書き込みなし。

**実行方法**:
```bash
node tests/browser/test-genesys-ocg-regulation.cjs
```

### `test-regulation-badge-menu.cjs`

regulationバッジのクリック切替メニュー（TASK-450）のE2Eテストです。デッキ編集画面（`DeckEditTopBar.vue` `.regulation-badge`）とデッキ閲覧画面（`regulation-ui.ts` `.ygo-next-regulation-trigger`）の両方で、「代表2件+最新版 → PAST区分(1段目) → 年グループ(2段目) → 個別版(3段目)」の3階層メニュー展開と選択を確認します。編集画面は固定テスト用デッキ dno=3 を対象にしますが、選択操作はデッキ名タグをローカルで書き換えるのみ（`deckStore.setDeckRegulation`）でサーバー保存を伴わないため、繰り返し実行しても安全・可逆です（テスト末尾でデッキ名を元の値に復元）。閲覧画面側の選択も一時プレビューのみでデッキ名は変更しません。書き込みなし。

**実行方法**:
```bash
node tests/browser/test-regulation-badge-menu.cjs
```

### `test-filter-dialog-header.cjs`

検索フィルターダイアログのヘッダー表示テストです。

**確認項目**:
1. フィルター設定後、ダイアログヘッダーにチップが表示されること
2. クリアボタンがアイコンで表示されること
3. 閉じるボタンが「×」で表示されること
4. AND/ORチップのスタイルが正しいこと（リンクマーカー、モンスタータイプ）

**実行方法**:
```bash
node tests/browser/test-filter-dialog-header.cjs
```

### `test-filter-not-condition.cjs`

検索フィルターのNOT条件・論理演算のAPIパラメータ変換テストです。

**確認項目**:
1. NOT条件（除外モンスタータイプ）が正しくAPIパラメータに変換されること
2. AND/OR論理演算が正しくAPIパラメータに変換されること
3. ペンデュラムスケール、魔法・罠タイプ、発売日等のフィルターが正しく変換されること

**実行方法**:
```bash
node tests/browser/test-filter-not-condition.cjs
```

### `test-filter-multi-type-and-or.cjs`

複数モンスタータイプ選択時のAND/OR絞り込みの回帰テストです（TASK-373）。

過去に、モンスタータイプを2種類以上選択してもURL構築処理（`buildApiUrl`）が同名パラメータ
（`other=X&other=Y`）を上書きし、実際には1種類しかサーバーへ送信されない不具合と、
デフォルトソート順のAPI値が名前と逆の意味だった不具合があった。

**確認項目**:
1. 融合+シンクロの2種類選択時、実際のリクエストに`other`パラメータが2個とも送信されること
2. OR検索で0件以上ヒットすること
3. AND検索で正しく0件になること（融合とシンクロを同時に持つカードは仕様上存在しない）
4. OR件数とAND件数が異なること（AND/OR切替が結果に反映されていること）

**注意**: ハッシュ部分のみ同一のURLへの`navigate`は同一ドキュメント内遷移となり、
前回実行時のPinia状態（フィルター選択）が残留することがあるため、`about:blank`を経由して
確実にフルリロードしてからテストを開始する。

**実行方法**:
```bash
node tests/browser/test-filter-multi-type-and-or.cjs
```

### `test-header-resize.cjs`

デッキ編集画面のヘッダー成長時スクロール到達性の回帰テストです（TASK-286）。

**確認項目**:
1. ヘッダーが遅延ロード（画像・バナー等）で成長した際、`--header-height` がResizeObserverで追従すること
2. `.deck-edit-container` がviewport内に収まること
3. 一番下までスクロールしてもトラッシュセクションが見切れないこと

**実行方法**:
```bash
node tests/browser/test-header-resize.cjs
```

**前提**: editページでログイン済みであること

### `test-load-dialog-flow.cjs`

LoadDialog（デッキ読み込みダイアログ）の完全フロー確認テストです。

**確認項目**:
- ダイアログ表示 → デッキ一覧表示 → ページネーション → デッキ読み込み

**実行方法**:
```bash
node tests/browser/test-load-dialog-flow.cjs
```

### `test-mappings.cjs`

マッピング取得テストです。Content scriptが正常に動作し、マッピング取得とChrome Storage保存が機能するかを確認します。

**注意**: Chrome Storage APIは拡張機能内でのみアクセス可能なため、Content scriptのコンソールログでマッピング取得状況を検証します。

**実行方法**:
```bash
node tests/browser/test-mappings.cjs
```

### `test-practice-mode.cjs`

一人回し（Practice）機能の最終動作確認テストです。

**実行方法**:
```bash
node tests/browser/test-practice-mode.cjs
```

### `test-import-export.cjs`

Import / Export ダイアログ（ImportExportDialog.vue）の動作確認テストです。
編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で実行します。

**確認項目**:
1. メニュー → Import / Export でダイアログが開く（Import タブ初期表示・初期UI・Importボタン disabled）
2. close-btn / オーバーレイクリックでダイアログが閉じる
3. Export タブ（CSV/TXTサブタブ・Side Deckトグル・CSVカラムピル・ファイル名入力・プレビュー）
4. CSVプレビューの合計枚数がデッキ枚数と一致すること
5. Download で CSV / TXT ファイルが `tmp/e2e-import-export/downloads/` に保存され内容がプレビューと一致すること（`Browser.setDownloadBehavior` 使用）
6. 空ファイル / 必須列欠損CSV / 未対応形式(.json) のインポートでエラーメッセージ表示
7. 正常CSVインポート（プレビュー枚数・警告表示・Importボタン有効化 → replace実行でデッキ置換・トースト表示）

**注意**: 保存ボタンは押さず、最後にページ再読み込みでメモリ上のデッキ状態を破棄します（サーバーへの書き込みなし）。インポート対象カードは読み込み済みデッキからcid/ciidを抽出するためAPI通信不要です。未保存確認ダイアログが出た場合は「保存せず続ける」で続行します。

**実行方法**:
```bash
node tests/browser/test-import-export.cjs
```

### `test-settings.cjs`

設定ダイアログ（SettingsDialog.vue）の操作と設定の永続化の動作確認テストです。
編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で実行します。

**確認項目**:
1. メニュー → Options で設定ダイアログが開く（Settings ヘッダ・タブ構成 General / Deck Edit・テーマボタン Light/Dark/Auto の active 表示）
2. close-btn / オーバーレイクリックでダイアログが閉じる
3. Deck Edit タブの画面固有設定ブロック（Edit Image Size / Search Position / Extra/Side / Export Timestamp）表示と General タブへの復帰
4. テーマ切替（light <-> dark 双方向）で `document.documentElement` の `data-ygo-next-theme` 属性が変化すること（`.deck-edit-container` の同名属性も追従）
5. 切替が永続化されること（localStorage ミラー `ygoNext:settings` の theme 更新 + リロード後も属性が維持 = chrome.storage.local ラウンドトリップ）
6. クリーンアップ: 元のテーマ設定に復元し、リロード後もテスト前の属性・保存値と一致すること（theme 以外の設定値に差分がないことも全キー比較で確認）

**注意**: 拡張機能は content script の isolated world で動作するため、`window.ygoNextCurrentSettings` は CDP（main world）から参照できません。永続化は origin 共有の localStorage ミラーとリロード後の属性で検証します。テーマ設定は必ず元の値に復元します。

**実行方法**:
```bash
node tests/browser/test-settings.cjs
```

### `test-card-operations.cjs`

カード4隅移動ボタン（`DeckCard.vue` `.card-controls`）のE2Eテストです（TASK-455）。編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で、カードの4隅ボタンの実クリックによるセクション間移動とUndo復元を確認します。書き込みなし（保存ボタンは押さず、最後にページ再読み込みでメモリ状態を破棄）。

**確認項目**:
1. mainカードの4隅ボタン構造（top-left詳細 / top-right=S(`card-btn-s`) / bottom-left=trashアイコン / bottom-right=plusアイコン）・trashセクションは枚数バッジなし（`:show-count="false"`）
2. main→side 移動（top-right S）で main -1 / side +1・バッジ更新・uuidがsideセクションに移動
3. Ctrl+Z（実キーイベント）で main→side 移動が復元される
4. side→main 移動（sideカードのtop-right M/E）
5. main→trash 移動（bottom-left trashアイコン）・trash内カードはtop-rightボタンなし・bottom-left=M/E(`card-btn-me`)・bottom-right=S(`card-btn-side`)
6. trash→main 移動（trashカードのbottom-left M/E）
7. trash→side 移動（trashカードのbottom-right S）→ sideのtop-right(M/E)でmainに復帰
8. Ctrl+Z で main→trash 移動も復元される
9. カードコピー（bottom-right +）で main +1・Ctrl+Zで取り消し（TASK-452の軽い再確認）
10. top-left（詳細表示）でCard詳細タブに切替・Deckタブに戻せる

**実行方法**:
```bash
node tests/browser/test-card-operations.cjs
```

### `test-section-shuffle-sort.cjs`

セクション単位シャッフル/ソートボタン（`DeckSection.vue` `h3 .section-buttons`）のE2Eテストです（TASK-456）。編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で、見出しボタンの実クリックによる並び順変更・要素集合の保存（uuid多重集合の不変）・Undo（Ctrl+Z 実キーイベント）による可逆性を確認します。書き込みなし（保存ボタンは押さず、最後にページ再読み込みでメモリ状態を破棄）。

**確認項目**:
1. ボタン構造: main/extra/side の h3 内 `.section-buttons` に `.btn-section` が2つ（title="Shuffle"/"Sort"・disabledなし）。trash は `v-if="sectionType !== 'trash'"` でボタン自体が描画されない（枚数バッジも `:show-count="false"` でなし）
2. main シャッフル: 順序変化（同一順序の偶然はリトライで吸収）・uuid多重集合が不変・枚数/バッジが不変・他セクションの順序に影響しない
3. Ctrl+Z でシャッフル前の順序に戻る
4. main ソート: シャッフル状態から順序変化・uuid多重集合が不変・Ctrl+Z でソート前の順序に戻る
5. ソートの決定性: 別のシャッフル状態からソートしても同一の正規順序になる（同一cid重複カードはcomparatorが同一視するためcid列で比較）・履歴の全巻き戻しでロード時順序に復帰
6. ソート方向トグル（`deckLevelSortOrder` 既定 `toggle-desc` かつ `categoryPrioritySortMode` 既定 `level` の場合のみ実行。localStorageミラー `ygoNext:settings` で判定）: descソート済み+5秒以内の再ソートでascへトグル・5秒経過後はdescに戻る・desc状態で5秒以上経過した再ソートでは順序不変（`TOGGLE_SORT_TIMEOUT_MS=5000`）
7. extra/side（カード2枚以上ある場合）: シャッフル→Undo・ソート→Undo・mainへの影響なし

**注意**: カードのレベル/種族等のソートキー情報は拡張機能ストレージ（chrome.storage）由来でCDP（main world）からは読めないため、ソート順の検証は「決定性」と「方向トグルによる順序変化」で行います。セクションは `.main-content` と RightArea deck-tab の2箇所に存在するためセレクタは必ず `.main-content` 配下にスコープします。

**実行方法**:
```bash
node tests/browser/test-section-shuffle-sort.cjs
```

### `test-drag-drop.cjs`

カードのドラッグ＆ドロップ移動（`DeckCard.vue` のHTML5 DnD）のE2Eテストです（TASK-457）。編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で、D&Dによる並び替え・セクション間移動・Undo（Ctrl+Z 実キーイベント）による復元を、実HTML5 DnDイベント（dragstart→dragover→drop→dragend を共有DataTransferでdispatchする合成DragEvent）で検証します。書き込みなし（保存ボタンは押さず、最後にページ再読み込みでメモリ状態を破棄）。

**D&D発火方式**: CDP `Runtime.evaluate`（main world）で `new DragEvent(type, {dataTransfer})` を合成dispatch。`Input.dispatchMouseEvent` だけではHTML5ドラッグセッション（dragstart）は発火しないため。dragstart ハンドラが dataTransfer ペイロードと `deckStore.draggingCard` を設定し、dragover/drop の canMoveCard 判定が両者に依存するため、アプリ実装の dragstart を通したイベントシーケンスが必要。

**確認項目**:
1. 合成 dragstart がアプリ実装ハンドラを通過する（dataTransfer に `{sectionType, uuid, card.cardId}` が書き込まれる）
2. dragover でドロップ先カードに `.drag-over` ハイライト・自分自身には付かない・sideセクションには `.section-drag-over` が付く（正の対照）
3. main内reorder（カード→カード）: ソースがドロップ先の直後に配置・uuid多重集合・枚数/バッジが不変
4. Ctrl+Z で reorder が復元される【現状挙動: 元の位置の1つ手前に復元（off-by-one）】
5. 自分自身へのドロップはno-op（順序・枚数不変）
6. main内reorder（カード→末尾drop-zone-end）【現状挙動: 末尾ではなく末尾から2番目に配置（off-by-one）】+ Ctrl+Z で復元
7. main→side 移動（カード→sideカード）: main -1 / side +1・バッジ更新・移動元uuid消失・sideに新uuid（同cardId・`cid-ciid-連番` 再生成）がドロップ先の直前に出現・sideカードの `.drag-over` ハイライト・Ctrl+Z でuuid・位置まで完全復元
8. side→main 移動（sideカード→mainカード）: 枚数復帰・mainに新uuid（同cardId）がドロップ先の直前に出現・Ctrl+Z 2回で段階的に完全復元
9. main→side 移動（カード→side末尾drop-zone-end）: uuid保持でside末尾に配置（moveCard経路・uuid再生成なし）
10. 履歴の全巻き戻し: 残コマンドをCtrl+Zで消化し全セクション枚数がロード時状態に復帰・mainのuuid多重集合が不変
11. trashへのD&Dは不可（canMoveCard拒否）: trashセクションに `.section-drag-over` なし・ドロップしても枚数・順序不変

**注意**: dno=3 のsideデッキは空のため、カード→カードのmain⇔sideドロップ検証の前に末尾drop-zone経由でsideへカードを補充します。Vue/Pinia内部プロパティにはアクセスせずDOMの `data-uuid` / `data-card-id` で検証します。項目4・6の【現状挙動】は `deck-edit.ts` の `reorderWithinSectionInternal` の toIndex 計算に由来する off-by-one 疑い（undoは「元の直前カードの直後」への、末尾ドロップは「末尾」への配置が各コード上の意図）のため、修正時は本テストの期待値も合わせて更新が必要です。

**実行方法**:
```bash
node tests/browser/test-drag-drop.cjs
```

### `test-command-history.cjs`

操作履歴ダイアログ（`CommandHistoryDialog.vue`・メニュー「Operation History」）のE2Eテストです（TASK-458）。編集ページ（`#/ytomo/edit?dno=3`・ログイン済み前提）で、メニュー経由のダイアログ開閉・操作（カード追加×2 + main→side移動）の履歴記録表示・履歴項目クリックによるデッキ復元（`deckStore.jumpToIndex` の実動作: 過去位置へはundo連続・未来位置へはredo連続・現在位置はno-op）・履歴クリアを検証します。書き込みなし（保存ボタンは押さず、最後にページ再読み込みでメモリ上のデッキ状態を破棄）。

**確認項目**:
1. ロード直後（履歴空）: メニュー → Operation History でダイアログが開く（ヘッダ「操作履歴」・body直下の `.history-dialog` は1つだけ）。「操作履歴がありません」表示・クリアボタン disabled・凡例4種（追加/削除/移動/順序）
2. close-btn / オーバーレイクリックでダイアログが閉じる
3. カード追加×2（+ボタン）+ main→side移動（Sボタン）の3操作が履歴に記録される（連番1..3・`type-add`/`type-move`クラス・説明「追加: ... -> メイン」「移動: ... (メイン -> サイド)」・時刻HH:MM:SS）
4. 最新項目に `current` クラス + 「現在」バッジ・過去項目にはなし・最新位置では `undone` 項目なし
5. 未保存変更がある状態でも確認ダイアログなしでそのまま開く（`handleShowHistory` は `checkUnsavedChanges` を通らない）
6. 過去位置へのジャンプ（項目1クリック）: デッキがその時点の状態に復元される（main/side枚数で検証）・undo/redoボタン両方有効・項目1に「現在」バッジ・項目2,3は `undone` クラス
7. 現在位置の項目クリックはno-op（枚数不変）だがダイアログは閉じる
8. 未来位置へのジャンプ（項目3クリック = redo相当）: 全操作後の状態に進む・redoボタン disabled。1つ過去（項目2クリック）への復帰も検証
9. 履歴クリア: ダイアログ閉鎖・トースト「操作履歴をクリアしました」・undo/redoボタン両方 disabled・デッキ枚数は不変・再オープンで「操作履歴がありません」+ クリアボタン disabled

**注意**: 履歴項目index i のクリックは「コマンドi実行後」の状態への移動です（`jumpToIndex` の仕様。初期状態＝全コマンド実行前への復帰はUI上不可・undoボタンでのみ可能）。メニュー系セレクタはTopBarが2箇所にあるため `.main-content` 配下に、ダイアログはTeleportされるため `.base-dialog-overlay` 配下にスコープします。

**実行方法**:
```bash
node tests/browser/test-command-history.cjs
```

## テスト対象URL

すべてのテストは以下の公開デッキURLでテストを実行します（認証不要）：

```
https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&wname=MemberDeck&ytkn=8f21eab3f9c60291cd95cd826f709d226675a2bec73af70b567bb779cca8fbfa&cgid=87999bd183514004b8aa8afa1ff1bdb9&dno=95
```

## 全テストの実行

すべてのテストを順番に実行する場合：

```bash
node tests/browser/test-buttons.cjs && \
node tests/browser/test-shuffle.cjs && \
node tests/browser/test-lock.cjs && \
node tests/browser/test-dialog.cjs && \
node tests/browser/test-scroll-to-top.cjs
```

## トラブルシューティング

### `Error: ENOENT: no such file or directory, open '<ws_file>'`

Chromiumが起動していません。以下のコマンドでChromiumを起動してください（ws_fileのパスは `configs/browser.toml` で管理）：

```bash
./scripts/debug/setup/start-chrome.sh
```

### `WebSocket connection error`

Chromiumが終了している可能性があります。Chromiumを再起動してください：

```bash
./scripts/debug/setup/stop-chrome.sh
./scripts/debug/setup/start-chrome.sh
```

### テストが途中で失敗する

ページのロード時間が不足している可能性があります。各テストの `wait` 時間を調整してください。

```javascript
await cdp.wait(5000); // 5秒待機（必要に応じて延長）
```

## テストの追加

新しいテストを追加する場合：

> **ファイル拡張子は必ず `.cjs` にすること**。プロジェクトの `package.json` が `"type": "module"` (ESM) のため、`.js` では `require()` が使えず実行時に `ReferenceError` になります。`.cjs` を使うことで CommonJS 扱いとなり `require()` が動作します。

1. `cdp-helper.cjs` をインポート（`require('./cdp-helper.cjs')` のように拡張子まで明示）
2. `connectCDP()` で接続を確立
3. `navigate(url)` でページに移動
4. `evaluate(expression)` でDOM操作・確認
5. テスト終了時に `close()` で接続を閉じる

**テンプレート**:

```javascript
const { connectCDP } = require('./cdp-helper.cjs');

async function testExample() {
  console.log('【テスト名】\n');

  const cdp = await connectCDP();

  try {
    await cdp.navigate('https://...');
    await cdp.wait(5000);

    const result = await cdp.evaluate(`
      // JavaScriptコード
      document.title
    `);

    console.log('結果:', result);

    cdp.close();
  } catch (error) {
    console.error('エラー:', error);
    cdp.close();
    process.exit(1);
  }
}

testExample();
```

## 参考資料

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [WebSocket (ws) npm package](https://www.npmjs.com/package/ws)

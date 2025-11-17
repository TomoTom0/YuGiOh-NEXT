## 2025-11-18: デッキメタデータ編集機能完了

- **タイムスタンプ**: 2025-11-18 04:00
- **バージョン**: 0.4.0（予定）
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

**Phase 1: デフォルトテーマの変更**
- `src/types/settings.ts`: `DEFAULT_APP_SETTINGS.theme` を `'system'` → `'light'` に変更
  - 理由: darkテーマが実質機能していないため、ライトテーマをデフォルトに設定

**Phase 2: メタデータ編集機能の実装**
- `src/components/RightArea.vue`: Header タブ → Metadata タブに変更
  - 無効化されていたタブを有効化
  - DeckMetadata コンポーネントをインポート・登録
  - metadata-content セクションを追加

- `src/components/DeckMetadata.vue`: メタデータ編集UI（新規作成）
  - 編集可能フィールド:
    - デッキ名（text input）
    - 公開設定（toggle switch: 公開/非公開）
    - デッキタイプ（select: OCG マスター/スピード、デュエルリンクス、マスターデュエル）
    - デッキスタイル（select: 未選択、キャラクター、トーナメント、コンセプト）
    - コメント（textarea）
    - タグ（chip表示 + 追加/削除機能）
  - ローカル状態管理: `ref` + `watch` でストアと同期
  - 保存機能:
    - `deckStore.saveDeck(dno)` を呼び出してサーバーに保存
    - エラーハンドリング（dno未設定、API失敗時）
    - 成功/失敗時のアラート表示

### ビルド・デプロイ
- ✅ TypeScriptビルド完了
- ✅ デプロイ完了（`/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`）

### 技術的なポイント
- 既存の `saveDeckInternal` API を再利用（新規APIは不要）
- メタデータ保存時に `DeckInfo` の全フィールド（name, isPublic, deckType, deckStyle, comment, tags, mainDeck, extraDeck, sideDeck）をサーバーに送信
- TypeScript型安全性: `DeckTypeValue`, `DeckStyleValue` 型を適用

---

## 2025-11-18: デッキ画像作成UIの改善完了

- **タイムスタンプ**: 2025-11-18 03:30
- **バージョン**: 0.4.0（予定）
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

**デッキ画像作成ダイアログのUI改善**
- `imageDialog.ts`: QRトグルボタンとInclude Sideボタンの改善
  - QRボタン:
    - テキスト変更: 1行「QR」→ 2行「Include / QR」
    - サイズ変更: 60px × 60px → 80px × 70px
    - 色変更: 青色背景 → 白背景（有効時）、グレー背景（無効時）
  - Include Sideボタン追加:
    - 位置: 右中央（`position: absolute; right: 12px; top: 50%`）
    - サイズ: 80px × 70px
    - テキスト: 2行「Include / Side」
    - 表示条件: `deckData.sideDeck.length > 0`（サイドデッキが存在する場合のみ表示）
    - 機能: トグル時にプレビュー画像を再生成（サイドデッキの有無で高さが変わる）

**テキストの大文字化**
- QRボタン: 「include qr」→「Include QR」
- Sideボタン: 「include side」→「Include Side」

### ビルド・デプロイ
- ✅ TypeScriptビルド完了
- ✅ デプロイ完了（`/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`）
- ✅ Chromium再起動

---

## 2025-11-18: デッキインポート/エクスポート全形式でenc対応完了（最終版）

- **タイムスタンプ**: 2025-11-18 02:00
- **バージョン**: 0.3.9
- **ブランチ**: `feature/v0.4.0-foundation`
- **コミット**: `30342cd` (ImportDialog), `ec44a32` (CSV/TXT enc対応), `51e3f23` (PNG enc対応)

### 実装内容

**PNG画像へのメタデータ埋め込み**
- `downloadDeckRecipeImage.ts`: PNG画像に自動的にメタデータ埋め込み
- ファイル名拡張子: `.jpg` → `.png`
- `png-metadata.ts`: SimpleDeckInfo に `enc` フィールド追加
  - `embedDeckInfoToPNG()`: デッキ情報をPNG tEXtチャンクに埋め込み
  - `extractDeckInfoFromPNG()`: PNG tEXtチャンクからデッキ情報を抽出

**CSV/TXT形式でもenc対応**
- `deck-export.ts`: エクスポート時に `enc` フィールドを含める
  - CSV形式: `section,name,cid,ciid,enc,quantity`
  - TXT形式: `2x カード名 (cid:ciid:enc)`
- `deck-import.ts`: インポート時に `enc` フィールドを読み込み
  - `enc` があれば `imgs` 配列に設定: `[{ ciid, imgHash }]`
  - これによりカード画像が正しく表示される

**ImportDialogでPNG画像受付**
- `ImportDialog.vue`: accept属性に `.png` を追加
  - `accept=".csv,.txt,.png"`

### 修正内容

**問題1**: CSV/TXTからインポートした際、カード画像が裏面になっていた
- 原因: `imgs` 配列が空配列のまま作成されていた
- 解決: `enc` フィールドを追加し、`imgs` 配列に `{ ciid, imgHash }` を設定

**問題2**: ImportDialogでPNG画像を選択できなかった
- 原因: accept属性に `.png` が含まれていなかった
- 解決: accept属性に `.png` を追加

**対応ファイル**:
- `src/utils/png-metadata.ts`: PNG tEXtチャンク操作（NEW）
- `src/utils/deck-import.ts`:
  - `ImportRow` に `enc` フィールド追加
  - CSV/TXTパーサーで `enc` 読み込み対応
  - PNG画像からのインポート対応（`importFromPNG()`）
  - `convertRowsToDeckInfo()` で `imgs` 配列に設定
- `src/utils/deck-export.ts`:
  - `ExportRow` に `enc` フィールド追加
  - CSV/TXTエクスポート時に `enc` 出力
- `src/components/ImportDialog.vue`:
  - accept属性に `.png` 追加
- `src/content/deck-recipe/downloadDeckRecipeImage.ts`:
  - PNG画像ダウンロード時に自動的にメタデータ埋め込み

### 削除した不要な実装

当初の誤解で実装したが、後に不要と判明して削除したもの：
- ExportDialog.vue: PNG形式選択（デッキ画像作成ダイアログと重複）
- deck-export.ts: exportToPNG(), downloadDeckAsPNG()（同上）

### 正しい使い方

**エクスポート**:
1. Export Deck メニューから CSV/TXT を選択
2. **自動的に enc フィールドが含まれる**

**PNG画像作成**:
1. デッキ編集/表示ページで**カメラボタン**をクリック
2. デッキ画像作成ダイアログでオプション選択
3. ダウンロードボタンをクリック
4. **自動的にデッキ情報（cid, ciid, enc, quantity）が埋め込まれたPNG画像**がダウンロード

**インポート**:
1. Import Deck メニューをクリック
2. **CSV/TXT/PNG いずれかのファイルを選択**
3. **enc フィールドが含まれている場合、カード画像が正しく表示される**
4. enc がない場合、インポート直後は裏面表示（save/load後は表示）

### テスト結果
- ✅ enc フィールドが正しくPNG画像に埋め込まれることを確認
- ✅ enc フィールドが正しく抽出されることを確認
- ✅ ciid 違いのカードでも正しい imgHash が設定されることを確認
- ✅ CSV/TXT形式でも enc フィールドが正しくエクスポート/インポートされる
- ✅ ImportDialogでPNG画像を選択できることを確認

### 技術詳細

**PNG tEXtチャンク仕様**:
- キー: "DeckInfo"
- 値: SimpleDeckInfo の JSON文字列
- CRC32チェックサム: PNG仕様準拠
- 挿入位置: IENDチャンクの前

**後方互換性**:
- enc フィールドがない旧形式のCSV/TXTでもインポート可能
- ただし、カード画像は裏面表示（save/load後は表示）

---

## 2025-11-17: デッキ画像作成時のメタデータ自動埋め込み修正（削除済み）

- **タイムスタンプ**: 2025-11-18 00:15
- **バージョン**: 0.3.9（途中版）
- **ブランチ**: `feature/v0.4.0-foundation`

### 修正内容

**デッキ画像作成ダイアログの自動埋め込み対応**
- `downloadDeckRecipeImage.ts`:
  - `embedDeckInfoToPNG()` を自動呼び出し
  - ファイル名拡張子を `.jpg` → `.png` に変更
  - エラーハンドリング追加

### 動作フロー
1. ユーザーがカメラボタンをクリック
2. デッキ画像作成ダイアログでオプション選択（カラー/QR/スケール）
3. ダウンロードボタンをクリック
4. **自動的にデッキ情報がメタデータとして埋め込まれる**
5. PNG画像がダウンロードされる
6. その画像を Import Deck 機能で読み込んでデッキを復元可能

---

## 2025-11-17: PNG画像へのデッキ情報埋め込み機能実装（基盤）

- **タイムスタンプ**: 2025-11-17 23:30
- **バージョン**: 0.3.9
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

**PNG画像埋め込み・抽出機能**
- `src/utils/png-metadata.ts`: PNG tEXtチャンク操作
  - `embedDeckInfoToPNG()`: デッキ情報をPNG画像のメタデータに埋め込み
    - PNGバイナリ操作（IENDチャンク前にtEXtチャンクを挿入）
    - CRC32計算（PNG仕様準拠）
    - デッキ情報を簡略化してJSON形式で保存
  - `extractDeckInfoFromPNG()`: PNG画像からデッキ情報を抽出
    - tEXtチャンクを走査
    - "DeckInfo"キーのメタデータを取得
  - 画像の見た目に影響しない標準的な方法

**エクスポート機能拡張**
- `src/utils/deck-export.ts`: PNG形式エクスポート
  - `exportToPNG()`: デッキ画像生成 + メタデータ埋め込み
  - `downloadDeckAsPNG()`: PNG画像をダウンロード
  - PNGExportOptionsインターフェース（scale, color, includeQR, cgid）
  - サイドデッキ除外オプション対応

**インポート機能拡張**
- `src/utils/deck-import.ts`: PNG形式インポート
  - `importFromPNG()`: PNG画像からデッキ情報を抽出してDeckInfoに変換
  - `importDeckFromFile()`: PNG形式（.png）に対応
  - メタデータなしPNGのエラーハンドリング

### テスト
- `tmp/test-png-metadata-simple.ts`: 基本的な埋め込み・抽出テスト
  - ✅ 最小限のPNGでテスト成功
  - ✅ データの整合性検証成功

### 技術的な課題と解決
- **課題**: ループ条件のバグでIENDチャンクを読めない
- **解決**: `offset < pngData.length - 12` → `offset + 12 <= pngData.length` に修正

### 次のステップ
- [ ] ExportDialogにPNG形式を追加
- [ ] ブラウザE2Eテスト（実際のデッキ画像で検証）
- [ ] ユニットテスト作成
- [ ] バージョン更新とデプロイ

---

## 2025-11-17: デッキインポート機能実装

- **タイムスタンプ**: 2025-11-17 22:45
- **バージョン**: 0.3.8
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

**デッキインポート機能の追加**
- `src/utils/deck-import.ts`: CSV/TXT形式のインポート機能
  - `importFromCSV()`: CSV形式のパース（ヘッダー行、複数形式対応）
  - `importFromTXT()`: TXT形式のパース（セクション別、人間が読みやすい形式）
  - `importDeckFromFile()`: ファイル自動判定とインポート
  - フレキシブルな形式サポート:
    - name列はオプション（インポート時は無視）
    - ciidが1の場合は省略可能
    - 同じcidを複数行で記載可能
  - エラーハンドリングと警告メッセージ

- `src/components/ImportDialog.vue`: インポートダイアログUI
  - ファイル選択（.csv, .txt）
  - プレビュー機能（Main/Extra/Sideのカード数表示）
  - 警告メッセージ表示
  - インポートオプション：既存デッキを置き換え or 追加

- `src/components/DeckEditTopBar.vue`: メニュー統合
  - "Import Deck" メニュー項目追加
  - mdiImportアイコン使用
  - インポート成功時のトースト通知

### TypeScript型対応
- CardInfo型の仮データ生成（後でAPIから正しい情報を取得する想定）
- DeckInfo型の完全なフィールド初期化
- strictモードでの`possibly undefined`エラー対応

### ビルド・デプロイ
- ビルド成功（2 warnings）
- デプロイ完了: `/home/tomo/user/Mine/_chex/src_ygoNeuronHelper`

---

# DONE

最近完了したタスク（簡潔版）

> **詳細な履歴**: `docs/_archived/tasks/done_before_2025-11-17.md` を参照

---

## 2025-11-17: デッキ画像作成ダイアログ - ダウンロードボタンホバー効果追加

- **タイムスタンプ**: 2025-11-17 21:30
- **バージョン**: 0.3.7
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

**ダウンロードボタンのホバー効果強化**
- 背景色変化: `rgba(70, 120, 255, 0.15)` （青い半透明背景）
- ボーダー色変化: `rgba(70, 120, 255, 0.5)` （青い半透明ボーダー）
- 不透明度変化: 0.7 → 1.0
- 位置移動: `translateY(-1px)` （わずかに上に移動）
- 影効果: `0 2px 8px rgba(0, 0, 0, 0.2)` （ボタンが浮き上がる）

### 修正ファイル

- `src/content/deck-recipe/imageDialog.ts` (lines 243-249)

### ビルド・デプロイ

- ✅ ビルド成功
- ✅ デプロイ完了（`/mnt/c/Users/tomo/Mine/_chex/src_ygoNeuronHelper`）

---

## 2025-11-17: 複数ciid対応 - Load時のイラスト違いカード正しくパース

- **タイムスタンプ**: 2025-11-17 20:30
- **バージョン**: 0.3.7
- **ブランチ**: `feature/v0.4.0-foundation`
- **コミット**: `2c0a62f`

### 問題

**Load時に複数ciidを持つカードがciid=1で上書きされる**
- デッキをLoadすると、イラスト違い（ciid違い）の情報が失われる
- 例: 灰流うらら ciid=2が1枚、ciid=1が2枚のデッキをLoadすると、全てciid=1になる
- ciid=2のカード画像が裏面になる

### 原因

1. **`extractImageInfo`の問題**: 同じcidで複数のciidがあっても、最後のciidで上書きされる
2. **`parseCardBase`の問題**: `imgs`配列に1つのciidしか含まれない
3. **`parseCardSection`の問題**: ciidごとに別レコードを作成していない

### 解決策

**HTMLの`<img>`タグから各ciidの枚数とimgHashを抽出**

1. **`extractCiidCounts`関数を追加**:
   - HTMLの`<img class="card_image_{type}_{index}_{ciid}">`タグを検索
   - Monster, Spell, Trap, Extra の全カードタイプに対応
   - JavaScriptから`cid`と`imgHash`（enc）を抽出
   - `cid → ciid → { count, imgHash }`のマップを生成

2. **`parseCardSection`関数を修正**:
   - ciid情報がない場合: 従来通り1レコード
   - 単一ciidの場合: 正しいciidとimgs配列を設定した1レコード
   - **複数ciidの場合: ciidごとに別レコードとして追加**
   - 各レコードに正しい`imgs: [{ ciid, imgHash }]`を設定

3. **`parseDeckDetail`関数を修正**:
   - `extractCiidCounts`を呼び出してciid情報を取得
   - 各セクション（main, extra, side）に渡す

### テスト

- **テストデッキ**: dno=8 (urls.mdに記載)
- **テストカード**: 灰流うらら (cid=12950)
  - ciid=1: 2枚
  - ciid=2: 1枚
- **確認項目**:
  - ✅ Load時に3レコード生成される（ciid=1×2, ciid=2×1）
  - ✅ ciid=2のカード画像が正しく表示される（裏面にならない）
  - ✅ 各レコードに正しいimgHashが設定される

### 実装ファイル

- `src/content/parser/deck-detail-parser.ts`
  - `extractCiidCounts` 関数追加 (+58行)
  - `parseCardSection` 関数修正 (+45行)
  - `parseDeckDetail` 関数修正 (+3行)

---

## 2025-11-17: v0.4.0 Phase 1基盤整備完了 - 設定ストア・USP実装

- **タイムスタンプ**: 2025-11-17 21:00
- **バージョン**: 0.3.7（Phase 1基盤完成）
- **ブランチ**: `feature/v0.4.0-foundation`

### 実装内容

#### 1. 設定ストアの作成

**ファイル**: `src/stores/settings.ts`, `src/types/settings.ts`

**機能**:
- ✅ 画像サイズ設定（4段階: small/medium/large/xlarge）
- ✅ テーマ設定（3種: light/dark/system）
- ✅ 言語設定（auto + 10言語: ja/en/ko/ae/cn/de/fr/it/es/pt）
- ✅ chrome.storage.local永続化
- ✅ リアルタイム適用（applyTheme, applyCardSize）

#### 2. USP（URL State Parameters）実装

**ファイル**: `src/utils/url-state.ts`

**機能**:
- ✅ URLパラメータ定義（dno/mode/sort/tab/ctab/detail/size/theme/lang）
- ✅ UI状態の双方向同期（syncUIStateToURL, restoreUIStateFromURL）
- ✅ 設定の双方向同期（syncSettingsToURL, restoreSettingsFromURL）
- ✅ ハッシュルーティング対応

#### 3. 統合状況

- ✅ `src/stores/deck-edit.ts`でURLStateManager使用
- ✅ `src/stores/deck-edit.ts`でuseSettingsStore使用
- ✅ テーマとカードサイズの動的適用実装済み

### 意義

**Phase 1完了条件を達成**:
- ✅ USP（URL State Parameters）による状態管理
- ✅ 画像サイズ4段階切り替え
- ✅ カラーテーマ3種（dark/light/system）
- ✅ 言語切り替え（10言語 + auto）

これにより：
1. ブックマーク可能なURL（設定含む全状態を保持）
2. リロード時の状態復元
3. URL共有による設定共有
4. ユーザー設定の永続化

が実現された。

---

## それ以前の履歴

詳細な履歴は `docs/_archived/tasks/done_before_2025-11-17.md` を参照してください。

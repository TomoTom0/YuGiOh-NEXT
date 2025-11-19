# v0.4.0開発 - 現状調査結果

## 調査日時
2025-11-15

## ブランチ情報
- 作業ブランチ: `feature/v0.4.0-foundation`
- ベースブランチ: `dev`
- 現在のバージョン: 0.3.2

## 実装順序計画

### Phase 1: 基盤整備（優先度：高）
1. USPでの制御と再現
2. 画像大きさ変更オプション
3. カラーテーマ選択
4. 言語を拡張機能内メニューから変更

### Phase 2: UI・データ管理（優先度：中）
5. デッキメタデータの編集
6. loadダイアログでの画像を含めた実用的な表示
7. デッキ編集画面でシャッフル、ソート、スクショボタン追加
8. 検索チャットでの高度な操作
9. import, export (csv, json, png)

### Phase 3: 検証機能（優先度：中～低）
10. 禁止制限順守確認on/off
11. 禁止制限リストの差分表示

---

## 現状の実装状況

### 1. USP（URL State Parameters）の状況

**実装済み:**
- `dno`パラメータのみ実装（`src/stores/deck-edit.ts:768`）
- デッキ番号を指定してロード可能
- 例: `#/ytomo/edit?dno=8`

**未実装（v0.4.0で必要）:**
- 表示モード（list/grid）
- ソート順
- カードタブ（info/qa/related/products）
- 画像サイズ
- テーマ
- 言語
- フィルター条件

**実装方針:**
- `URLSearchParams`を使用した双方向同期（現在と同じ方式）
- 状態変更時に自動的にURLを更新
- URLから状態を復元

**関連ファイル:**
- `src/stores/deck-edit.ts` - メインストア（URLパラメータ読み込み処理）
- `src/content/edit-ui/DeckEditLayout.vue` - レイアウトコンポーネント

---

### 2. 画像サイズの状況

**現在の実装:**

| 表示場所 | サイズ | CSS定義場所 |
|---------|--------|------------|
| デッキセクション（DeckCard） | 36px × 53px | `src/components/DeckCard.vue` |
| 検索結果リスト表示 | 36px幅（高さ自動） | `src/components/CardList.vue` |
| 検索結果グリッド表示 | 60px幅（高さ自動） | `src/components/CardList.vue` (.grid-view) |
| カード詳細（Info） | （要確認） | `src/components/CardInfo.vue` |

**v0.4.0の要件:**
- small（現在のlist: 36px）
- medium（現在のgrid: 60px）
- large（現在のinfo: 未確認）
- xlarge（新規追加: 未定義）

**実装方針:**
1. グローバル設定として画像サイズを管理（デフォルト: medium）
2. CSS変数を使用してサイズを動的に変更
3. オプション画面で設定可能
4. USPで状態を保存・復元

**必要な作業:**
- [ ] 設定ストアの作成（`src/stores/settings.ts`）
- [ ] CSS変数の定義（`--card-width`, `--card-height`）
- [ ] 各コンポーネントでCSS変数を使用するよう修正
- [ ] オプション画面に設定項目追加

**関連ファイル:**
- `src/components/DeckCard.vue`
- `src/components/CardList.vue`
- `src/components/CardInfo.vue`

---

### 3. カラーテーマの状況

**現在の実装:**
- CSS変数でテーマカラーを設定（`src/content/edit-ui/index.ts:88-90`）
- ハードコードされた値のみ:
  ```typescript
  --theme-gradient: linear-gradient(90deg, #00d9b8 0%, #b84fc9 100%)
  --theme-color-start: #00d9b8
  --theme-color-end: #b84fc9
  ```

**使用箇所:**
- `src/components/DeckEditTopBar.vue`
- `src/components/RightArea.vue`
- `src/components/CardDetail.vue`

**v0.4.0の要件:**
- ダークテーマ
- ライトテーマ
- システムテーマ（OSの設定に従う）

**実装方針:**
1. 設定ストアでテーマ管理（デフォルト: system）
2. テーマごとにCSS変数セットを定義
3. `prefers-color-scheme`メディアクエリでシステムテーマ検出
4. オプション画面 or ポップアップで切り替え可能
5. USPで状態を保存・復元

**必要な作業:**
- [ ] テーマ定義の作成（`src/styles/themes.ts`）
- [ ] テーマ適用ロジックの実装
- [ ] システムテーマ検出機能
- [ ] オプション画面に設定項目追加

**関連ファイル:**
- `src/content/edit-ui/index.ts`
- 全てのVueコンポーネント（CSS変数使用箇所）

---

### 4. 言語切り替えの状況

**実装済み:**
- 言語検出機能（`src/utils/language-detector.ts`）
- 10言語対応（ja, ko, ae, cn, en, de, fr, it, es, pt）
- 複数の検出方法:
  1. `#nowlanguage a.current`のhref属性
  2. `#nowlanguage`のテキスト
  3. metaタグのog:url
  4. URLパラメータ
  5. html lang属性

**未実装:**
- 拡張機能のUI内から言語を変更する機能
- 現在は公式サイトの言語設定に完全依存

**v0.4.0の要件:**
- 拡張機能内メニューから言語を変更できるようにする

**実装方針:**
1. 設定ストアで言語管理（デフォルト: auto検出）
2. オプション画面 or ポップアップで言語選択
3. 選択された言語でAPI呼び出し時に`request_locale`パラメータを付与
4. USPで状態を保存・復元
5. 拡張機能UI自体の多言語化（別タスク）

**課題:**
- 公式サイト側の言語設定との整合性
- API呼び出し時のlocale付与漏れ防止
- セッション管理への影響

**必要な作業:**
- [ ] 言語設定の永続化
- [ ] API呼び出し時のlocale付与ロジック
- [ ] オプション画面に言語選択UI追加
- [ ] 全APIエンドポイントの確認

**関連ファイル:**
- `src/utils/language-detector.ts`
- `src/api/*.ts`（全APIファイル）
- `src/options/App.vue`

---

### 5. オプション画面の状況

**現在の実装:**
- 機能のON/OFF切り替えのみ（`src/options/App.vue`）
- 管理している設定:
  - `deck-edit-screen.enabled`（独自デッキ編集画面）
  - `shuffle-sort.enabled`（シャッフル・ソート機能）
  - `deck-image.enabled`（デッキ画像作成機能）

**保存方法:**
- `chrome.storage.local`に`featureSettings`として保存

**v0.4.0で追加が必要な設定項目:**
- [ ] 画像サイズ（small/medium/large/llarge）
- [ ] カラーテーマ（dark/light/system）
- [ ] 言語（auto/ja/en/ko/...）
- [ ] 禁止制限順守確認（on/off）

**実装方針:**
1. 新しいタブ「Settings」を追加
2. 既存の「Omit and Usage」タブは使い方の説明に特化
3. 設定変更時に即座に`chrome.storage.local`に保存
4. ストアと連携して設定を適用

**関連ファイル:**
- `src/options/App.vue`
- `src/options/DeckEditSettings.vue`（現在未使用、v0.4.0で活用予定）

---

### 6. 既存機能の確認

**デッキ編集画面（`src/content/edit-ui/DeckEditLayout.vue`）:**
- [x] デッキロード・保存
- [x] カード検索（リスト/グリッド表示切り替え）
- [x] ドラッグ&ドロップ
- [x] カード詳細表示（Info/QA/Related/Products）
- [ ] シャッフル・ソート機能（公式デッキ表示ページのみ実装済み）
- [ ] スクショボタン（未実装）
- [ ] メタデータ編集（未実装）

**デッキ表示ページ（既存機能）:**
- [x] シャッフル・ソート・固定（`src/content/shuffle/`）
- [x] デッキ画像作成（`src/content/deck-recipe/`）

---

## 次のアクション

### 優先度1: 設定基盤の整備
1. 設定ストアの作成（`src/stores/settings.ts`）
2. オプション画面のSettings タブ作成
3. 設定の永続化とストアの連携

### 優先度2: USP実装
1. URLパラメータ仕様の設計
2. 双方向同期の実装
3. 各機能との連携

### 優先度3: 各機能の実装
1. 画像サイズ切り替え
2. テーマ切り替え
3. 言語切り替え
4. その他機能

---

## 技術的な注意事項

### Vueコンポーネント
- Vue 3 Composition APIを使用
- `<script setup>`構文が混在（徐々に移行中）
- Piniaでストア管理

### スタイリング
- Scoped CSS + CSS変数
- レスポンシブデザイン対応
- モバイル/デスクトップ切り替え

### ブラウザAPI
- Chrome Extension API（manifest v3）
- `chrome.storage.local`で設定管理
- Content Script + Background Script構成

### テスト
- Jest（単体テスト）
- Chrome CDP経由（E2Eテスト）
- Playwrightは使用不可（ログイン制約）

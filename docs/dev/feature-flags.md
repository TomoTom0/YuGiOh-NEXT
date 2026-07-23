# 機能フラグ一覧

`src/types/settings.ts` に定義される全設定項目（`FeatureSettings` / `AppSettings` / `UXSettings` / `DeckEditSettings`）を、以下の4分類で棚卸しする。

## 分類の定義

| 分類 | 意味 |
|---|---|
| ① デフォルトON、またはいずれかのモード | 最も多いはずの分類。常時使える機能、または複数モードから選択可能なもの |
| ② デフォルトOFF | 本番でも存在するが、UIから明示的にONにするまで使われない |
| ③ 開発でだけON | 本番ビルドではOFF、開発ビルド/環境でのみON |
| ④ 開発でもOFF | 実装はあるが現状は完全に眠っている（UI導線なし・未実装・孤立コード等） |

**重要**: 2026-07-23時点、リポジトリ全体に `NODE_ENV` / `import.meta.env` / `__DEV__` 等によるビルド分岐は一件も存在しない。したがって **③に該当する仕組み自体が現状存在しない**。③に分類すべき機能を作る場合は、まずこの分岐機構自体を新設する必要がある。

## featureSettings（`FeatureId`、`src/types/settings.ts:10-18,298-303`）

| キー | デフォルト | 分類 | UI |
|---|---|---|---|
| `shuffle-sort` | true | ① | `options/components/sections/ShuffleSection.vue` |
| `deck-image` | true | ① | `options/components/sections/ImageCreationSection.vue` |
| `deck-edit` | true | ① | `options/components/sections/CacheManagementSection.vue:44,90` |
| `chat` | **false** | **④** | なし。`toggleFeature('chat', ...)` の呼び出しはコード全体に存在しない。`RightArea.vue:144-146` で参照されチャットタブの表示可否に使われるのみ |

## appSettings（`src/types/settings.ts:192-265,348-378`）

| キー | デフォルト | 分類 | UI / 備考 |
|---|---|---|---|
| `deckEditCardSize`/`infoCardSize`/`gridCardSize`/`listCardSize` | L相当プリセット | ① | `UISettingsSection.vue` の `handlePresetChange`（4項目を束ねたプリセット選択） |
| `theme` | `system` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `language` | `auto` | **④** | UIは `options/DeckEditSettings.vue` にのみ存在するが、この**コンポーネント自体が `App.vue` から一切import/routeされておらず完全に孤立**（`src/options/App.vue:36-42`で登録されているのは`GeneralTab`/`DeckEditTab`/`DeckDisplayTab`のみ）。実質、どのUIからも変更不可 |
| `middleDecksLayout` | `vertical` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `enableBanlistCheck` | false | **④** | UIなし。コメント「禁止制限チェック有効化（Phase 3で使用）」の通り**未実装のプレースホルダー**。定義以外どこからも読み書きされない |
| `unsavedWarning` | `always` | ① | `UXSettingsSection.vue` |
| `showCardDetailInDeckDisplay` | true | ① | `DeckDisplayCardDetailSection.vue` |
| `deckDisplayCardImageSize` | `normal` | ① | `DeckDisplayTab.vue` / `SettingsDialog.vue` |
| `defaultSortOrder` | `release_desc` | ① | `UXSettingsSection.vue` |
| `enableCategoryPriority` | true | ① | `UXSettingsSection.vue` |
| `enableTailPlacement` | true | ① | `UXSettingsSection.vue` |
| `enableHeadPlacement` | true | **分類外** | UIなし。`useDeckCardSorter.ts`/`deck-edit.ts`等のソートロジックでは参照されるが、OFFにする手段がなく実質ハードコードの定数。①の実装が中途半端に終わった状態と思われる |
| `deckLevelSortOrder` | `toggle-desc` | ① | `UXSettingsSection.vue` |
| `dialogFontSize` | `m` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `searchUIFontSize` | `m` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `backgroundDeckInfoFetch` | true | ① | `UISettingsSection.vue` |
| `updateThumbnailWithoutFetch` | true | ① | `UISettingsSection.vue` |
| `saveDelayMs` | 0 | **分類外** | UIなし。`DeckEditTopBar.vue:415`で参照されるが変更手段がなく実質0固定 |
| `includeTimestampInExportFilename` | true | ① | `SettingsDialog.vue:203,210` |
| `saveWithAutoFullSort` | true | **分類外** | UIなし。`DeckEditTopBar.vue`で参照されるが変更手段がなく実質true固定 |
| `aiApiKey` | 未設定 | **④** | 入力UIなし。`chat`機能（④）専用の値で、chatが到達不能な現状は事実上無意味 |
| `categoryPrioritySortMode` | `level` | ① | `UXSettingsSection.vue` |
| `practiceCardSize` | `small` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `practiceCardSize2P` | `small` | ① | `SettingsDialog.vue:128`（`UISettingsSection.vue`には無いが`SettingsDialog.vue`にあり） |

### ux.*（`UXSettings`、`src/types/settings.ts:156-187,319-343`）

| キー | デフォルト | 分類 | UI |
|---|---|---|---|
| `searchInputPosition` | `right-top` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `defaultSearchMode` | `auto` | ① | `UXSettingsSection.vue` |
| `enableMouseOperations` | **false** | **②** | `UXSettingsSection.vue:104`（`v-model`で直接ON/OFF可能）。**リポジトリ内で確認できた唯一の純粋な②の例** |
| `changeFavicon` | true | ① | `CacheManagementSection.vue:14` |
| `keyboardShortcuts` | 既定ショートカット3種 | ① | `UXSettingsSection.vue`（登録・削除UIあり） |
| `cardListViewMode` | 全セクション`grid` | ① | `UISettingsSection.vue` |
| `rightAreaWidth` | `L` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `rightAreaFontSize` | `l` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |

## deckEditSettings（`DeckEditSettings`型、`src/types/settings.ts:104-110,308-314`）

**ブロック全体が④（完全に孤立・未使用）**。`enabled` / `defaultDisplayMode` / `defaultSortOrder` / `enableAnimation` / `language` の5項目全て。

- 唯一のUIである `src/options/DeckEditSettings.vue` は `App.vue` から一切参照されず、孤立ファイルとして残存
- ストアの `deckEditSettings` フィールドを読み書きする箇所は `src/types/settings.ts` / `src/stores/settings.ts`（型定義・デフォルト値のみ）以外に存在しない
- `appSettings` 側に同種の設定（`defaultSortOrder`、`ux.*`等）が既に存在しており、こちらが実質的な後継と思われる

## フラグの概念に馴染まないもの（分類対象外・参考記載）

これらは真偽値のON/OFFフラグではなく、常時利用可能な画面モードやハードコードされた機能のため、上記4分類には当てはめない。

- **Practice mode**: `DeckEditLayout.vue:263` のローカルref（`practiceMode`）で管理される画面モード切り替え。永続化された設定ではなく、無効化する手段もない
- **GENESYSレギュレーション判定・デッキ名@変数入力・レギュレーションタグ補完**（TASK-287/289で実装）: 対応するフラグが存在せず常時有効。ON/OFFの概念自体が導入されていない

## 既知の課題

- `chat` を有効化するUI導線が存在しない（④のまま塩漬け）
- `enableHeadPlacement` / `saveDelayMs` / `saveWithAutoFullSort` は型・デフォルト値はあるがUIがなく、①でも④でもない中途半端な状態
- `language`（`appSettings.language`）・`deckEditSettings`一式は、UIコンポーネント自体（`DeckEditSettings.vue`）が孤立しており誰からも到達できない
- ③（開発限定ON）を実現する仕組み（webpackのDefinePlugin、`NODE_ENV`分岐等）がリポジトリに一切存在しない

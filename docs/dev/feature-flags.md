# 機能フラグ一覧

`src/types/settings.ts` に定義される全設定項目（`FeatureSettings` / `AppSettings` / `UXSettings`）を、以下の4分類で棚卸しする。

> 2026-07-23の初回棚卸しで見つかった「未整備な状態」（孤立コード・UI未実装の中途半端な設定）はTASK-293で解消済み。当初④に分類していた項目のうち、削除したもの・UIを追加して①に昇格させたものは表中に反映済み。詳細は本ドキュメント末尾の「解消履歴」を参照。

## 分類の定義

| 分類 | 意味 |
|---|---|
| ① デフォルトON、またはいずれかのモード | 最も多いはずの分類。常時使える機能、または複数モードから選択可能なもの |
| ② デフォルトOFF | 本番でも存在するが、UIから明示的にONにするまで使われない |
| ③ 開発でだけON | 本番ビルドではOFF、開発ビルド/環境でのみON |
| ④ 開発でもOFF | 実装はあるが現状は完全に眠っている（UI導線なし・未実装・孤立コード等） |

**重要**: 2026-07-23時点、リポジトリ全体に `NODE_ENV` / `import.meta.env` / `__DEV__` 等によるビルド分岐は一件も存在しない。したがって **③に該当する仕組み自体が現状存在しない**。③に分類すべき機能を作る場合は、まずこの分岐機構自体を新設する必要がある。

## featureSettings（`FeatureId`、`src/types/settings.ts:10-18,287-292`）

| キー | デフォルト | 分類 | UI |
|---|---|---|---|
| `shuffle-sort` | true | ① | `options/components/sections/ShuffleSection.vue` |
| `deck-image` | true | ① | `options/components/sections/ImageCreationSection.vue` |
| `deck-edit` | true | ① | `options/components/sections/CacheManagementSection.vue:44,90` |
| `chat` | **false** | **④** | なし。`toggleFeature('chat', ...)` の呼び出しはコード全体に存在しない。`RightArea.vue:144-146` で参照されチャットタブの表示可否に使われるのみ |

## appSettings（`src/types/settings.ts:184-255,326-357`）

| キー | デフォルト | 分類 | UI / 備考 |
|---|---|---|---|
| `deckEditCardSize`/`infoCardSize`/`gridCardSize`/`listCardSize` | L相当プリセット | ① | `UISettingsSection.vue` の `handlePresetChange`（4項目を束ねたプリセット選択） |
| `theme` | `system` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `language` | `auto` | **④** | UIなし。`mapping-manager.ts:520-521`でマッピング言語の強制指定に使われ、URLパラメータ（`urlSettings.lang`、`deck-edit.ts:1419`）経由でのみ設定可能。設定画面からは到達不可のまま（旧UIだった`options/DeckEditSettings.vue`はTASK-293で削除済み） |
| `middleDecksLayout` | `vertical` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `unsavedWarning` | `always` | ① | `UXSettingsSection.vue` |
| `showCardDetailInDeckDisplay` | true | ① | `DeckDisplayCardDetailSection.vue` |
| `deckDisplayCardImageSize` | `normal` | ① | `DeckDisplayTab.vue` / `SettingsDialog.vue` |
| `defaultSortOrder` | `release_desc` | ① | `UXSettingsSection.vue` |
| `enableCategoryPriority` | true | ① | `UXSettingsSection.vue` |
| `enableTailPlacement` | true | ① | `UXSettingsSection.vue` |
| `enableHeadPlacement` | true | ① | `UXSettingsSection.vue`（TASK-293でUI追加、`enableTailPlacement`の直下に配置） |
| `deckLevelSortOrder` | `toggle-desc` | ① | `UXSettingsSection.vue` |
| `dialogFontSize` | `m` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `searchUIFontSize` | `m` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `backgroundDeckInfoFetch` | true | ① | `UISettingsSection.vue` |
| `updateThumbnailWithoutFetch` | true | ① | `UISettingsSection.vue` |
| `saveDelayMs` | 0 | ① | `UXSettingsSection.vue`「保存設定」（TASK-293でUI追加、0〜5000msのレンジスライダー） |
| `includeTimestampInExportFilename` | true | ① | `SettingsDialog.vue:203,210` |
| `saveWithAutoFullSort` | true | ① | `UXSettingsSection.vue`「保存設定」（TASK-293でUI追加） |
| `aiApiKey` | 未設定 | **④** | 入力UIなし。`chat`機能（④）専用の値で、chatが到達不能な現状は事実上無意味 |
| `categoryPrioritySortMode` | `level` | ① | `UXSettingsSection.vue` |
| `practiceCardSize` | `small` | ① | `UISettingsSection.vue` / `SettingsDialog.vue` |
| `practiceCardSize2P` | `small` | ① | `SettingsDialog.vue:128`（`UISettingsSection.vue`には無いが`SettingsDialog.vue`にあり） |

### ux.*（`UXSettings`、`src/types/settings.ts:148-179,297-321`）

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

## フラグの概念に馴染まないもの（分類対象外・参考記載）

これらは真偽値のON/OFFフラグではなく、常時利用可能な画面モードやハードコードされた機能のため、上記4分類には当てはめない。

- **Practice mode**: `DeckEditLayout.vue:263` のローカルref（`practiceMode`）で管理される画面モード切り替え。永続化された設定ではなく、無効化する手段もない
- **GENESYSレギュレーション判定・デッキ名@変数入力・レギュレーションタグ補完**（TASK-287/289で実装）: 対応するフラグが存在せず常時有効。ON/OFFの概念自体が導入されていない

## 既知の課題

- `chat`は**意図的な方針として、devビルドを含め現時点では無効にしている**（④）。UI導線が存在しないのはこの方針の結果であり、原因ではない——「UIを整備し忘れたから無効」ではなく「無効にすると決めているのでUIを作っていない」。`services/llm/*`・`ChatPanel.vue`等の実装自体は存在するが、公開準備が整うまでは対応不要
- `language`（`appSettings.language`）はUIから到達不可のまま（URLパラメータ経由のみ）。設定画面へのUI追加を検討の余地あり
- `enableBanlistCheck`（Phase 3向け未実装プレースホルダー）はroadmapにも記載がなく実装0件だったため、TASK-293で型定義ごと削除した。実装に着手する際は改めて型を追加すること
- ③（開発限定ON）を実現する仕組み（webpackのDefinePlugin、`NODE_ENV`分岐等）がリポジトリに一切存在しない

## 解消履歴

**TASK-293（2026-07-23）**: 初回棚卸しで見つかった「未整備な状態」を解消。

- `DeckEditSettings`型・`DEFAULT_DECK_EDIT_SETTINGS`・`StorageSettings.deckEditSettings`・`src/options/DeckEditSettings.vue`（`App.vue`から未routeの孤立コンポーネント）・対応する`utils/settings.ts`の`loadDeckEditSettings`/`saveDeckEditSettings`・関連テストを削除
- `enableBanlistCheck`（未実装のPhase 3プレースホルダー、参照0件）を削除
- `enableHeadPlacement` / `saveDelayMs` / `saveWithAutoFullSort` に `UXSettingsSection.vue` でUIを追加し、①へ昇格

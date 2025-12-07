以下の通り、`SearchInputBar.vue` のリファクタリング提案書、実装ロードマップ、設計ガイドラインを作成しました。

このコンポーネントは「God Component（神クラス）」の状態にあり、**UI表示**、**入力制御**、**ドメインロジック（コマンド解析）**、**データ定義**が混在しています。これらを責務ごとに分離することがリファクタリングの主眼となります。

---

# 1. リファクタリング提案書

## アーキテクチャ概要

現在の巨大なコンポーネントを「ロジック（Composable）」と「表示（UI Components）」に明確に分離します。
`SearchInputBar.vue` は、これらのComposableと子コンポーネントを統括する「Controller / Orchestrator」としての役割に専念させます。

## ディレクトリ構造の提案

`src/components/search/` ディレクトリを作成し、関連ファイルをここに集約することを推奨します。

```
src/
├── components/
│   └── search/
│       ├── SearchInputBar.vue       (メインコンポーネント：エントリーポイント)
│       ├── SearchModeSelector.vue   (検索モード切り替えドロップダウン)
│       ├── SearchFilterChips.vue    (フィルターアイコン・チップの表示・削除)
│       ├── CommandSuggestionList.vue (スラッシュコマンド候補のリスト表示)
│       └── FilterSuggestionList.vue  (コマンド選択後の値候補リスト表示)
│
├── composables/
│   └── search/
│       ├── useSlashCommands.ts      (コマンド解析、バリデーション、候補抽出)
│       ├── useSearchFilters.ts      (フィルター状態管理、チップ操作、アイコン変換)
│       ├── useSearchInput.ts        (入力ハンドリング、キーボードナビゲーション)
│       └── useFilterOptions.ts      (フィルター選択肢データの提供・動的生成)
│
└── constants/
    └── search-constants.ts          (COMMANDS定義、固定のFILTER_OPTIONSなど)
```

## 切り出し候補と責務定義

### A. Composables (ロジック層)

| Composable名 | 責務・機能 |
| :--- | :--- |
| **`useSlashCommands`** | ・`/` で始まるコマンドの解析 (`parseCommand`)<br>・現在入力中のコマンド判定 (`pendingCommand`)<br>・コマンドの有効性チェック (`isValidCommandInput`)<br>・コマンド候補のフィルタリングロジック |
| **`useSearchFilters`** | ・`searchFilters` および `filterChips` の状態管理<br>・フィルターの追加・削除・全クリア処理<br>・フィルターからアイコン表示用データへの変換 (`convertFiltersToIcons`) |
| **`useFilterOptions`** | ・膨大な `FILTER_OPTIONS` 定義の管理<br>・動的な選択肢生成（現在の日付や逆引きマップの利用）<br>・多言語対応のマッピング解決 |
| **`useSearchInput`** | ・テキスト入力イベントのハンドリング<br>・キーボード操作（↑↓Enter Escape）による候補選択の管理<br>・フォーカス制御 |

### B. UI Components (プレゼンテーション層)

| コンポーネント名 | 責務・機能 |
| :--- | :--- |
| **`SearchFilterChips`** | ・適用済みフィルター（アイコン）と入力中チップの描画<br>・削除ボタンのクリックイベント発火<br>・ツールチップ表示 |
| **`SearchModeSelector`** | ・「自動/カード名/テキスト...」のモード表示と切り替え<br>・ドロップダウンの開閉制御 |
| **`CommandSuggestionList`** | ・`/` 入力時のコマンド候補一覧の描画<br>・選択イベントの発火 |

---

# 2. 実装ロードマップ

リスクを最小限に抑えるため、**「定数の分離」→「ロジックの分離」→「UIの分離」** の順で進める 4フェーズ構成を提案します。

### Phase 1: 定数と静的データの分離 (工数目安: 0.5日)
**目的**: ファイルサイズを即座に削減し、ロジック分離の準備をする。
- [ ] `src/constants/search-constants.ts` を作成し、`COMMANDS` 定数を移動。
- [ ] `src/constants/filter-options.ts` (または `useFilterOptions.ts`) に `FILTER_OPTIONS` を移動。
- [ ] `SearchInputBar.vue` から上記をインポートして利用する形に変更。
- **リスク**: 低。単純な移動のみ。

### Phase 2: コアロジックのComposable化 (工数目安: 1.5日)
**目的**: 複雑なロジックをテスト可能な単位に切り出す。
- [ ] **Step 1**: `useFilterOptions.ts` の実装。ハードコードされた選択肢を外部化。
- [ ] **Step 2**: `useSlashCommands.ts` の実装。`pendingCommand`, `isValidCommandInput` などの計算ロジックを移動。
- [ ] **Step 3**: `useSearchFilters.ts` の実装。チップ管理とフィルター操作ロジックを移動。
- **リスク**: 中。リアクティブな依存関係（ref/computed）が壊れないよう注意が必要。
- **検証**: 既存のユニットテストがあれば実行。なければ主要機能（コマンド補完、フィルタ追加）の手動テスト。

### Phase 3: UIコンポーネントの分割 (工数目安: 1.0日)
**目的**: Templateの可読性を向上させ、再レンダリング範囲を最適化する。
- [ ] `SearchFilterChips.vue` の作成と置き換え。
- [ ] `SearchModeSelector.vue` の作成と置き換え。
- [ ] 候補リスト部分（`CommandSuggestionList`, `FilterSuggestionList`）のコンポーネント化。
- **リスク**: 低〜中。CSS（SCSS）のスコープ移行に注意。`scoped` CSSの調整が必要になる可能性。

### Phase 4: 統合とクリーンアップ (工数目安: 0.5日)
**目的**: リファクタリングの完了と品質担保。
- [ ] `SearchInputBar.vue` 内の不要なコード削除。
- [ ] 型定義の整理（`src/types/` への移動）。
- [ ] 簡易的なユニットテストの追加（特に `useSlashCommands` のバリデーションロジック）。

---

# 3. 設計ガイドライン

本プロジェクトにおける今後の開発およびリファクタリングで遵守すべきガイドラインです。

### 命名規則 (Naming Convention)
- **Composables**: `use` プレフィックスを必須とする（例: `useSlashCommands`）。
- **Event Handlers**: `handle` プレフィックスを使用する（例: `handleSearch`, `handleChipRemove`）。
- **Boolean State**: `is`, `has`, `show` などの動詞/助動詞で始める（例: `isCommandMode`, `hasActiveFilters`）。

### ファイル配置と構造 (File Structure)
- **Colocation**: コンポーネント固有のサブコンポーネントは、親コンポーネントと同階層または専用のサブディレクトリ（`components/search/`など）に配置する。汎用コンポーネント（`src/components/common/`）とは区別する。
- **Constants**: 50行を超える静的な定数定義（マッピングテーブルなど）は、コンポーネント内に置かず `src/constants/` または別ファイルに切り出す。

### インターフェース設計の原則 (Interface Design)
- **Props Down, Events Up**: 子コンポーネントは可能な限り「状態を持たない（Stateless/Dumb）」設計とする。親からデータを `props` で受け取り、操作は `emit` で親に依頼する。Piniaストアへの直接アクセスは、可能な限り親コンポーネント（Container）または特定のComposableに限定する。
- **Composableの戻り値**: 明示的に型定義を行い、何が公開されているかを明確にする。内部状態（private state）は `return` に含めない。

### 後方互換性と安全性
- **単体テスト**: 特に `useSlashCommands` のような「文字列解析ロジック」は、バグが入り込みやすいため、切り出し時に必ずJest/Vitest等のユニットテストを作成する。
- **CSSの移行**: Vueの `scoped` スタイルを使用している場合、コンポーネント分割によってスタイルが当たらなくなることがあるため、`:deep()` セレクタの利用やクラス設計の見直しを行う。

---

この提案に基づき、まずは **Phase 1（定数の外部ファイル化）** から着手されることを推奨します。これだけでも可読性が大幅に向上します。

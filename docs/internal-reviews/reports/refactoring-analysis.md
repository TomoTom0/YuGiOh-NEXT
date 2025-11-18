# リファクタリング分析レポート

**作成日時**: 2025-11-18
**対象**: PR #10 マージ後のコードベース (v0.3.10 → v0.3.11)

## 概要

対象ファイル群を点検した結果、保守性と型安全性の観点で複数の改善余地が確認されました。特に `src/stores/deck-edit.ts` と `src/components/DeckMetadata.vue` の単一ファイル肥大化、並びにユーティリティの責務混在が目立ちます。本レポートは優先度を付けた改善候補と具体的な実施方針を示します。

---

## 主要な問題点（要点）

- 単一責務の逸脱: `src/stores/deck-edit.ts` にドメインロジック、UI向けの displayOrder 管理、アニメーション実装（FLIP）などが混在している。
- 大型コンポーネント: `src/components/DeckMetadata.vue`（約1,000行）や `RightArea.vue` が UI、DOM操作、位置計算、データ取得を混在させている。
- パーサ/フォーマッタの散在: `src/utils/deck-import.ts` / `src/utils/deck-export.ts` に複雑なフォーマット処理が実装されており、エラー処理や警告生成の一貫性が低い。
- 型の不整合: `src/types/settings.ts` の `SortOrder` 等の定義と、各所で使われているソートキー（例: `release_desc`, `name_asc` 等）が一致していない箇所がある。
- 低レイヤ（PNG）の処理が複雑: `src/utils/png-metadata.ts` はPNGチャンク処理とCRC実装を直接行っており、テスト・保守が難しい。

---

## 優先度付き改善候補

高 (🔴) — まず対処すべき

- ストア分割: `deck-edit` を「ドメイン(store)」「display-order/composable」「アニメーション(composable)」に分割する。
- 型・定数の正規化: `SortOrder` 等を一箇所に定義し、UI側はその正準値を使う（もしくは変換層を追加）。

中 (🟡)

- CSV/TXTパーサの一本化: `src/utils/parsers/` 下にパーサ実装をまとめ、`deck-import` は薄いディスパッチにする。
- Dropdown ロジックの共通化: 外側クリックや位置調整を `useDropdown()` のような composable にまとめる。

低 (🟢)

- `png-metadata` に対するユニットテスト追加と防御的検証を行う。
- コードスタイル・文字列メッセージの中央化（i18n 準備）

---

## 具体的提案（実施方針）

1. テストの追加: まず `deck-import` と `png-metadata` にユニットテストを追加して現在の挙動を固定化する。これにより後続のリファクタリングで回帰を防げます。

2. パーサ抽出: `src/utils/parsers/deck-parser.ts` を作り、CSV/TXT の解析ロジックを移す。`importDeckFromFile()` はファイル種別判定とパーサ呼び出しのみを行う。

3. display-order の分離: `useDisplayOrder()` composable を作り、`deck-edit` ストアから純粋な配列操作ロジック（add/remove/reorder/sort 等）を移動する。DOM依存のアニメーションは移さない。

4. FLIP アニメーション分離: アニメーションは `useFLIPAnimation()`（コンポーネント側で利用）に移し、ストア側は「事前の位置取得 → 状態更新 → アニメーション呼び出し」のトリガーだけを提供する。

5. 小分けの PR で段階的に実施: 破壊的変更が発生しないよう、まずはテスト＋parser抽出→次に display-order の移行→最後に store 分割 の順で行う。

---

## 短期アクション（今すぐできること）

- `src/types/settings.ts` の `SortOrder` 定義を現行利用文字列に合わせて確認・修正する（または変換ユーティリティを追加）。
- `docs/internal-reviews/reports/refactoring-analysis.md` を作成（本ファイル）。

---

## 補足（実施時の注意点）

- 既存の動作を壊さないことを最優先に段階的に行う。
- PNG埋め込みは外部仕様（tEXtチャンク）に依存するため、互換性・サイズの観点から回帰テストを入念に行う。

---

必要であれば、上記の改善候補から優先度順に実際のパッチ（分割ファイル・composable のスケルトン・テスト）を作成します。どの項目から着手しますか？


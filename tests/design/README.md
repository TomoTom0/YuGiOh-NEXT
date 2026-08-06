# tests/design/ — conditions.toml 展開計画

## 背景

TASK-319で判明した問題: `docs/api/deck-detail-parser.md`にAIが実装から推測して書いた仕様記載に誤りがあり（例: モンスター/魔法/罠3セクションを「必須」と誤記載、実際は任意）、それを信じてテストを書くと「推測を推測で検証する」循環に陥っていた。

対策として、実装コード（一次情報）を人（AI含む）が直接読み、分岐・throw文・返り値を転記した`conditions.toml`を検証対象ファイルごとに作成し、テストは`[covers:<id>]`タグでこの条件をカバーしたことを明示する。試作として`tests/design/deck-detail-parser/conditions.toml`を作成済み（856行の実装から73条件、TASK-319）。

このREADMEは、src/配下219実装ファイル（下記「対象範囲の現状」参照。試作済みのdeck-detail-parser.tsを含む）のうち、残り218ファイルへの展開計画を定める。TASK-321で作成、TASK-322でcodexレビュー済み（指摘反映はTASK-324）。母数219は`find src -type f \( -name "*.ts" -o -name "*.vue" \) | grep -v -E '\.test\.|\.spec\.|__tests__'`の出力に基づく（このコマンドの再実行で常に検証可能）。

## 対象範囲の現状

```
src/ 実装ファイル: 219 (*.test.ts等のテストファイルは除く。型定義ファイルは含む＝下記types/19のうちロジックを持たないものはTier対象外として扱う)
  components/    57
  utils/         53
  content/       24
  composables/   20
  types/         19  ← ロジックを持たない型定義のみなら対象外
  options/       15
  services/       8
  api/            7
  stores/         6
  constants/      5  ← ロジックを持たない定数のみなら対象外
  styles/,popup/,config/,background/ 各1
```

全ファイルへの展開は非現実的な工数（試作1ファイル=856行で73条件、相応の読解時間を要した）。優先順位付けと機械抽出の併用で工数を抑える。

## 1. 優先順位基準

以下の順で階層化する。同一階層内はファイルサイズ（行数）が大きい＝分岐が多いものを優先。

### Tier A（最優先）: 「推測混入リスクが高い」かつ「バグ影響が大きい」

ディレクトリ単位だけでなく、以下の**性質基準**のいずれかに該当するファイルをTier Aとする（ディレクトリ横断で判定する）:

- 既存テストが `docs/api/*.md` や記憶ベースで書かれている疑いのあるファイル（= 一次情報を読み直さずに書かれた可能性があるもの）
- `tests/README.md`記載の「重要なテスト対象」関連ファイル: 型ガード(`type-guards.ts`)、DOM操作(`safe-dom-query.ts`)、デッキimport/export、PNG metadata、URL state、シャッフル
- パーサー系(`content/parser/*`)・API系(`api/*`)・store系(`stores/*`): 分岐が多く、誤りがユーザーに直接影響する
- **外部I/O・永続化・キャッシュを伴うファイル**: `chrome.storage`/`localStorage`/IndexedDB操作、外部fetch（`src/services/`, `src/background/`含む）— 失敗時の挙動が推測で書かれやすく実データで壊れやすい
- **非同期処理・リトライ・競合状態を含むファイル**: Promise chain、リトライロジック、レースコンディション対策コード
- **データ破壊を伴う処理**: デッキ削除・上書き・マイグレーション等、誤りが不可逆な影響を与える処理
- **権限・設定判定を伴うファイル**: `src/config/`、機能フラグ判定

行数降順は同一階層内の着手順を決める補助指標に留め、変更頻度・過去の障害履歴（tm closed/doneの中の「バグ」「修正」系タスクが指す実装）・外部依存の有無を優先指標とする。

対象ディレクトリ目安: `src/content/parser/`, `src/api/`, `src/stores/`, `src/services/`, `src/background/`, `src/config/`, `src/utils/`のうちdeck-import/export・png-metadata・url-state・deck-cache・unified-cache-db等の中核ユーティリティ

### Tier B: ロジックを持つがTier Aほど影響範囲が広くない

- `src/composables/`（Vue composable、状態管理ロジックあり）
- `src/utils/`の残り（フォーマッタ・変換系等、局所的なロジック）
- `src/content/`の残り（DOM操作系だがparser以外）
- `src/services/`のうち、上記Tier A性質基準（外部I/O・永続化・非同期リトライ等）に該当しないもの

### Tier C: 低優先

- `src/components/`, `src/options/components/`: Vueコンポーネントは大半がtemplate/表示ロジックで、条件分岐は限定的。ロジックを持つ`<script setup>`部分のみ対象とし、templateのv-if等は「表示条件」として簡潔に記載する程度に留める
- `src/popup/`

### 対象外（conditions.toml不要）

- `src/types/`: 型定義のみでロジックを持たないファイルは対象外。型ガード関数(`type-guards.ts`)のような実行時ロジックを含むものはTier A
- `src/constants/`: 定数定義のみのファイルは対象外
- `src/styles/`, `shims-vue.d.ts`

## 2. 条件粒度の基準

過剰な分岐列挙（trivialなnull連鎖チェック等の機械的網羅）を避け、以下を条件として書き出す:

- **書く**: 意味のある分岐（throw条件、早期return、異なる返り値を生む条件分岐、副作用の有無が変わる条件、デフォルト値のフォールバック）
- **書く**: 「入力Aの場合はBを優先しCは無視する」のような優先順位・排他条件
- **書かない**: 型システムで保証済みの分岐（TypeScriptのnarrowingで到達不能なelse等）
- **書かない**: 単純なgetter/setterやprops受け渡しのみのVueコンポーネント全体
- **書かない**: ログ出力のみで、返り値・副作用・処理継続の有無に差が無い分岐（例: 単なる`console.debug`呼び出し）
- **書く**: ログ出力を伴うが、その後に行を捨てる／処理をスキップする／異なる値を返す等、返り値や副作用に差が生じる分岐（例: `console.error`後に該当データを結果から除外する等）。ログの有無ではなく、その前後で挙動が分岐するかどうかで判断する

（TASK-322のcodexレビューで、旧基準「ログ出力のみの分岐は書かない」は`console.error`後にデータを破棄する分岐まで除外してしまう危険な表現だったため修正）

目安: deck-detail-parser.tsの実績（856行/73条件 ≈ 12行に1条件）はDOM検証+パース処理という分岐密度が高いファイルの数値であり、他ファイルでそのまま目標値にはしない。ファイルの性質（分岐密度）に応じて可変とし、無理に条件数を稼がない。

## 3. 機械抽出（AST解析）との役割分担

TASK-319での確認事項: AST解析で機械的に作れるのは以下の骨格まで。

- throw文の一覧（メッセージ文字列付き）
- 早期return（ガード節）の一覧
- 関数引数のデフォルト値
- switch/case、単純なif-elseの分岐点リスト

これらは**下書き（骨格）**として自動生成し、人（AI）が以下を追記する形にする（AST単体では条件のgiven/expectの意味付けができないため）:

- 分岐に至る具体的な`given`条件（どんな入力・状態のときか）
- 複合条件（`&&`/`||`の組み合わせ、ループ内条件、非同期処理の競合条件等）の意味
- `expect_throw`/`expect_return`/`expect_no_throw`等の期待値

TASK-322のcodexレビューで「導入要否を後で判断」では219ファイル展開時の抜け（TASK-324で判明したhead/body要素なしthrowの条件化漏れ等）を防げないと指摘された。そのため、Phase 2（Tier A展開）着手前に、最低限以下の機械抽出をスクリプト化する:

- 対象ファイルのexport関数一覧
- 各関数内のthrow文・return文・if/switch分岐点の一覧（骨格のみ、given/expectは付けない）
- `conditions.toml`の`target_function`に存在するが、実装側のexport関数一覧には対応する条件が1件も無いもの（条件化漏れの検出）

このスクリプトはTASK-323（展開実行）着手前に用意し、各ファイルの`conditions.toml`作成後に実行して「throw文はあるが条件化されていない」等の抜けを機械的に検出する運用とする。

## 4. 検証タイミングと方法

条件を書いただけでは「実装から読み取った条件」の正しさが担保されない（AIの誤読リスクは残る）。以下の手順で検証する。

1. 対象ファイルの`conditions.toml`を作成（実装コードを直接読んで転記、docs/*.mdは参照しない）
2. 既存テストに`[covers:<id>]`タグを付与、または不足分を新規テストとして追加
3. `tests/sample/`・`tests/combine/data/`の実HTML/実データ、またはユニットテストのfixtureで実際にテストを実行し、`expect_throw`/`expect_return`等が実装の実挙動と一致することを確認する（推測で書いた場合はここで不一致が検出される）
4. 全件PASSしたファイルのみ「検証済み」とし、`conditions.toml`の`[meta]`に検証情報を追記する運用とする

TASK-322のcodexレビューで、`verified = true`という単一フラグ（ファイル単位・手動運用）は「タグだけ付けて検証済みと自称できてしまう」弱点を指摘された。そのため`[meta]`には以下を記録する:

```toml
[meta]
feature = "..."
source_file = "src/..."
verified = true
verified_at = "2026-08-05"       # 検証を実施した日付
verified_by = "claude" | "human" | "codex"  # 誰が検証したか
test_command = "mise run test:vitest -- tests/unit/parser/deck-detail-parser.test.ts"  # 実行して全件PASSしたコマンド
source_hash = "<git blob hashやcommit hash等>"  # 検証対象にした実装のバージョン。以降このハッシュから実装が変わっていれば再検証が必要と判断できる
```

さらに、3節のAST抽出スクリプトによる「未カバーtarget_function検出」と、`[covers:<id>]`タグが実際に全conditionを網羅しテストがPASSしているかのチェックを、Phase 2着手前にCI（`mise run test:vitest`実行フロー、またはlint相当のチェックスクリプト）に組み込む。これが無い間は`verified = true`は自己申告に留まる点に留意する。

DOM構造に依存しないロジック（純粋関数のutils等）は該当するユニットテストの実行のみで足り、HTML fixtureは不要。

## 5. 進め方（フェーズ）

| フェーズ | 内容 | 対象 |
|---|---|---|
| Phase 0（完了） | 試作・手法確立 | deck-detail-parser.ts |
| Phase 1（完了） | TASK-321計画のcodexレビュー | 本ドキュメント + Phase 0成果物 |
| Phase 1.5（完了） | codex指摘の反映（TASK-324）+ AST骨格抽出スクリプトの最小実装（TASK-325） | 本ドキュメント・試作conditions.toml・`scripts/design/extract-ast-skeleton.ts` |
| Phase 1.6（完了） | Tier A候補から3ファイルを試行し、粒度・検証フロー・AST抽出の有効性を再調整（TASK-326） | `tests/design/forbidden-limited/`, `tests/design/url-state/`, `tests/design/card-detail/` |
| Phase 2 | Tier A本展開 | parser/api/stores/services(外部I/O系)/background/config/中核utils |
| Phase 3 | Tier B展開 | composables/残りutils/content |
| Phase 4 | Tier C展開（必要な範囲のみ） | components（script setupのロジック部分のみ） |

codexレビューの結論（TASK-322）: 「この計画のまま全体展開に入るのはまだ早い。母数修正・coverage/verifiedの自動検査・AST骨格抽出の最小実装・試作conditionsの抜け修正を済ませ、その後Tier Aを数ファイルだけ追加試行して粒度を再調整する進め方が安全」。Phase 1.5/1.6はこの指摘を反映したステップ。

Tier C（Vueコンポーネント57+15ファイル）は工数対効果が低いため、全件展開ではなく「過去にバグが出た/複雑な条件分岐を持つコンポーネントのみ」に絞る運用とする。展開要否はTier A/B完了後に改めて判断する。

各Phase完了時、TASK-323（展開実行）側で進捗をtmに記録し、次ファイルに着手する前にPhase内の優先順位（性質基準→ファイルサイズ降順）を`tm get`のbodyに残す。

### Phase 1.6の知見（TASK-326）

API系(`src/api/forbidden-limited.ts`, 209行)・utils中核でクラス実装のもの(`src/utils/url-state.ts`, 166行)・store系(`src/stores/card-detail.ts`, 158行)の3ファイルでconditions.toml作成→テストへの`[covers:<id>]`付与→実行という一連の流れを試行し、以下が判明した。

- **AST抽出スクリプトの検出漏れをこの試行で発見・修正した**: Phase1.5時点の実装はトップレベルの`export function`宣言しか検出できず、`url-state.ts`のようなクラスstaticメソッド（`export class Foo { static bar() {} }`）は0件として検出していた。TASK-326でexportクラスの各メソッド（static/instance）とexport const代入のアロー関数/関数式も検出するよう拡張した（`scripts/design/extract-ast-skeleton.ts`）。
- **Piniaストアの検出漏れはTASK-319で解消した**: Phase1.6時点では`defineStore(id, () => { const foo = () => {...}; return {foo} })`パターン（Setup Store）で、`defineStore(...)`の戻り値がCallExpressionであるため公開される各アクションを検出できなかった（`card-detail.ts`で実証、0件検出）。TASK-319で`extract-ast-skeleton.ts`にPinia Setup Store対応を追加し、`defineStore`のfactory関数内でローカル定義されreturnオブジェクトで公開される関数を`useFooStore#actionName`として検出できるようにした（`src/stores/`配下6ファイル全てSetup Store形式であることを確認済み）。`card-detail.ts`のconditions.tomlの`target_function`もこの形式に合わせて更新した。既知の限界として残るのは、Piniaの Options Store形式（`defineStore(id, {state, actions})`）とfactory関数の戻り値がオブジェクトリテラルでない場合（本プロジェクトでは未使用のパターン）。
- **非exportのヘルパー関数は「未カバー検出」の対象外**: AST抽出スクリプトはexport関数（+クラスメソッド等）のみを走査するため、`forbidden-limited.ts`の`extractCardsFromSection`/`extractEffectiveDateFromHtml`等、意味のある分岐を持つ非export関数は未カバー検出の対象にならない。実際にはこれらにも粒度基準に沿って人手でconditionsを書いたが、機械チェックでの担保は無い。
- **grain実績**: 158〜209行の3ファイルでそれぞれ9件・27件・18件、計54条件（≈1条件/6〜17行）となった。Phase0のdeck-detail-parser.ts（12行/条件）と比べ、URLパラメータ分岐が密集するurl-state.tsは条件密度が高く、setter主体のcard-detail.tsは低い。「ファイルの性質に応じて可変」という2節の方針が実データで裏付けられた。
- **検証不能な条件が存在した**: `card-detail.ts`の`goBack`にはhistory/historyIndexの不整合時のフォールバック（`?? null`）があるが、これらのrefはストアのreturnオブジェクトに公開されておらず、公開APIのみでは不整合状態を作れないため検証できなかった。該当conditionには`verified = false`と`unverifiable_reason`を付記して区別する運用とした（4節の`[meta].verified`とは別に、condition単位でも検証可否を記録する必要がある）。
- **AST抽出スクリプトが実際に条件記載漏れを検出した実例**: `url-state.ts`のconditions.toml初稿では`URLStateManager.syncSettingsToURL`のセクション自体を丸ごと書き漏らしていたが、`extract-ast-skeleton.ts --conditions ...`を実行した際に「未カバーのexport関数」として検出され、その場で条件・テストを追加できた。TASK-322のcodexレビューが懸念していた「抜け検出」が実データで機能することを確認できた。
- 3ファイルとも全conditionに対応するテストを追加/タグ付けし、`mise run test:vitest`で全件PASSを確認済み（forbidden-limited: 44件、url-state: 47件、card-detail: 25件）。

## 6. codexへの委任検討（TASK-323）

機械的な下書き生成（3節）や、粒度基準が固まった後の反復作業（同じパターンの条件を多数のファイルに適用する等）はcodexへの委任候補。判断はTASK-322のレビュー結果を踏まえTASK-323で行う。

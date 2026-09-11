# verify-conditions.py 設計（tests/design条件書 検証script）

対象: `scripts/design/verify-conditions.py`（TASK-480）
役割: test-structure skill §4が参照する`tests/design/*/conditions.toml`の機械検証（id対応・網羅・schema・除外記録構造・source_lines同期）。tests/design/README.md §4の「lint相当のチェックスクリプト」の位置づけ。

経緯: skill §4が`python3 scripts/design/verify-conditions.py`の実行を前提とするがscriptが存在せず、TASK-476/478/479/489のdesign整備で機械検証が実行できない状態が続いていた。TASK-480で実装を確定。

## 前提となった実態調査（2026-09-11時点。当日中に再計測・レビュー指摘で補正済み）

- 条件書: `tests/design/<feature>/conditions.toml` 118ファイル・3030条件
- coversタグ: tests/配下144ファイル・3566個。説明文**先頭**（63ファイル）と**末尾**（81ファイル）の混在 → 走査は位置不問
- 複数idは`[covers:a,b]`カンマ区切りが実在
- `source_lines`: 実装行番号参照（`"51"`/`"44-46"`/`"27-28,33"`/`"76-80, 91-93"`（空白入りカンマ区切り16件実在）等のlegacy形式）がほぼ全件。**新形式（`path:line`）は6件実在**（TASK-476/478で書かれた分。同期・legacy判定は両形式の混在を前提にする）
- `source`欄ありは143条件（`--strict-source`は移行完了後にon）
- idはほぼ全域で`_`使用（skill §2のstable id形式とは齟齬）→ TASK-489で移行
- tNN形式（`<stem>.tNN`）idは現corpusに存在しない（--bootstrapは未使用の移行互換）
- `expect_*`は多様: expect_return_shape 1179 / expect_return 995 / **expect_side_effect 710** / expect_no_throw 157 / expect_throw 104 / expect_state 16 / 派生少数。**`expect_return = false`は65件実在**（false/0/空配列は正当な期待値であり空扱いしてはならない）
- `[[excluded]]`使用5ファイル・verified=false条件109件（unverifiable_reason付き運用が実在）
- Python環境: プロジェクトにpyproject無し。`uv run python`でtomllib使用可。stdlibのみで成立

## 設計判断（選択肢の軸と採用案）

| # | 論点 | 採用案 | 理由 |
|---|---|---|---|
| 1 | toml書き戻し | 行ベース部分書き換え | ファイル頭コメント・`# --- 関数名 ---`セクションコメントを完全保持。全再生成は corpus破壊、tomlkit等はstdlib規約違反 |
| 2 | (d)同期の発動条件 | 新形式（`path:line`）・欠落のみ同期。legacy形式（数字のみ）は同期せずwarn。`--no-sync`で読み取り専用実行 | TASK-489移行前に121ファイル大diffを生まない。legacy warnの消滅が移行完了の機械的検知になる |
| 3 | expect_*検証 | `expect_`プレフィックスのキーが1つ以上かつ値が空文字でないことに加え、標準4種（return/return_shape/throw/no_throw）以外のexpect_キー使用もfail | skill §3表は標準4種のいずれかを規定。TASK-480実装時は「710件のexpect_side_effect等がfailになり運用不能」を根拠にwarn（移行促進）としたが、この根拠は誇張で基準を緩める必要がないと確定したためTASK-490で基準どおりfailへ。failの解消はTASK-489のcorpus移行で行う |
| 4 | id形式検証 | id形式（skill §2）違反はオプション無しのデフォルトでfail | skill §4(c)がid形式をschema検証項目に列挙。TASK-480実装時は現corpusの`_`使用idで全ファイルfail化するのを避けるためデフォルトwarn+`--strict-id`での段階適用としたが、failは移行期間（TASK-489）の正常状態のためTASK-490で`--strict-id`を廃止し基準どおりfailへ |
| 5 | --bootstrap入出力 | toml・テストファイル双方を明示指定。タグ無しit/testの説明文のみ抽出しtNN採番でファイル末尾追記。テスト側へのcoversタグ付与は**行わない** | テストファイル自動書き換えはskill文言（抽出生成）の範囲外。タグ付けはskill §7 step2の人手移行内で実施 |
| 6 | テスト方式 | Vitest + spawnSync（`uv run python`）、fixtureは`tmp/test-verify-conditions/`配下mkdtemp動的生成 | tests/unit/scripts/browser-config.test.tsの確立した前例に踏襲 |
| 7 | CLI対象指定 | 位置引数0個以上（feature名/toml path/ディレクトリ）。無指定は全corpus | TASK-479の「4ファイルだけ検証」用途 |
| 8 | タグ走査範囲 | 起動時にtests/配下（.ts/.tsx/.js/.cjs/.mjs）を一括走査しid→(path,line)マップ構築 | 対応関係の正本が他に無い。3031条件規模なら一括が最も単純・漏れなし |
| 9 | 網羅検査 | 全条件が無条件でcover必須。verified=false + unverifiable_reasonによる免除は廃止（reason必須のschema検査自体は§3由来として残す） | skill §4(b)「全条件がcoverされていること」が基準。TASK-480実装時は109件の検証不能条件の恒久failを防ぐため免除を設けた（§4(b)からの意図的逸脱）が、failは移行期間（TASK-489）の正常状態のためTASK-490で撤廃。verified=false条件にcoverタグが存在するwarnは情報報告として残す |
| 10 | 実行形態 | scriptは`python3 scripts/design/verify-conditions.py`で直接動くstdlibのみ実装。agent実行時は`uv run python`経由 | skill記載どおりのIFと、プロジェクト規約（uv経由）の両立 |
| 11 | --verifiedの安全性 | --verifiedは**--bootstrapと併用禁止**（exit 2）。単独で対象tomlに検証記録を書く。書き込み前提として当該tomlの検証（coverage・schema含む）がpassしていること。source_hash取得失敗時はfail・meta不変 | skill記載（「--bootstrapと併用し」）のままではテスト未実行・未coverの状態でverified=trueを書け検証記録の意味を破壊する。verifiedはskill §5 step7「テスト全件PASSと機械検証passを確認した後」に書くものであり、cover確認を前提に単独実行とする |
| 12 | id一意性 | id重複検査は**feature横断（全corpus）**でfail | tag→id対応・source_lines同期が別条件へ誤対応するリスクを防ぐ |
| 13 | コメント行のタグ除外 | 行頭（空白許容）`//`で始まる行はタグ走査から除外。除外行に`[covers:`が含まれる場合はwarn | コメント内のcovers:をタグ誤検出しない。実害可能性は低いが検出は廉価 |
| 14 | 改行・文字コード保持 | `splitlines(keepends=True)`で行境界を保持しCRLFも改変しない。trailing newlineは元ファイルの有無に従う（無ければ追加しない） | 同期だけで全行diffが発生するのを防ぐ |
| 15 | 対応toml形式の明示 | 書き戻し対象は「二重引用符の単行文字列値・inline comment無し・ブロック内source_linesは1行まで」を仮定。この前提を崩す構造（単引用符値・source_lines重複等）を検出したらfailし**当該ファイルの書き戻しをスキップ** | 行ベース書き戻しの適用範囲を明確化し、認識不能な形式での破壊的書き換えを防止 |
| 16 | 書き戻しの失敗安全性 | 書き込みは一時ファイル＋`os.replace`で行い、失敗（OSError）は制御されたエラー報告＋**exit 2**（tracebackを出さない）。`--bootstrap`位置引数はroot相対解決（discover_targetsと同様） | 書き込み中断時の中間状態（半端なファイル）を防止し、権限・disk full等の失敗を引数・システム系エラーとして扱う |

skill §4未記載オプション（`--root`/`--no-sync`/`--test-command`）はscript側裁量として追加する。また#11はskill §4記載（--verifiedと--bootstrapの併用）からの意図的変更である。これらskill側（global資産）の改訂案は最終報告で別途提案する。

## CLI仕様

```
使用方法:
  python3 scripts/design/verify-conditions.py [対象...] [オプション]

位置引数（0個以上、無指定なら全corpus走査）:
  <feature名>     tests/design/<feature>/conditions.toml を対象化
  <path>          conditions.tomlファイル、またはそれを含むディレクトリ

オプション:
  --strict-source   source欄の欠落・空をfailに（TASK-489移行完了後にon）
  --no-sync         source_lines自動同期を無効化（CI・review用の読み取り専用実行）
  --root <dir>      repo rootを指定（デフォルト: script位置から解決。テストでfixture rootを指定する用途）
  --bootstrap       移行モード: 位置引数1つ目=conditions.toml、2つ目=テストファイル
  --verified <by>   対象tomlの検証が全passしている前提でmetaに検証記録を書く（by: claude|human|codex）。
                    --bootstrapと併用不可（exit 2）。--test-commandが必須
  --test-command <cmd>  --verified併用時のtest_command値（--verifiedには必須）

exit code: 0 = fail無し / 1 = 検証failあり / 2 = 引数エラー・TOMLパース失敗・書き戻し失敗
```

## 関数構造（単ファイル、約880行）

```
main(argv) -> exit code
└── _run(argv)                          # WriteError（書き戻し失敗）はmainでcatchしexit 2
    ├── parse_args(argv)                # argparse
    ├── discover_targets(root, names) -> list[Path]  # 対象→conditions.toml一覧（root相対解決）
    ├── scan_test_tags(root) -> (tagmap, comment_tag_lines)
    │       # tests/**/*.{ts,tsx,js,cjs,mjs}を行走査し
    │       # \[covers:([a-zA-Z0-9_.,\- ]+?)\] を位置不問で収集、id→参照一覧
    ├── Doc.load(path) -> Doc           # tomllibパース＋行番号付きブロックマップ（parse_blocks）
    ├── run_pipeline(root, targets, config) -> results, tagmap, ...
    │   ├── verify_schema(doc, result, config, global_ids)
    │   │       # (c) meta/condition + (e) excluded + verified=true記録形式warn
    │   ├── verify_coverage(doc, result, tagmap)    # (b) 網羅（全条件無条件cover必須）
    │   ├── plan_sync(doc, expected_map) -> ops     # (d) 同期計画（legacy判定込み）
    │   └── apply_sync(doc, ops) -> int             # (d) 行ベース書き戻し・変更件数
    ├── bootstrap_mode(root, toml, test) -> int     # --bootstrap（resolve_input_pathでroot相対解決）
    ├── verified_mode(root, targets, args) -> int   # --verified
    │   ├── local_dangling_fails(tagmap, all_ids, results)
    │   │       # 対象featureのテストファイル由来danglingタグのブロック判定
    │   └── write_verified_meta(doc, by, cmd, hash) # [meta]ブロックへの行ベース記録
    └── print_report(results, tagmap, ...) -> int
            # 出力とexit code決定。(a) dangling判定はここで実施
            # （feature横断・全corpusのid集合との差分）
```

汎用ヘルパー: `split_ending`（CRLF/LF/CR分解）・`toml_str`・`git_blob_hash`（git blob hash互換のSHA-1をファイル内容から直接計算。gitサブプロセス不使用でgit管理外ファイルでも動作）・`write_text_preserve`（一時ファイル＋`os.replace`による改行保持書き戻し。失敗時は`WriteError`）。

## 書き戻しアルゴリズム

```
入力: conditions.tomlの行リスト lines[]（splitlines(keepends=True)で取得。CRLF保持）、
      id→期待値マップ expected[id]

# ブロック境界認識
blocks = []  # {header_idx, id, body: [i..next_header)}
for i, line in lines:
    if line が [meta] / [[condition]] / [[excluded]] ヘッダ:
        新ブロック開始。ブロック終端は次ヘッダ行またはEOF
    ブロック内の id = "..." 行の値をブロックのキーに

for each [[condition]]ブロック b:
    cur = ブロック内の source_lines 行（あれば。2行以上の重複記載はfail→当該ファイル書き戻しスキップ）
    exp = expected[b.id]  # "tests/unit/x.test.ts:14,tests/unit/y.test.ts:3"（昇順・重複除去）
    if exp 未定義（cover無し）           -> 何もしない（coverage検査がfail報告）
    elif cur が legacy形式              -> 何もしない + warn
         # legacy形式: ^[0-9]+(?:-[0-9]+)?(?:,\s*[0-9]+(?:-[0-9]+)?)*$
         # "51" "44-46" "27-28,33" "76-80, 91-93" 等の実装行番号参照
         # （カンマ後の空白入り形式が実corpusに16件実在するため\s*を許容）
    elif cur 存在 かつ cur.value == exp  -> 何もしない
    elif cur 存在                          -> lines[cur.idx] = f'source_lines = "{exp}"'
    else                                   -> id 行の直後に挿入

変更が1件以上なら書き戻す。trailing newlineは元ファイルの有無に従い改変しない
```

エッジケース: id重複（ファイル内・feature横断とも）はschema検査でfailとし当該ファイルの同期をスキップ。`source_lines`行の値は`"`で囲み1行で（改行含み値は許可しない）。挿入位置は必ず`id`行直後（既存corpusのフィールド順`id → target_function → source → source_lines`と整合）。値の単引用符（`source_lines = '...'`）・inline comment付き行など想定外形式を検出したらfailし、当該ファイルの書き戻しをスキップする（設計判断15）。

## 検証項目 fail/warn 全リスト

**fail（exit 1）**

| 検査 | 内容 |
|---|---|
| parse | TOMLとして不正・[meta]不在 |
| (c) | conditionのid欠落・空 |
| (c) | id形式違反（`_`使用・`.`2つ以上・大文字等、skill §2との照合。デフォルトでfail） |
| (c) | id重複（同一ファイル内＋**feature横断**） |
| (c) | `expect_`プレフィックスキーが1つも無い／値が**空文字**（`false`/`0`/`[]`は正当な期待値のためfail対象外） |
| (c) | 標準4種（expect_return/return_shape/throw/no_throw）以外の`expect_`キー使用（skill §3） |
| (c) | metaのfeature・source_file欠落 |
| (c) | meta.verified=trueなのにverified_at/verified_by/test_command/source_hashのいずれか空 |
| (c) | verified=falseなのにunverifiable_reasonが空・欠落 |
| (c) | 書き戻し前提を崩す構造（source_lines重複記載・単引用符値・inline comment等、設計判断15） |
| (a) | coversタグが全conditions.toml中のどのidにも一致しない（dangling。feature横断で判定） |
| (b) | 条件が1つもcoverされていない（verified=falseも無条件で対象。免除はTASK-490で廃止） |
| (e) | [[excluded]]のitem/source/reasonのいずれかが空欄 |
| strict | --strict-source時のsource欠落・空 |

**warn（exit 0）**

- source欄欠落・空（デフォルト）
- given欠落・空・「なし」等の実質無し
- description・target_function欠落
- meta.feature≠ファイルstem
- source_linesがlegacy形式のため同期対象外（TASK-489移行待ち）
- verified=false条件にcoverタグが存在（検証不能のはず、情報）
- meta.verified=true時の記録形式の手編集ミス疑い（`verified_by`がclaude/human/codex以外・`verified_at`がYYYY-MM-DD形式でない・`source_hash`が40桁hexでない。検証はverified=true時のみ）
- コメント行（行頭空白+`//`）に`[covers:`が含まれる（誤タグ付与の疑い）

**sync（書き込み）**

- coverあり・source_lines新形式で値不一致 → 置換
- coverあり・source_lines行なし → id行直下に挿入

## --bootstrap仕様

```
python3 scripts/design/verify-conditions.py --bootstrap \
  tests/design/<feature>/conditions.toml tests/unit/<x>.test.ts
```

1. 対象toml読み込み。tNN形式（`<stem>.tNN`）以外のidが1件でもあれば「skip（stable id付き）」を報告しexit 0（上書きしない）
2. テストファイルを行走査。単行の`it('...')/it("...")/test('...')/test("...")`の説明文を抽出（エスケープ`\'`/`\"`は展開）。describeは無視。`[covers:...]`タグ付きitは除外。**`it.each`/`it.skip`/`it.only`/`test.concurrent`/`xit`等の修飾呼び出しを検出したらfail**（暗黙の取りこぼし防止）。ファイル内の`it(`/`test(`呼び出し総数と抽出・除外説明文数の合計が不一致ならwarn
3. 既存tNN条件と説明文で突合（前後空白strip後の完全一致）。同一説明文が既存条件と重複する場合は新規採番せず既存扱い+warn（誤対応防止）。新規説明文は**既存最大NN+1**（ゼロ埋めしない・欠番埋めない）で採番し、以下のブロックをファイル末尾に追記（既存行は一切書き換えない＝手動コメント・meta直前コメント保持）。toml不在なら[meta]のみの雛形から生成:

   ```toml
   [[condition]]
   id = "<stem>.tNN"
   target_function = ""
   source = ""
   description = "テスト: <説明文>"
   given = ""
   expect_no_throw = true
   source_lines = "<testrelpath>:<行>"
   ```

4. 対応itが消失した既存tNN条件は削除せずwarn報告
5. テスト側へのcoversタグ付与は行わない（skill §7 step2の人手移行内でタグ付け）

## --verified仕様（--bootstrapとは併用不可・exit 2）

```
python3 scripts/design/verify-conditions.py tests/design/<feature>/conditions.toml \
  --verified claude --test-command "mise run test:vitest -- tests/unit/<x>.test.ts"
```

1. `--bootstrap`＋`--verified`の同時指定はexit 2（設計判断11）
2. 対象tomlの検証（schema・coverage含む）を実行し、**対象tomlのfailが1件でもあれば検証記録を書かずexit 1**（fail内容を報告）。danglingはfeature横断検出のため対象外featureのテスト起因で常に出うるため、**対象外feature由来のものはブロック条件から除外し報告のみ**とする。ただし**対象featureの条件をcoverするテストファイル内のdanglingタグ（typo等でどのidにも一致しないタグ）は対象featureの品質問題のためfailとして検証記録をブロックする**（cover無し条件のuncover failだけでは、typoタグが別条件のcoverと共存するケースを捕捉できない）
3. 全passならmetaへ`verified=true, verified_at=実行日, verified_by=<by>, test_command=<--test-command>`を書き、`source_hash`は対象ファイルの内容からgit blob hash互換のSHA-1を直接計算して書く（`git hash-object`相当。gitサブプロセスを使わないためgit管理外ファイルでも動作する）
4. `meta.source_file`不在・hash計算失敗の場合は**metaを一切更新せず**fail。**複数対象指定時は全対象のsource_file解決・hash計算を先に完了し、全て成功してから一括で書き込む**（一部対象だけverified=trueになる中間状態を作らない＝原子性）
5. `--verified`指定時に`--test-command`が無ければexit 2

## 出力形式

ファイルごとにfail/warn/syncを`FAIL <feature> <id>: 理由`形式で列挙し、最終サマリ行（`N files / X conditions / F fail / W warn / S synced`）。warnはexit 0に影響しない。`--json`等の機械可読出力は追加しない。

## テスト構成（tests/unit/scripts/verify-conditions.test.ts）

実行は`spawnSync('uv', ['run', 'python', <script>, '--root', <fixtureRoot>, ...])`、fixtureは`tmp/test-verify-conditions/<name>-XXXX/`（mkdtemp、afterEach削除）。

- CLI引数・usage: 不正オプションでexit 2 / 対象不明でexit 2 / --bootstrap+--verified併用でexit 2
- schema検証: 正常最小toml全pass / expect_無し・値空→fail / **`expect_return = false`・`0`・空配列は正常系pass** / **標準4種以外のexpect_キー（expect_side_effect等）はfail** / id欠落・重複→fail / **feature横断id重複→fail** / meta必須欠落・verified=true記録空→fail / **verified=true記録形式違反（verified_by・日付形式・hash桁）はwarn** / excluded空欄→fail・空配列pass / given欠落→warn / id`_`使用→fail（デフォルト）
- covers検査: dangling→fail / カンマ区切り複数id解決 / 先頭・末尾両配置検出 / **コメント行の`[covers:`は除外+warn**
- 網羅検査: cover無し→fail / **verified=false+reason付きの未coverもfail（免除廃止）** / reason無し→fail / verified=false条件へのcoverタグ存在はwarn
- source_lines同期: 挿入（id行直後）/ 置換 / **legacy（`"51"`・`"44-46"`・`"27-28,33"`）は書き換わらずwarn** / **カンマ後空白入りlegacy（`"27-28, 33"`）も書き換えずwarn** / **legacyと新形式の混在ファイル** / 複数coverカンマ連結 / --no-sync無変更 / **想定外形式（単引用符・source_lines重複・inline comment）でfailし書き戻しスキップ** / **CRLF・末尾改行なしファイルで同期diffが対象行のみ（挿入行除去で元contentと完全一致をassert）** / **id行が改行なし最終行への挿入も末尾改行不変**
- strict系: --strict-sourceでfail昇格（id形式違反は--strict-id無しのデフォルトfailへ移行済み）
- --bootstrap: stable id付きskip / tNN採番（既存最大NN+1）・末尾追記・コメント保持 / covers付きit除外 / **同一説明文重複はwarnで既存扱い** / **`it.each`等修飾呼び出し検出でfail**
- --verified: 検証pass時のmeta記録 / **fail時はmeta不変・exit 1** / **hash計算失敗時はmeta不変** / **対象featureのテストファイル内danglingタグは検証記録をブロック** / **複数対象の一部hash計算失敗時は全対象meta不変（原子性）** / --test-command無しexit 2
- exit code規約: 0/1/2
- 実corpus smoke: browser-configを--no-syncで実行し完了・サマリ行出力

## 実装ステップ

1. argparse・`--root`・discover_targets・scan_test_tags（タグ一括走査・コメント行除外）
2. load_doc・(a)(b)(c)(e)検証・report・exit code
3. plan_sync・apply_sync（行ベース書き戻し・legacy判定・想定外形式fail）・`--no-sync`
4. --bootstrap／--verified
5. 実corpusでの`--no-sync`全走査ドライラン。fail/warn分布を精査し、failが設計意図（実在のuncover・dangling検出）と一致するか確認、TASK-489移行の入力（legacy件数・id形式違反件数の集計）を整理

## 完了条件の位置づけ

TASK-480の完了は「script機能完成 + 自テスト全pass + 実corpusドライラン（--no-sync）で設計意図どおりのfail/warn分布を出す」。実corpus全体のexit 0はTASK-489（corpus移行）完了後のマイルストーンであり、移行期間中のfail/warn検出は正しい挙動。

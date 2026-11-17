# v0.8.0 U8-1: 内部カードDB 設計

状態: 設計 (U8-1)。実装は U8-2 以降。本書は `docs/dev/roadmap.md` の v0.8.0 節
「(a) 内部カードDB作成 (高速検索)」の設計判断を固定し、U8-2 (構築・投入) と
U8-3 (検索のDB化) の前提とする。現行バージョンは 0.7.2 (`package.json`)。

## 1. 現状 (一次資料)

- 検索は公式DBへの API 通信が前提: `src/api/card-search.ts` の `searchCards` は
  `card_search.action` へ GET し、返却 HTML を `parseSearchResults` で解析する。
  検索条件は `SearchOptions` (`src/types/api/search-types.ts`) を
  `buildSearchParams` で公式パラメータへ変換する。
- カード情報の永続化は「取得したカードだけ」のキャッシュ:
  `docs/design/card-info-cache.md` の戦略どおり、取得元ごとに cache-db /
  temp-db へ保存する。実体は `src/utils/unified-cache-db.ts` (UnifiedCacheDB)
  で、`chrome.storage.local` 上に CardTableA (基本情報) / CardTableB
  (ステータス・フィルタ用) / CardTableB2 (テキスト) / CardTableC (詳細補足) 等の
  Map をキー単位で保持する。`src/utils/temp-cache-db.ts` はその後方互換ラッパー。
- 恒常的な全件カードDBは存在しない (`src/data/` は deck-metadata.json と
  search-exclusion-rules.json のみ)。
- カードの型は `src/types/card.ts`: `CardInfo = MonsterCard | SpellCard | TrapCard`、
  共通部 `CardBase` (cardId=cid, ciid, lang, name, ruby, imgs, text,
  pendulumText 等)、モンスターは attribute / levelType / levelValue / race /
  types / atk / def (number | string、'?' 等を含む) / linkMarkers (9bit) /
  pendulumScale 等を持つ。フィルタ・ソート用途の平坦化形が CardTableB
  (atk/def は `number | null`、null='?')。

## 2. 設計判断

### D1. 保存先は IndexedDB (新規DB)。chrome.storage.local は使わない

- 理由: (1) UnifiedCacheDB の chrome.storage.local はキー単位の Map 全体
  読み書きモデルで、全件 (後述の規模) の一括投入・索引検索と相性が悪い。
  (2) IndexedDB は object store の index による範囲・一致検索と、bulk put の
  トランザクションを持ち、U8-3 の検索置換に直接使える。(3) キャッシュ
  (鮮度管理・Tier 破棄) と全件DB (版管理) は寿命と更新モデルが異なるため、
  物理的に分離し、既存キャッシュの挙動を変えない。
- manifest は `unlimitedStorage` を既に持つため容量許可の追加は不要。
- 実装方式 (生 IDB か薄いラッパか) は U8-2 で決める。本書は方式に依存しない
  論理スキーマのみを固定する。

### D2. 論理スキーマ: 1カード = 1レコード (cid キー)、検索項目を平坦化して持つ

object store `cards` (keyPath: `cardId`)。レコードは CardTableB の平坦化方針を
土台に、キーワード検索と表示に必要な項目を加えた以下の形とする。

| 項目 | 型 | 由来 | 検索での用途 |
|---|---|---|---|
| cardId | string (PK) | CardBase.cardId | 同定 |
| name | string | CardBase.name (ja) | キーワード (名前) |
| ruby | string? | CardBase.ruby | キーワード (名前)・50音ソート |
| cardType | 'monster'/'spell'/'trap' | CardTableB.cardType | cardType フィルタ (index) |
| attribute | string? | MonsterCard.attribute | attributes (index) |
| race | string? | MonsterCard.race | races (index) |
| types | string[] | MonsterCard.types | monsterTypes AND/OR・除外 (多値、アプリ側判定) |
| levelType | 'level'/'rank'/'link'? | MonsterCard.levelType | レベル種別 |
| levelValue | number? | MonsterCard.levelValue | levels / linkNumbers (index) |
| atk / def | number \| null | CardTableB 方式 ('?' は null) | 範囲フィルタ、'?' 完全一致条件 |
| linkMarkers | number? (9bit) | MonsterCard.linkMarkers | linkMarkers AND/OR (bit演算、アプリ側判定) |
| pendulumScale | number? | MonsterCard.pendulumScale | pendulumScales (index) |
| effectType | string? | Spell/TrapCard.effectType | spell/trapEffectTypes (index) |
| isExtraDeck | boolean? | CardTableB.isExtraDeck | (表示・将来用) |
| text / pendulumText | string? | CardBase (ja) | キーワード (テキスト/ペンデュラム) |
| ciid / imgs | string / Array | CardBase | 画像表示 (検索結果の描画に必須) |
| releaseDate | string? (YYYY-MM-DD) | 収録製品の最速発売日 (D5 参照) | releaseDate 範囲・発売日ソート |
| limitRegulation | 'forbidden'/'limited'/'semi-limited'? | CardTableB.langsLimitRegulation (ja) | (現行 SearchOptions に条件はない。表示用) |

- 多言語: 当面は ja のみを収録する (検索・表示の主対象。型の langs* 構造は
  キャッシュ側に残る)。レコードに言語次元は持たせない。将来他言語を収録する
  場合は store を言語別に分けるかキー複合化する (その時点で再設計)。
- ソート (SearchOptions.sort: 50音/レベル/攻守/Pスケール/リンク/発売日) は
  index では行わず、フィルタ後のアプリ側ソートとする (D4)。

### D3. index は一致・範囲が効く単値項目だけに張る

`cardType`, `attribute`, `race`, `levelValue`, `pendulumScale`, `effectType`
に index を張る。types (多値)・linkMarkers (bit)・キーワード (部分一致) は
index 化せずアプリ側で走査判定する。全件規模 (D6) では、index で候補を
絞った後の残り判定も、index を使わない全走査も実用時間に収まる想定で、
U8-3 で実測して確定する。

### D4. 検索セマンティクスは現行 SearchOptions と完全一致させる

U8-3 の置換条件は「同じ SearchOptions に対して、API 検索と DB 検索の結果集合
(と指定ソート後の順序) が一致すること」。対応表は SearchOptions の全項目に
ついて本書 D2 の項目で判定可能であること:

- keyword + searchType (1=名前 / 2=テキスト / 3=ペンデュラム / 4=カード番号):
  名前・ruby は正規化 (大小・全半角) した部分一致。テキスト系も部分一致。
  4 (カード番号) は cardId の前方一致ではなく収録製品の型番であり、
  本DBのレコードには持たない → D5 の未決事項。
- cardType / attributes / races / spellEffectTypes / trapEffectTypes:
  index 一致 (複数選択は OR)。
- monsterTypes: types 配列への包含判定。monsterTypeLogic (AND/OR) と
  excludeMonsterTypes (除外) を含む。
- levels / pendulumScales / linkNumbers: levelType を見て levelValue と照合
  (レベル/ランクは levelValue、リンク数は levelType='link' の levelValue)。
- atk / def: 範囲 (from/to)。'?' (null) の扱いは現行 API の「? チェック」
  セマンティクス (search-condition.md §6) と一致させる: '?' 指定時は null のみ。
- linkMarkers: linkMarkers (9bit) との bit 判定 (AND/OR は linkMarkerLogic)。
- releaseDate: releaseDate の範囲比較。
- sort / resultsPerPage: フィルタ後にアプリ側で適用。

### D5. 未決事項 (U8-2 着手前に決める。本書では決めない)

1. **全件データの取得経路**: 公式に全件一覧 API は文書化されていない
   (`docs/dev/official-api.md`)。候補: (a) 空キーワード検索の全ページ走査が
   公式に許容されるかの実測、(b) 製品 (パック) 単位の列挙
   (`searchCardsByPackId` が既存) + 製品一覧の取得経路の特定、
   (c) キーワード分割 (50音等) による網羅走査。U8-2 の最初の作業はこの
   実測であり、結果によって投入処理の形が決まる。いずれの経路でも
   `queuedFetch` のレート制御下で、ユーザー操作起点 (自動では始めない) とする。
2. **releaseDate の導出**: カード単体の発売日は CardInfo に無い。収録製品と
   その発売日 (parsePackInfo が詳細ページから得る製品情報) から「最速発売日」
   を導出できるか、取得経路 (a)-(c) で製品情報が付随するかに依存する。
   導出できない場合、U8-3 の初期は releaseDate 条件のみ API フォールバック
   とする選択肢を残す。
3. **searchType=4 (カード番号)**: 型番→cid の対応は製品収録情報そのもの。
   D5-2 と同じ導出ができれば `numbers: string[]` をレコードへ追加する。
   できなければ当面 API フォールバック。
4. **更新方式の詳細**: 新弾発売・禁止制限改訂への追随。方針は「版管理 +
   差分更新」: meta store に datasetVersion (取得日時・件数・取得経路の版) を
   持ち、通常は新規製品分のみ差分投入、検証失敗時や年次の禁止制限改訂時は
   全件再構築する。具体的なトリガと UI は U8-2 で決める。

### D6. 規模と配置の前提

- 収録範囲は「公式DBに存在する全カード (OCG)」。件数は取得経路の実測で
  確定するが、レコードあたりの検索項目はテキスト込みで 1KB 未満を目安とし、
  全件でも IndexedDB の実用範囲 (数十MB) に収まる前提で設計する。
  画像そのものは収録しない (ciid/imgs の参照のみ)。
- DB 名・版: `ygo-next-card-db`、version 1 (U8-2 で確定)。meta store
  (`meta`、keyPath: 'key') に datasetVersion・件数・最終更新を置く。
- 既存 UnifiedCacheDB とは独立に開き、キャッシュの初期化・破棄に連動しない。
  カード詳細表示は従来どおりキャッシュ + API の戦略 (card-info-cache.md) を
  維持し、本DBは検索専用とする (詳細の正本にしない)。

## 3. U8-2 以降への引き継ぎ

- U8-2: D5 の実測 (取得経路・releaseDate・型番) → スキーマ確定 → 投入処理
  (進捗表示・中断再開・検証: 件数とサンプル照合)。
- U8-3: `searchCards` / `searchCardsAuto` の DB 経路実装と、API 結果との
  差分検証 (同一 SearchOptions での結果集合一致をテストで担保)。
  DB 未構築時は現行 API 経路へフォールバックする。
- U8-4 以降 (レシピ履歴) は本DBと独立。本書は U8-4 の前提を含まない。

# src/utils/deck-hash.ts の calculateDeckHash が未使用の重複実装

## 現状

`src/utils/deck-hash.ts`は`calculateDeckHash(deck: DeckInfo): string`をexportしているが、`grep -rn "calculateDeckHash" src/`で調査した結果、この関数は自身のテスト(`tests/unit/utils/deck-hash.test.ts`)以外のどこからもimportされていない。

実際にデッキの変更検知に使われているのは`src/utils/deck-cache.ts`の同名関数`calculateDeckHash`(FNV-1aハッシュ、`${cid}:${ciid}:${quantity}`を使用)であり、`deck-hash.ts`側とは完全に別実装。

`deck-hash.ts`側の実装はハッシュ計算に`${cid}:${quantity}`のみを使用し、`ciid`(イラスト違い)や`lang`を無視する。

## 問題点

- 同名関数が2つ存在し、どちらが実際に使われているか読み手が混同しやすい
- `deck-hash.ts`側は`ciid`を無視するため、将来誤ってこちらをimportして使われた場合、イラスト違いのカードを「変更なし」と誤判定するリスクがある(PR#129/TASK-354,355で修正されたciid処理バグと同種の問題)
- TASK-330(Tier B展開)でconditions.toml作成中に発見(2026-08-28)

## 改善案

- `deck-hash.ts`が本当に不要か(将来使う予定があるか)を確認した上で、不要なら削除する
- 使う予定がある場合はciid/lang対応を追加するか、`deck-cache.ts`側に統合する

## 優先度

low(未使用のため実害なし。ただし将来の誤用リスクがあるため放置期間が長引くほど危険)

## 関連

- 発見: TASK-330(Tier B展開、conditions.toml作成作業)
- 関連ファイル: `src/utils/deck-hash.ts`, `src/utils/deck-cache.ts`
- 類似の過去バグ: PR#129 (デッキ保存時のイラスト違い(ciid)処理の不具合を修正)

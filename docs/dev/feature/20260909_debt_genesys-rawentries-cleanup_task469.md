# GENESYS rawEntries削除によるstorage容量節約

## 現状

TASK-470（GENESYSキャッシュにrawEntries保持+ローカル再解決の導入。親タスク: TASK-468）で `GenesysListEntry`（`src/types/card.ts`）に `rawEntries: RawGenesysEntry[]` を追加し、外部fetch後の生データ（カード名/ポイント/カード種類）を永続化する。これはカードDBが後から充実した際に、外部への再fetchなしでローカルにcid再解決するために使う。

`incomplete: false`（全カード解決済み）になった後も、`rawEntries` は削除されずに `chrome.storage.local` に残り続ける。

## 問題点

GENESYSリストは実在する複数月分をキャッシュに保持する設計（`genesys-cache.ts` の `availableListParams`）のため、`rawEntries` の蓄積が `chrome.storage.local` の容量を圧迫する可能性がある。ただしTASK-468時点では実際の容量への影響は未計測であり、確定した問題ではない。

## 改善案

`incomplete: false` になった `GenesysListEntry` について、`rawEntries` を削除する。`points`（cid→ポイントの解決済みマップ）は既に確定しているため影響なし。GENESYSリストは公開済みであれば内容が不変なため、削除後に再度未解決カードが発生することはなく、削除しても再解決の機会を失わない。

## 優先度

low（容量が実際に逼迫した場合のみ対応）。TASK-470実装時にstorage容量への影響を概算し、問題なければ本タスクはcloseする。

## 関連

- tmタスク: TASK-469
- 先行タスク: TASK-470（GENESYSキャッシュにrawEntries保持+ローカル再解決の導入。rawEntries導入元）
- 親タスク: TASK-468（GENESYSポイント取得の再設計）
- 関連ファイル: `src/utils/genesys-cache.ts`, `src/types/card.ts`

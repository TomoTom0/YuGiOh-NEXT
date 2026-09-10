# GenesysPointCache.persistResolvedEntryに並行書き込みの排他制御が無い

## 現状

`GenesysPointCache.persistResolvedEntry()`（`src/utils/genesys-cache.ts`）は `this.cache` を直接ミューテートしてから `safeStorageSet` を呼ぶ。`ensureList`/`ensureCurrentList` が異なる `listParam` に対して並行に呼ばれた場合、参照共有により致命的なデータロスは起きにくいが、`forceUpdate()` が同時に `this.cache` を新しいオブジェクトで丸ごと置き換えるタイミングと重なった場合の排他制御は無い。

`checkAndUpdate()` には `updatePromise` による多重実行防止があるが、`persistResolvedEntry` には同様の仕組みが無い。

## 問題点

実害シナリオは限定的（同一セッション内での稀な競合。content scriptは通常単一ページコンテキストで動作するため発生頻度は低い）。明示的なテストも無い。

## 改善案

`persistResolvedEntry` と `forceUpdate` のcache書き込みに、`checkAndUpdate()` の `updatePromise` パターンと同様の排他制御（もしくは単純なmutex/キュー）を導入する。

## 優先度

low（実害顕在化時のみ対応。content scriptの単一ページ実行モデル上、通常のユースケースでは競合しにくい）

## 関連

- tmタスク: TASK-474
- 親issue: TASK-470（GENESYSキャッシュにrawEntries保持+ローカル再解決の導入）
- 関連ファイル: `src/utils/genesys-cache.ts`

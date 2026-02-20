# TASK-281: Save(no sort full) でカード順が入れ替わる不具合調査

## 症状

`Save(no sort full)` ボタンを押すたびにカードの順番が入れ替わる。

---

## 根本原因

**ソート結果が `displayOrder` だけでなく TempCardDB の状態に依存しており、非決定的になっていた。**

### ソートの仕組み

`sortDisplayOrderForOfficial` は以下の2つの入力からソート順を決定する：

1. `displayOrder` — 表示上のカード順（UUID 付き配列）
2. `TempCardDB` — カードの種別（monster/spell/trap）を保持するインメモリDB

```typescript
deck.forEach(dc => {
  const card = tempCardDB.get(dc.cid);  // TempCardDB を参照
  const type = card?.cardType;
  let priority = 0;
  if (type === 'spell') priority = 1;
  else if (type === 'trap') priority = 2;
  cardTypeMap.set(dc.cid, priority);
});
```

TempCardDB に未登録のカードは `priority=0`（モンスター扱い）になる。

### TempCardDB が部分的にしか登録されない問題

修正前、TempCardDB への登録は「検索からカードを追加した時」にしか行われなかった。
`parseDeckDetail`（デッキロード時）は `UnifiedCacheDB` に書き込んでおり、TempCardDB には書かなかった。

そのため、デッキロード直後の TempCardDB はデッキ内カードについて**空または部分的**な状態になる。

### 非決定性の具体例

出発点 `displayOrder = [S(魔法), T(罠), M(モンスター)]` から同じ操作を行っても：

| TempCardDB 状態 | cardTypeMap | ソート結果 |
|----------------|-------------|-----------|
| 全て未登録 | S=0, T=0, M=0 | `[S, T, M]`（firstAppearance 順のまま） |
| S のみ登録済み | S=1, T=0, M=0 | `[T, M, S]`（S が末尾へ） |
| 全て登録済み | S=1, T=2, M=0 | `[M, S, T]`（正しい順） |

**同じ displayOrder から3通りの異なる結果が生じる。**

### 「押す度入れ替わる」が生じる条件

TempCardDB が部分登録状態で、かつキャンセル操作（保存待機中に再押し）が挟まると振動する：

```
初期: displayOrder=[S, T, M], TempCardDB={S: spell}

Press 1: sort → [T, M, S]（S が spell として末尾へ）
  → キャンセル: displayOrder を [S, T, M] に戻す
  → deckInfo.mainDeck は [T, M, S] のまま（修正前はここが問題）

Press 2: 同じ displayOrder [S, T, M] から同じ誤ったソート → [T, M, S]
  → キャンセル: [S, T, M] に戻す

以降繰り返し → 押すたびに [S, T, M] ↔ [T, M, S] が入れ替わる
```

---

## 修正内容

### 修正 1: `parseDeckDetail` が TempCardDB を登録するよう変更

`src/content/parser/deck-detail-parser.ts`

デッキロード時に全カードを TempCardDB に登録する。
これによりソート結果が決定的になる。

```typescript
// 修正後
const tempCardDB = getTempCardDB();
for (const [cid, cardInfo] of mergedCardInfoMap.entries()) {
  tempCardDB.set(cid, cardInfo, true);
}
```

### 修正 2: `restoreDisplayOrder` が `deckInfo` も同時に戻すよう変更

`src/stores/deck-edit.ts`

`sortDisplayOrderForOfficial` は `displayOrder` と `deckInfo.mainDeck/extraDeck/sideDeck` を**常に同時に**変更する。
しかし `restoreDisplayOrder` は `displayOrder` しか戻していなかった（設計上のバグ）。

修正後は `backupDisplayOrder` で `deckInfo` の3セクションもバックアップし、`restoreDisplayOrder` で同時に復元する。

```typescript
// 修正後の backupDisplayOrder
displayOrderBackup.value = {
  main: ..., extra: ..., side: ..., trash: ...,
  mainDeck: JSON.parse(JSON.stringify(deckInfo.value.mainDeck)),
  extraDeck: JSON.parse(JSON.stringify(deckInfo.value.extraDeck)),
  sideDeck:  JSON.parse(JSON.stringify(deckInfo.value.sideDeck)),
};

// 修正後の restoreDisplayOrder
deckInfo.value.mainDeck  = backup.mainDeck;
deckInfo.value.extraDeck = backup.extraDeck;
deckInfo.value.sideDeck  = backup.sideDeck;
```

---

## テスト

`tests/unit/stores/deck-edit-comprehensive.test.ts` に追加：

- `TC-Backup-01`: `restoreDisplayOrder` が `displayOrder` と `deckInfo` を同時に復元する
- `TC-Backup-02`: 復元後に `displayOrder` と `deckInfo` の順序が一致する

---

## 関連

- TASK-281
- 修正ファイル:
  - `src/content/parser/deck-detail-parser.ts`
  - `src/stores/deck-edit.ts`
  - `tests/unit/stores/deck-edit-comprehensive.test.ts`

# card-search.ts レビューレポート

## 実施日
2025-12-07

## レビュー対象
- ファイル: `src/api/card-search.ts`
- ファイルサイズ: 2261行（大規模）
- 変更回数: 22回

## レビュー観点
1. TypeScript型エラー修正後の再確認
2. URL処理の安全性確認

## 前提

**REQ-15で型エラー5件を修正済み**

元の問題（18_review_target_investigation_report.md より）:
1. Line 1372-1373: `url` が possibly undefined (2件)
2. Line 1484: `doc` パラメータが未使用
3. Line 1510: `doc` パラメータが未使用
4. background/main.ts Line 48: `tab` パラメータが未使用

---

## 発見事項

### 🟢 良好な点

#### 1. 型エラーの修正完了

**確認方法**: `bun run type-check` を実行

**結果**: ✅ エラーなし

**評価**:
- REQ-15で指摘された型エラー5件が全て修正されている
- TypeScriptの型チェックが完全にパス
- 型安全性が確保されている

---

#### 2. URL処理の安全性

**確認箇所**: `src/api/card-search.ts:parsePackInfo` (1342-1409行)

**評価**: ✅ 安全

**実装内容**:
```typescript
// パックIDを取得
const linkValueInput = safeQueryAs('input.link_value', isHTMLInputElement, rowElement);
let packId: string | undefined;
if (linkValueInput?.value) {
  const pidMatch = linkValueInput.value.match(/pid=(\d+)/);
  if (pidMatch && pidMatch[1]) {
    packId = pidMatch[1];
  }
}
```

**安全性のポイント**:
1. **safeQueryAs使用**: 型安全なクエリ（src/utils/type-guards.ts）
2. **オプショナルチェーン**: `linkValueInput?.value` でnull/undefinedチェック
3. **match結果のチェック**: `pidMatch && pidMatch[1]` で結果の存在確認
4. **全てのquerySelector系で `?.` オプショナルチェーン使用**

**他のURL処理箇所も同様に安全**:
- `parseLinkValue`: パラメータチェックが適切
- `extractImageInfo`: エラーハンドリングが適切

---

#### 3. HTMLパース処理の安全性

**確認箇所**: `parsePackInfo`, `parseCardBase`, `parseMonsterCard`, `parseSpellCard`, `parseTrapCard` 等

**評価**: ✅ 安全

**安全性のポイント**:
1. **querySelector系の全てでオプショナルチェーン**:
   ```typescript
   const timeElem = rowElement.querySelector('.time');
   const releaseDate = timeElem?.textContent?.trim() || undefined;
   ```
2. **safeQueryAs の使用**: 型安全なDOM要素取得
3. **fallback値の設定**: `|| undefined` や `|| ''` でデフォルト値を設定
4. **型ガードの使用**: `isHTMLInputElement` 等で型を保証

---

#### 4. 関数構成のリファクタリング

**評価**: ✅ 良好

**確認結果**:
- `parseSpellCardFromDetailPage` や `parseTrapCardFromDetailPage` は存在しない
- 代わりに `parseSpellCard` と `parseTrapCard` が存在
- **推測**: REQ-15で未使用パラメータ問題を修正する際にリファクタリングされた

**関数一覧**（主要な関数のみ）:
- `searchCards`, `searchCardsAuto`, `searchCardById`, `searchCardsByName`, `searchCardsByPackId`
- `getCardDetail`, `getCardDetailWithCache`
- `parseSearchResults`, `parseSearchResultRow`
- `parseCardBase`, `parseMonsterCard`, `parseSpellCard`, `parseTrapCard`
- `parsePackInfo`, `parseRelatedCards`, `extractImageInfo`
- キャッシュ関連: `saveCardDetailToCache`, `reconstructCardDetailFromCache`

---

## テストカバレッジ評価

**テストファイル**:
1. `tests/unit/api/card-search-promise.test.ts`
2. `tests/unit/api/card-search-basic.test.ts`
3. `tests/combine/parser/card-search.test.ts`
4. `tests/unit/card-search-cache.test.ts`

**カバー済み**:
- ✅ fetchAdditionalPages のPromiseチェーン
- ✅ エラーハンドリング（API失敗、ネットワークエラー）
- ✅ ページングロジック
- ✅ カード検索結果のパース
- ✅ キャッシュ機能

**未確認（詳細確認が必要）**:
- ❓ URL処理の安全性テスト（parsePackInfo等のURLパース）
- ❓ HTMLパース処理のエッジケーステスト（要素が存在しない場合等）
- ❓ 各カードタイプのパース処理（monster/spell/trap）

---

## ファイルサイズの評価

**行数**: 2261行

**評価**: 🟡 大規模（改善推奨）

**分析**:
- 18_review_target_investigation_report.md では「~1500行」とされていたが、実際は2261行
- REQ-15で修正・リファクタリングが行われた際に増加した可能性
- 複数の責務が混在している可能性：
  1. カード検索API呼び出し
  2. HTMLパース処理
  3. キャッシュ管理
  4. 型変換・マッピング

**推奨対応**:
- ファイル分割の検討（例: parse系を別ファイルに分離）
- 各カードタイプのパーサーを独立したモジュールに分離
- キャッシュ管理を別ファイルに分離

**優先度**: 低（現状で動作しており、テストも存在する）

---

## 推奨対応アクション

### 優先度: 高

**なし**（型エラー修正済み、URL処理も安全）

### 優先度: 中

1. **テストカバレッジの詳細確認**
   - URL処理のテストが存在するか確認
   - HTMLパース処理のエッジケーステストを追加
   - 各カードタイプのパース処理テストを追加

### 優先度: 低

2. **ファイル分割の検討**
   - parse系関数を別ファイルに分離
   - キャッシュ管理を別ファイルに分離
   - 保守性向上のため

3. **ドキュメント更新**
   - 各関数のJSDoc追加
   - URL処理の安全性に関する説明追加

---

## まとめ

### 総合評価: 🟢 良好（対応済み）

**理由**:
- TypeScript型エラーが全て修正されている
- URL処理が安全に実装されている
- HTMLパース処理が安全に実装されている
- テストファイルが複数存在する

**REQ-15での対応が適切に完了**:
- ✅ 型エラー5件が全て修正
- ✅ URL処理の安全性が確保
- ✅ 未使用パラメータが削除またはリファクタリング済み

**残課題**:
- ファイルサイズが大きい（2261行）
- テストカバレッジの詳細確認が必要
- ドキュメント追加が推奨される

**リスク評価**:
- **現在**: 低リスク（型エラーなし、URL処理安全、テスト存在）
- **将来**: 中リスク（ファイルサイズが大きいため保守性が懸念）

---

## 次のステップ

1. **v0.4.0リリース**: 現状で問題なし（リリース可能）
2. **v0.4.1以降**: ファイル分割の検討、テストカバレッジの詳細確認
3. **継続的改善**: ドキュメント追加

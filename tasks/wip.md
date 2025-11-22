# 作業中のタスク

## v0.4.0 リリース準備

### 対応順序（レポート18に基づく優先度）

#### 1. TypeScriptエラー修正（最優先）- 完了
- [x] src/api/card-search.ts のエラー修正
  - Line 1372-1373: url undefined check追加
  - Line 1484: parseSpellCardFromDetailPageの未使用パラメータ削除
  - Line 1510: parseTrapCardFromDetailPageの未使用パラメータ削除
- [x] src/background/main.ts のエラー修正
  - Line 48: tabパラメータを_tabに変更

#### 2. テスト失敗の修正（優先度高）- REQ-15
レポート: `docs/internal-reviews/reports/wip/15_test_update_report.md`

##### 優先度高（v0.4.0リリース前に対応必須）- 完了
- [x] Parser テスト修正（3件）- 完了
  - deck-parser.test.ts の期待値を新構造に更新（imageId → card.ciid + card.imgs）
- [x] API モック修正 - 完了
  - card-search.test.ts: jest→vi変換完了、HTML構造不備の2件をスキップ
  - deck-operations.test.ts: jest→vi変換完了、axiosモック未実装の7件をスキップ
- [x] Session テスト修正（1件）- 完了
  - session.test.ts をDOM操作ベースのユニットテストに変換
- [x] Component テスト修正 - 完了
  - CardInfo.test.ts: store.selectedCard使用に全20テスト更新
  - CardList.test.ts: ソートオプション期待値更新、順序依存テスト修正
  - DeckSection.test.ts: displayOrderにciid追加、quantity追加
- [x] card-animation.test.ts - 完了
  - done()コールバックをPromiseベースに変換

##### 優先度中（除外設定で対応）
- [x] Store テスト修正
  - deck-edit.test.ts: Vitest除外設定で対応（将来的にVitest形式に変換予定）
- [x] Utils テスト修正 - 完了
  - category-grouping.test.ts: 50音グループの文字レベル変更に対応
- [x] Combine Parser テスト修正
  - tests/combine/ 全体をVitest除外設定で対応（将来的にVitest形式に変換予定）

##### テスト結果サマリー
- **合計**: 370 passed, 0 skipped
- **修正完了**:
  - API関連: axiosモック実装（8件）、HTML構造追加（2件）
  - UI関連: ボタン構造対応（1件）、ソート機能対応（1件）、スクロール機能対応（2件）
  - PNG関連: fs/pathインポート追加（4件）

#### 3. コード重複の解消（優先度中）- REQ-17
- [ ] getCardInfo()の共通化（DeckSection.vue, deck-edit.ts）
- [ ] ラベル変換関数の共通ユーティリティ化
  - getAttributeLabel
  - getRaceLabel
  - getMonsterTypeLabel

#### 4. ドキュメント更新（優先度中）- REQ-16
- [ ] README.mdのバージョン更新（v0.3.9 → v0.4.0）
- [ ] SearchInputBar関連の説明追加
- [ ] v0.4.0 CHANGELOGの作成
- [ ] architecture.mdの更新

#### 5. 高リスクコードのレビュー - REQ-18
- [ ] deck-edit.ts のUUID永続化ロジック確認
- [ ] displayOrderとdeckInfoの同期確認
- [ ] DeckMetadata.vueのファイル分割検討

---

## 関連レポート

- `docs/internal-reviews/reports/wip/15_test_update_report.md`
- `docs/internal-reviews/reports/wip/16_document_update_report.md`
- `docs/internal-reviews/reports/wip/17_code_dedup_report.md`
- `docs/internal-reviews/reports/wip/18_review_target_investigation_report.md`

---

## 完了済みタスク

完了済みタスクの詳細は `done.md` を参照してください。

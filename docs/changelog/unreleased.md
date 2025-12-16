# 次期バージョン（未リリース）

## New Features

- オプションページにダイアログのフォントサイズ設定を追加（S/M/L/XL）
- オプションページに検索UIのフォントサイズ設定を追加（S/M/L/XL）
- デッキ表示ページのカード画像サイズ設定をGeneralタブに追加（Normal/S/M/L/XL）
  - Normalは公式サイトのデフォルトサイズ
  - カード詳細エリアの表示/非表示とは独立して設定可能

## Bug Fixes

- デッキツールバーのメニューを開いた状態で外部をクリックしてもメニューが閉じない問題を修正
- デッキ表示画面のinfoボタンが反応しない問題を修正（closest()メソッドによる要素検索に変更）
- デッキ表示ページで画像が次々追加される際のレイアウトシフトを修正（aspect-ratio使用）

## Changes

- ダイアログのフォントサイズをRight Areaのフォントサイズとは独立して設定できるように変更
- 検索UIのフォントサイズを独立した設定項目として追加

## Performance

- TempCardDBのloadFromStorage()で全カードをメモリロードしていた問題を修正
  - TempCardDBは一時的なセッションキャッシュとして動作し、必要なカードのみを動的にロード
- デッキ表示画面の初期化処理を最適化（イベント委譲により70個の個別イベントリスナーを1つに集約）

## Refactoring

（変更内容をここに記載）

## Repository Management

### Branch Protection

- dev-new/main-newブランチに保護ルールを適用
  - 必須ステータスチェック: check-branch-policy
  - コミット署名必須（required_signatures）
  - force push禁止
  - 削除禁止
  - 会話解決必須
- main-newへのPRはdev-newからのみ許可

### Dependabot

- Dependabot PRの自動署名・マージ設定を実装
  - SSH署名を使用してコミットに署名を追加
  - マイナー/パッチ更新は自動マージ
  - メジャー更新は手動レビュー
  - SSH署名セットアップガイドを追加（docs/setup-ssh-signing.md）

## Internal Improvements

### テスト改善

- 既存テストの失敗を85個→0個に修正。全102テストファイルが成功
- useFilterLogic.test.ts を新しいAPI（1パラメータ）に完全移行。35個の全テストが成功
- 2段階のテスト構成を導入：
  - 最軽量のテスト: HTMLファイル不要（2188テスト成功）
  - 統合テスト: HTMLサンプルファイルを自動ダウンロード（2194テスト成功）
- テスト用サンプルHTMLのダウンロードスクリプトを追加（`scripts/test/download-sample-html.sh`）
- HTMLファイル依存テストは自動的にスキップされるように改善（`it.skipIf(!hasHtmlFile)`）
- promise-timeout.test.ts の Unhandled Rejection を修正

---

**主な変更内容**:
- Performance: TempCardDBの全カード読み込み問題を修正
- Repository: ブランチ保護ルールとDependabot自動マージを設定
- Testing: 85個の失敗を修正し、2段階のテスト構成を導入

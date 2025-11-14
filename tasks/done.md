# DONE

最近完了したタスク（簡潔版）

> **詳細な履歴**: `docs/_archived/tasks/` を参照

---

## 2025-11-14: PR #7レビュー対応完了 - popup UI CSS分離

- **レビュー指摘2件に対応完了**:
  1. メールアドレス不整合: PR説明文のタイポと説明、コード本体は統一済み
  2. popup UI CSS分離: インラインスタイル廃止、CSSファイル分離実施
- **リファクタリング詳細**:
  - `src/popup/popup.css` 新規作成（81行）
  - `src/popup/index.ts`: 113行 → 60行（47%削減）
  - 全ての `style.cssText` とホバーイベントリスナーを削除
  - クラスベースのスタイル管理に変更
- **コミット**: d883939ff1d2194f395c0775a76675c7c3412338

---

## 2025-11-14: PR #7作成 - v0.3.1リリース準備 (dev → main)

- PR #6の内容をmainブランチへマージ準備
- UI改善、ドキュメント拡充、Repository名変更を本番環境へ
- **PR**: https://github.com/TomoTom0/YuGiOh-NEXT/pull/7

---

## 2025-11-14: PR #6マージ完了 - UI改善・ドキュメント拡充

- オプションページにサイドバーナビゲーション追加（折りたたみ可能）
- Chrome Store宣伝画像をドキュメントに追加（3枚、約2.5MB）
- Repository名変更対応（ygo-neuron-helper → YuGiOh-NEXT）
- 連絡先情報追加、アイコン更新スクリプト作成
- done.md簡潔化（2,762行→58行、98%削減）
- **レビュー対応完了**: web_accessible_resources追加、スクリプト改善
- **PR**: https://github.com/TomoTom0/YuGiOh-NEXT/pull/6

---

## 2025-11-14: v0.3.0/v0.3.1 GitHub Release作成完了

- GitHub Release v0.3.0, v0.3.1 作成
- Chrome Web Store用アセット準備完了
- プライバシーポリシー更新

---

## 2025-11-14: PR #4マージ - v0.3.0リリース (dev → main)

- デッキ編集機能（ドラッグ&ドロップ、カード検索、詳細表示）
- 多言語対応基盤（日本語・英語）
- オプションページ拡張（画像付き機能説明）
- テスト実装（125tests: 単体47 + 結合34 + コンポーネント54）
- **PR**: https://github.com/TomoTom0/YuGiOh-NEXT/pull/4

---

## 2025-11-14: PR #3マージ - v0.3.0テスト実装完了

- vitest統一、全テスト合格
- カード枚数制限実装（同一カード3枚まで）
- ドキュメント整備完了
- **PR**: https://github.com/TomoTom0/YuGiOh-NEXT/pull/3

---

## 2025-11-13: PR #2マージ - デッキ編集UI実装完了

- デッキ編集UI実装（カード追加・削除・移動）
- カード詳細表示（Info/Related/Products/Q&A）
- 多言語対応（i18n基盤）
- **PR**: https://github.com/TomoTom0/YuGiOh-NEXT/pull/2

---

## それ以前の履歴

- **2025-11-07 〜 2025-11-14**: `docs/_archived/tasks/done_2025-11-07_to_11-14.md`
- **2025-11-07以前**: `docs/_archived/tasks/done_full_2025-11-07.md`

# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

- デッキ編集: 画面表示直後（初期化完了前・約1.1秒間）にCtrl+Z等のグローバルショートカットが無反応だった問題を修正。リスナー登録をデッキ描画前（onMountedのawait前）に前倒しした。あわせて初期化完了前にEscapeでグローバル検索モードに入ると、検索inputが非表示のため解除できずモードが残留する問題も修正（globalSearchのみ初期化完了後に有効化）

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

（変更内容をここに記載）

## Internal Improvements

- テスト設計: DeckEditLayout.vue（script setup 969行）のテスト設計条件書（conditions.toml 100条件）を新設し、実pinia+実storeでマウント検証するユニットテスト102itに再設計。従来の実装非検証テスト（DOM自作・モック自己検証の40it）は削除。E2Eテスト8ファイルにも条件書へのcovers紐付けを付与
- テスト設計: CategoryDialog.vueのテスト設計条件書（conditions.toml 16条件+除外6件）を新設し、ユニットテストを17itに再設計（旧21it中19itの実装非検証テスト〔prop受け渡し・定義確認のみ〕を削除し、全操作をDOMイベント経由の実挙動検証に統一）
- テスト基盤: verify-conditions.pyの例外処理を廃止し、派生expect_キー許容・網羅免除・id形式の各緩和をskill基準どおりfailに改修。62条件のid張替えと条件書・テストの整合更新を実施

## Known Issues

（変更内容をここに記載）

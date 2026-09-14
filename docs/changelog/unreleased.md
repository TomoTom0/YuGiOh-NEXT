# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

- デッキ編集: 画面表示直後（初期化完了前・約1.1秒間）にCtrl+Z等のグローバルショートカットが無反応だった問題を修正。リスナー登録をデッキ描画前（onMountedのawait前）に前倒しした。あわせて初期化完了前にEscapeでグローバル検索モードに入ると、検索inputが非表示のため解除できずモードが残留する問題も修正（globalSearchのみ初期化完了後に有効化）
- インポート/エクスポート: ダイアログを再オープンした際にエクスポートファイル名（filenameBase）へ前回のタイムスタンプ付き値が残る問題を修正。再オープン時にデッキ名基準で再生成されるようにした（形式・Side Deck・CSV列設定は前回値を保持）
- インポート/エクスポート: CSV列のドラッグ&ドロップで元の位置へドロップした際に、ドラッグ中を示す列ハイライト（draggingクラス）が残存する問題を修正

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

- 開発環境: start-chrome.shが依存欠落時に黙って壊れない構成へ修正。tomlq依存を排除し、ブラウザbinary・拡張機能パス等を configs/browser.toml に集約。起動成否チェック・--check/--headless/--gui オプション、手動ログイン用GUIスタック（Xvfb+VNC）の start/stop-login-vnc.sh を新規追加

## Internal Improvements

- テスト設計: DeckEditLayout.vue（script setup 969行）のテスト設計条件書（conditions.toml 100条件）を新設し、実pinia+実storeでマウント検証するユニットテスト102itに再設計。従来の実装非検証テスト（DOM自作・モック自己検証の40it）は削除。E2Eテスト8ファイルにも条件書へのcovers紐付けを付与
- テスト設計: CategoryDialog.vueのテスト設計条件書（conditions.toml 16条件+除外6件）を新設し、ユニットテストを17itに再設計（旧21it中19itの実装非検証テスト〔prop受け渡し・定義確認のみ〕を削除し、全操作をDOMイベント経由の実挙動検証に統一）
- テスト設計: ImportExportDialog.vueのテスト設計条件書（conditions.toml 44条件+除外9件）を新設し、ユニットテスト45itを作成（全it covers・verified記録。asキャスト3箇所は型ガードへ置換）
- テスト統合: src/**/__tests__ 配下に残留していたテスト42ファイルを tests/unit へ一本化し、src配下のテストファイルをゼロ化。軽量20ペアの統合に加え、大規模ドリフト4件（unified-cache-db/practice/mapping-manager/LoadDialog）は個別精査のうえ統合（LoadDialogは条件書29条件を新設）
- テスト基盤: verify-conditions.pyの例外処理を廃止し、派生expect_キー許容・網羅免除・id形式の各緩和をskill基準どおりfailに改修。62条件のid張替えと条件書・テストの整合更新を実施

## Known Issues

（変更内容をここに記載）

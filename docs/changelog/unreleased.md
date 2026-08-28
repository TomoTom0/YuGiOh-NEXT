# 次期バージョン（未リリース）

## New Features

（変更内容をここに記載）

## Bug Fixes

（変更内容をここに記載）

## Changes

（変更内容をここに記載）

## Performance

（変更内容をここに記載）

## Refactoring

（変更内容をここに記載）

## Repository Management

- リリースフローにgit tag/GitHub Release作成を必須化（release-prep skillのstep8/9を「オプション」から「必須」に変更。v0.6.4〜v0.6.12で8バージョン連続の作成漏れが発生していたため）
- build/deployコマンドの命名を統一（コロンなし＝dev、`:prod`＝本番を明示。`build`/`build:prod`/`watch`/`sync`/`build-deploy`/`build-deploy:prod`）。普段の動作確認はdevビルドを既定にし、prod専用だったfeature flag（category3）を開発中も確認可能に

## Internal Improvements

（変更内容をここに記載）

## Known Issues

（変更内容をここに記載）

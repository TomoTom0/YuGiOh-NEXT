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

（変更内容をここに記載）

## Internal Improvements

- `AppSettings` / `UXSettings` のデフォルト値を `configs/app-settings.toml` / `configs/ux.toml` に一元管理。feature flag（`configs/features.toml`）と同様にビルド時に注入する方式へ移行し、設定デフォルト値の `src/types/settings.ts` 直書きを廃止。`docs/feature/*.toml` は category/UI導線のメタ情報専用に分離し二重管理を解消

## Known Issues

（変更内容をここに記載）

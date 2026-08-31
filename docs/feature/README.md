# 機能フラグレジストリ

`src/types/settings.ts` の全設定項目（`FeatureSettings` / `AppSettings` / `UXSettings`）の状態を、TOMLで機械可読に管理する。

- `featureSettings.toml` — `FeatureId`（`shuffle-sort` / `deck-image` / `deck-edit` / `chat` / `practice` / `genesys`）
- `appSettings.toml` — `AppSettings` の全項目
- `ux.toml` — `AppSettings.ux`（`UXSettings`）の全項目

## category の定義

| 値 | 意味 |
|---|---|
| 1 | デフォルトON、またはいずれかのモードを選べる（最も多いはずの分類） |
| 2 | デフォルトOFF（UIから明示的にONにするまで使われない） |
| 3 | 開発でだけON（本番ビルドではOFF） |
| 4 | 開発でもOFF（実装はあるが完全に眠っている、または意図的に無効化中） |

category 3 は `configs/features.toml` の `default = "dev-only"` で表現し、ビルド時に
webpack DefinePlugin（vitest は define）が開発/本番ビルドを boolean に解決して
`__FEATURE_DEFAULTS__` として注入することで実現される（2026-08-31時点）。

## 各項目のフィールド

| フィールド | 意味 |
|---|---|
| `category` | 上記の4分類（1〜4） |
| `ui` | 設定可能なUIの場所（ファイルパス、無ければ `"none"`） |
| `note` | 補足（任意） |

**feature flag のデフォルト値（`default`）は `configs/features.toml` で管理する。**
`src/types/settings.ts` の `DEFAULT_FEATURE_SETTINGS` はビルド時に
`configs/features.toml` から注入される `__FEATURE_DEFAULTS__`（webpack DefinePlugin /
vitest define）経由で構築され、コードへの直書きは行わない。

## 更新タイミング

`featureSettings` / `appSettings` / `ux` に項目を追加・削除・UI変更した場合は、該当するtomlファイルも同時に更新する。
feature flag を追加した場合は `configs/features.toml` と `src/types/settings.ts` の `FEATURE_IDS` にも同じIDを追加する（整合は `tests/unit/configs/feature-defaults.test.ts` が検証する）。

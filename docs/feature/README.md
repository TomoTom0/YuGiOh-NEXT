# 機能フラグレジストリ

`src/types/settings.ts` の全設定項目（`FeatureSettings` / `AppSettings` / `UXSettings`）の状態を、TOMLで機械可読に管理する。

- `featureSettings.toml` — `FeatureId`（`shuffle-sort` / `deck-image` / `deck-edit` / `chat`）
- `appSettings.toml` — `AppSettings` の全項目
- `ux.toml` — `AppSettings.ux`（`UXSettings`）の全項目

## category の定義

| 値 | 意味 |
|---|---|
| 1 | デフォルトON、またはいずれかのモードを選べる（最も多いはずの分類） |
| 2 | デフォルトOFF（UIから明示的にONにするまで使われない） |
| 3 | 開発でだけON（本番ビルドではOFF） |
| 4 | 開発でもOFF（実装はあるが完全に眠っている、または意図的に無効化中） |

2026-07-23時点、リポジトリ全体に `NODE_ENV` 等によるビルド分岐は存在せず、category 3 を実現する仕組み自体がまだ無い。

## 各項目のフィールド

| フィールド | 意味 |
|---|---|
| `default` | デフォルト値 |
| `category` | 上記の4分類（1〜4） |
| `ui` | 設定可能なUIの場所（ファイルパス、無ければ `"none"`） |
| `note` | 補足（任意） |

## 更新タイミング

`featureSettings` / `appSettings` / `ux` に項目を追加・削除・UI変更した場合は、該当するtomlファイルも同時に更新する。

# AI_CHATバックグラウンドプロキシの統合

## 現状

`src/background/main.ts` に `AI_CHAT` メッセージハンドラが定義されているが、`zai-api.ts` はコンテンツスクリプトから直接 `fetch` を呼び出しているため未使用。

## 問題点

- `AI_CHAT` ハンドラがデッドコードとして残っている
- コンテンツスクリプトからの直接 `fetch` は、CORSやCSPの制限を受ける可能性がある
- APIキーがコンテンツスクリプト側で管理されている

## 改善案

1. `zai-api.ts` をバックグラウンドスクリプト経由のメッセージパッシングに変更
2. APIキーをバックグラウンド側で安全に管理
3. `AI_CHAT` ハンドラを実際に使用するように接続

## 優先度

low

## 関連

- PR: #111
- Thread ID: PRRT_kwDOQKOd3M59ob-S
- タスク: TASK-59
- 関連ファイル: src/background/main.ts, src/services/llm/zai-api.ts

# API Key / 自動ログインの可能性検証

## 調査日時
2025年10月21日（追加検証）

## 調査結果

### 1. 公式API Keyの有無

#### 調査した箇所
- ✗ robots.txt - 404 Not Found
- ✗ .well-known/openid-configuration - 403 Forbidden
- ✗ KONAMI開発者ポータルの有無 - 見つからず
- ✗ 公式サイト内のAPI/developer関連リンク - なし

#### 結論
**❌ 公式のAPI Key発行サービスは存在しない**

遊戯王公式データベースは：
- 一般ユーザー向けのWebアプリケーション
- サードパーティ開発者向けのAPIは提供していない
- アプリ連携用のAPI Keyは発行されていない

### 2. 完全自動ログインの可能性

#### 技術的に不可能な理由

##### OAuth 2.0の仕様上の制約
```
1. Authorization Code Flow:
   ユーザー → KONAMI IDログイン画面 → 認証 → Code → Token
   
   問題点:
   - ユーザー自身がKONAMI IDとパスワードを入力する必要がある
   - これをスキップする方法は仕様上存在しない
```

##### セキュリティ上の理由
- KONAMI IDのログイン画面は `my1.konami.net` にある
- Chrome拡張機能は他ドメインのフォームに自動入力できない（セキュリティ制約）
- パスワードを保存・送信することは重大なセキュリティリスク

##### Cookie/Session管理
- JSESSIONIDはHttpOnly（JavaScriptから読み取り不可）
- セッション有効期限後は必ず再ログイン必要
- Cookieを偽造・再利用することは不可能（暗号化・署名あり）

#### 理論的に可能だが「やってはいけない」方法

以下は技術的には可能だが、**セキュリティ上問題があり実装すべきでない**：

1. **ユーザー認証情報の保存** ❌
   ```javascript
   // これはやってはいけない
   chrome.storage.local.set({
     username: 'user@example.com',
     password: 'password123'  // ← 絶対ダメ
   });
   ```
   問題：
   - パスワードの平文保存は重大なセキュリティリスク
   - Chrome拡張機能のストレージは暗号化されていない
   - マルウェアに盗まれる可能性

2. **Headless Browserでの自動操作** ❌
   ```javascript
   // Puppeteerなどでログイン画面を自動操作
   ```
   問題：
   - KONAMI利用規約違反の可能性
   - bot検知・アカウント停止のリスク
   - パスワード管理の問題

### 3. 実装可能な代替案

#### ✅ 本番環境（Chrome拡張機能）
```javascript
// Content Scriptはページ上で動作するため、認証を意識する必要なし
// ページ内のデータに直接アクセス

const cgid = document.querySelector('[name="cgid"]')?.value;
const ytkn = document.querySelector('[name="ytkn"]')?.value;

// デッキデータを抽出
const deckData = extractDeckFromDOM();
```

**メリット:**
- セキュリティリスクなし
- 実装がシンプル
- ユーザーは何も意識する必要なし

#### ✅ 開発環境（ローカルテスト用）
```javascript
// 開発者がブラウザからセッション情報をコピーして使用
const SESSION_COOKIE = process.env.JSESSIONID;

const response = await fetch('https://www.db.yugioh-card.com/yugiohdb/member_deck.action?...', {
  headers: { 'Cookie': `JSESSIONID=${SESSION_COOKIE}` }
});
```

**用途:**
- CLIからのAPI動作確認
- HTMLパーサーの開発
- ブラウザを開かずにテスト実行

### 4. 他のアプリの調査

#### Yu-Gi-Oh! Neuron公式アプリ
- iOS/Android向け公式アプリが存在
- アプリ専用のAPIを使用している可能性
- しかしサードパーティには公開されていない

#### 既存のサードパーティツール
一部のデッキ構築ツールが存在するが：
- 独自のカードデータベースを構築
- 公式サイトから直接データ取得はしていない
- または手動でのデータ入力

## 最終結論

### ❌ 不可能なこと
1. **公式API Keyの取得** - サービス自体が存在しない
2. **完全自動ログイン** - OAuth仕様上不可能、かつセキュリティリスク
3. **パスワードレス認証** - KONAMI側が提供していない

### ✅ 可能なこと
1. **既存セッションの活用** - ユーザーが既にログイン済みの場合
2. **ログイン誘導** - ログインページへのリダイレクト
3. **セッション状態管理** - Cookie監視による状態確認

### 推奨アプローチ

**本番環境: Content Scriptでページ内データに直接アクセス**

```
ユーザーの操作フロー：
1. 公式サイトに通常通りログイン（拡張機能は関知しない）
2. 拡張機能がページ上で自動的に動作
3. ユーザーは拡張機能の存在を意識せずに使える
```

**開発環境: セッション情報を使ったローカルテスト**

```
開発者の操作フロー：
1. ブラウザで公式サイトにログイン
2. DevToolsでセッション情報をコピー
3. .env.local に保存
4. CLIからAPIテストが可能
```

これにより：
- ✅ 本番環境はシンプル（認証処理不要）
- ✅ 開発効率が高い（ブラウザを開かずにテスト可能）
- ✅ セキュリティリスクなし
- ✅ 実装も比較的シンプル

## 参考：他サービスの例

### Google Chrome拡張機能の一般的なパターン
多くのWeb拡張機能は同様のアプローチ：
- Twitter/Facebook拡張 → 既存セッション利用
- Gmail拡張 → 既存ログイン状態を前提
- GitHub拡張 → Personal Access Token（独自実装）

遊戯王DBにはAccess Token発行機能がないため、
セッション利用が唯一の現実的な方法です。

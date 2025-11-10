# KONAMI ID認証フロー調査レポート

## 調査日時
2025年10月21日

## 重要な発見

### 認証方式
**OAuth 2.0 Authorization Code Flow を使用**

### 認証エンドポイント
```
https://my1.konami.net/api/authorizations
```

### パラメータ詳細

#### 必須パラメータ
- `client_id`: `iiupvpe4ftzyqtu4t7faf56k2c5j2cvo`
- `redirect_uri`: `https://www.db.yugioh-card.com/yugiohdb/member_login.action`
- `response_type`: `code`
- `state`: ランダム生成されるCSRF保護トークン (例: `ztkdSQPxSU4GQSAYC8hoHu3mPTGx0pOU`)

#### Claims (要求するスコープ)
```json
{
  "userinfo": {
    "sequentialId": {
      "scopes": ["read"]
    },
    "profile": {
      "given_name": {
        "scopes": ["read"]
      },
      "family_name": {
        "scopes": ["read"]
      },
      "birthdate": {
        "scopes": ["read"]
      }
    },
    "address": {
      "country": {
        "scopes": ["read"]
      }
    },
    "accountType": {
      "scopes": ["read"]
    },
    "link": {
      "app": {
        "cgn": {
          "userId": {
            "scopes": ["create", "update"]
          }
        }
      }
    }
  }
}
```

## Cookie情報

### セッション管理
1. **JSESSIONID**
   - Path: `/yugiohdb`
   - 属性: `Secure`, `HttpOnly`
   - 用途: サーバーサイドセッション管理

2. **CountryCd**
   - 値: `JP` (国コード)
   - Max-Age: 1209600秒 (14日間)
   - 属性: `Secure`, `HttpOnly`

3. **Edgescape**
   - Max-Age: 1209600秒 (14日間)
   - 属性: `Secure`, `HttpOnly`

## 認証フロー

### ステップ1: ログイン開始
```
GET https://www.db.yugioh-card.com/yugiohdb/member_login.action
↓
302 Redirect
↓
GET https://my1.konami.net/api/authorizations?[params]
```

### ステップ2: KONAMI IDログイン
ユーザーがKONAMI IDの認証ページでログイン

### ステップ3: Authorization Code取得
```
GET https://www.db.yugioh-card.com/yugiohdb/member_login.action?code=[code]&state=[state]
```

### ステップ4: Access Tokenとの交換（推測）
サーバーサイドでauthorization codeをaccess tokenに交換

### ステップ5: セッション確立
JSESSIONIDが設定され、ログイン状態になる

## Chrome拡張機能での実装戦略

### ✅ 可能な方法

#### 方法1: リダイレクトフローをそのまま利用
```javascript
// Background scriptで
chrome.tabs.create({
  url: 'https://www.db.yugioh-card.com/yugiohdb/member_login.action'
});

// ログイン完了後、cookieを取得
chrome.cookies.get({
  url: 'https://www.db.yugioh-card.com',
  name: 'JSESSIONID'
}, (cookie) => {
  // セッション情報を保存
});
```

#### 方法2: chrome.identity APIの検討
**注意**: 標準のOAuth 2.0フローだが、KONAMI IDが外部アプリからのアクセスを許可しているか不明

### ❌ 不可能な方法
- HTTPOnlyのcookieをcontent scriptから直接読み取り
- Authorization codeをaccess tokenに交換（サーバーサイド処理が必要）

## セキュリティ考慮事項

### CSRF保護
- `state`パラメータでCSRF攻撃を防御
- 各リクエストでランダムな値を生成

### Cookie属性
- `Secure`: HTTPS通信のみ
- `HttpOnly`: JavaScriptからアクセス不可
- `SameSite=None`: クロスサイトでのcookie送信を許可（CORS対応）

## 次のステップ

### 必須調査
- [ ] ログイン後のセッション検証方法
- [ ] セッションの有効期限
- [ ] セッションリフレッシュの仕組み
- [ ] ログアウト処理の詳細

### デッキ管理API調査
- [ ] マイデッキ一覧取得のリクエスト詳細
- [ ] デッキ作成/編集時のリクエストパラメータ
- [ ] ytkn（CSRFトークン）の取得方法
- [ ] cgidの役割と取得方法

## 実装上の制約

### Chrome拡張機能で対応可能
✅ chrome.cookies APIでcookie管理
✅ chrome.tabs APIでログインフロー管理
✅ Background scriptで認証状態監視

### 制約事項
⚠️ ユーザーは通常通りKONAMI IDでログインする必要がある
⚠️ 完全自動ログインは不可（セキュリティ上適切）
⚠️ HttpOnly cookieのため、content scriptから直接アクセス不可

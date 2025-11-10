# 遊戯王公式サイト調査レポート

## 調査日時
2025年10月21日

## 1. 基本情報

### サイト構造
- ベースURL: `https://www.db.yugioh-card.com/yugiohdb/`
- セキュリティ: HTTPS強制、HSTS有効
- CDN: Imperva (DDoS保護、WAF)
- サーバー: Nginx
- ヘッダー保護: X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff

### Cookie情報
検出されたCookie:
1. `AWSALB` - AWS ALB (ロードバランサー)セッション、有効期限7日
2. `AWSALBCORS` - CORS対応版、SameSite=None; Secure
3. `visid_incap_*` - Imperva訪問者ID、HttpOnly、有効期限1年
4. `nlbi_*` - Imperva、HttpOnly
5. `incap_ses_*` - Impervaセッション

### セキュリティ制約
- CORS制約あり (SameSite=None対応が必要な箇所あり)
- HttpOnly cookieが使用されている
- X-Frame-Options設定済み（iframe制限）

## 2. カード検索API

### エンドポイント
`/yugiohdb/card_search.action`

### パラメータ（確認済み）
- `ope`: 操作タイプ (1=検索)
- `sess`: セッション識別子
- `rp`: Results per page (1ページあたりの結果数)
- `mode`: 表示モード
- `sort`: ソート順
- `keyword`: キーワード検索
- `stype`: 検索タイプ
- `ctype`: カードタイプ
- `attr`: 属性
- `species`: 種族
- `othercon`: その他条件
- `other`: その他フィルター
- `request_locale`: 言語 (ja/en)
- `page`: ページ番号

### レスポンス形式
- HTML形式（JSON APIなし）
- jQueryとjQuery UIを使用
- クライアントサイドでのDOM操作

### 使用ライブラリ
- jQuery 3.6.0
- jQuery UI 1.13.1
- common.js（独自スクリプト）

## 3. 認証・ログイン（要調査）

### 次のステップ
- [ ] ログインページのURL特定
- [ ] ログインフォームの構造解析
- [ ] KONAMI IDの認証フロー解析
- [ ] セッション管理方法の特定
- [ ] 認証トークン（ytkn, cgid等）の取得方法

## 4. 技術的考察

### Chrome拡張機能での実装可能性
✅ 実装可能:
- カード検索のスクレイピング（HTMLパース）
- コンテンツスクリプトでのDOM操作
- ローカルストレージでのデータ保存

⚠️ 注意が必要:
- CORS制約への対応（拡張機能のpermissionsで解決可能）
- HttpOnly cookieの扱い（background scriptで対応）
- Imperva WAFによるレート制限の可能性

### 推奨アプローチ
1. Content Scriptで公式サイトのDOM直接操作
2. Background Scriptで認証状態管理
3. chrome.cookies APIでcookie管理
4. chrome.storage APIでローカルキャッシュ

## 5. 次の調査項目

### 最優先
1. ログインフローの完全な解析
2. デッキ管理APIのリクエスト/レスポンス詳細
3. CSRFトークン（ytkn）の取得・使用方法

### 中優先  
4. カード画像取得のCORS制約詳細
5. レート制限の有無と詳細
6. エラーハンドリング仕様

### 低優先
7. FAQ取得API
8. 統計情報の取得方法

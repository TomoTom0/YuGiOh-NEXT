# スクレイピング手順

遊戯王DB公式サイトからカード情報やQA情報をスクレイピングで取得する手順を記載します。

## 概要

遊戯王DB公式サイトの以下のページは**認証不要**でアクセス可能です：

- カード検索結果ページ
- カード詳細ページ
- カードQA一覧ページ
- 個別QA詳細ページ

ただし、単純な`curl`では検索結果が取得できません。**セッション確立後に検索を実行する**必要があります。

## カード情報の取得方法

### 手順

1. **検索フォームページにアクセスしてセッションを確立**

```bash
curl -s -c cookies.txt -b cookies.txt \
  -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja" \
  > /dev/null
```

2. **セッションCookieを使って検索結果を取得**

```bash
curl -s -b cookies.txt \
  -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sort=21&page=1&mode=1&stype=1&link_m=2&othercon=2&releaseYStart=1999&releaseMStart=1&releaseDStart=1&rp=2000&request_locale=ja" \
  -o page-1.html
```

### 重要なポイント

#### セッション確立が必須

- 最初に検索フォームページにアクセスしないと、検索結果ページはトップページにリダイレクトされる
- `-c cookies.txt -b cookies.txt`でCookieを保存・読み込みすることでセッションを維持

#### User-Agentヘッダー

- User-Agentヘッダーを設定しないと、正しいHTMLが返されない可能性がある

#### URLパラメータ

主要なパラメータ：

| パラメータ | 説明 | 値の例 |
|-----------|------|--------|
| `ope` | 操作種別 | `1` = 検索実行 |
| `sort` | ソート順 | `21` = カードID順 |
| `page` | ページ番号 | `1`, `2`, ... |
| `rp` | 1ページあたりの表示件数 | `10`, `100`, `2000` |
| `request_locale` | 言語 | `ja`, `en` |
| `mode` | モード | `1` |
| `stype` | 検索タイプ | `1` |
| `link_m` | リンクモード | `2` |
| `othercon` | その他条件 | `2` |
| `releaseYStart` | 発売開始年 | `1999` |
| `releaseMStart` | 発売開始月 | `1` |
| `releaseDStart` | 発売開始日 | `1` |

※ `rp=2000`を指定すると、1ページに最大2000件のカード情報が取得できます

### 全件取得の例

2025年11月時点で約13,754件のカードが存在するため、`rp=2000`で7ページ取得する必要があります：

```bash
# セッション確立
curl -s -c cookies.txt -b cookies.txt \
  -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  "https://www.db.yugioh-card.com/yugiohdb/card_search.action?request_locale=ja" \
  > /dev/null

# 全ページ取得
for page in 1 2 3 4 5 6 7; do
  echo "Fetching page $page..."
  curl -s -b cookies.txt \
    -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    "https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sort=21&page=$page&mode=1&stype=1&link_m=2&othercon=2&releaseYStart=1999&releaseMStart=1&releaseDStart=1&rp=2000&request_locale=ja" \
    -o "page-$page.html"
done
```

## 取得したHTMLの構造

検索結果HTMLには、以下の構造でカード情報が含まれています：

```html
<div id="card_list" class="list">
  <div class="t_row c_normal open">
    <!-- カード情報 -->
    <div class="box_card_img icon">
      <img id="card_image_0_1" src="..." />
    </div>
    <dl class="flex_1">
      <dd class="box_card_name">
        <span class="card_ruby">カード名のルビ</span>
        <span class="card_name">カード名</span>
      </dd>
      <!-- その他のカード属性 -->
    </dl>
  </div>
  <!-- 他のカード... -->
</div>
```

各 `.t_row` 要素が1枚のカード情報を表しています。

## パース方法

取得したHTMLは、既存のパース関数を使って処理できます：

```typescript
import { parseSearchResultRow, extractImageInfo } from '../../../src/api/card-search';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';

const html = fs.readFileSync('page-1.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action'
});
const doc = dom.window.document as unknown as Document;

// 画像情報を抽出
const imageInfoMap = extractImageInfo(doc);

// 各カード行をパース
const rows = doc.querySelectorAll('.t_row');
const cards = Array.from(rows).map(row =>
  parseSearchResultRow(row as HTMLElement, imageInfoMap)
);
```

詳細は `tests/combine/parser/card-search.test.ts` を参照してください。

## その他のスクレイピング対象

### カード詳細ページ

URL: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid={カードID}`

- `cid`: カードID

### カードQA一覧

URL: `https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid={カードID}&sort=1`

- `cid`: カードID
- `sort`: ソート順

### 個別QA詳細

URL: `https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid={FAQ ID}`

- `fid`: FAQ ID

これらも同様にセッション確立後にアクセスすることで取得できます。

## トラブルシューティング

### トップページが返される

- セッション確立を行っていない → 先に検索フォームページにアクセス
- Cookieが適切に保存・読み込まれていない → `-c` と `-b` オプションを確認

### 検索結果が0件

- `rp`パラメータが大きすぎる → サーバー側の制限により、実際には2000件が上限
- パラメータの組み合わせが不正 → サンプルURLを参照

### 文字化けする

- `request_locale=ja`を指定
- レスポンスの`Content-Type`が`text/html;charset=UTF-8`であることを確認

## 参考

- サンプルURL: `tests/sample/url.md`
- テストデータ: `tests/combine/data/card-search-result.html`
- パーサーテスト: `tests/combine/parser/card-search.test.ts`

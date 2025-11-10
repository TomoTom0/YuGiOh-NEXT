# カード情報のHTML構造調査結果

## 調査日時
2025-10-30

## 概要

遊戯王ニューロンの各ページにおけるカード情報のHTML構造を調査し、効率的なデータ抽出方法を特定した。

## 1. 検索結果ページの構造

### URL形式
```
https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&request_locale=ja&[検索パラメータ]
```

### カードアイテムの構造

各カードは`.t_row.c_normal`クラスのdiv要素として表現される：

```html
<div class="t_row c_normal open">
  <!-- カード画像 -->
  <div class="box_card_img icon">
    <div class="cardimg">
      <img id="card_image_0_1"
           src="/yugiohdb/get_image.action?type=1&osplang=1&cid=21385&ciid=1&enc=..."
           alt="カード名"
           title="カード名">
    </div>
  </div>

  <!-- カード情報 -->
  <dl class="flex_1">
    <!-- カード名 -->
    <dd class="box_card_name flex_1 top_set">
      <span class="card_ruby">ふりがな</span>
      <span class="card_name">カード名</span>
    </dd>

    <!-- 削除ボタン（マイリスト機能） -->
    <dd class="remove_btn top_set">
      <a href="javascript:void(0);" class="btn hex red">
        <span>X</span>
        <input type="hidden" class="lang" value="">
        <input type="hidden" class="cid" value="21385">
      </a>
    </dd>

    <!-- 属性・種類・効果 -->
    <dd class="box_card_spec flex_1">
      <span class="box_card_attribute">
        <img src="external/image/parts/attribute/attribute_icon_light.png" alt="光属性">
        <span>光属性</span>
      </span>

      <!-- レベル/ランク/リンク（モンスターの場合） -->
      <span class="box_card_level_rank level">
        <img src="external/image/parts/icon_level.png" alt="レベル">
        <span>レベル 8</span>
      </span>

      <!-- 種族・カードタイプ -->
      <span class="card_info_species_and_other_item">
        【ドラゴン族／通常】
      </span>

      <!-- ATK/DEF（モンスターの場合） -->
      <span>攻撃力 3000</span>
      <span>守備力 2500</span>
    </dd>

    <!-- カードテキスト -->
    <dd class="box_card_text c_text flex_1">
      カードの効果テキスト...
    </dd>
  </dl>

  <!-- Hidden inputs -->
  <input type="hidden" class="cnm" value="カード名">
  <input type="hidden" class="fltype" value="">
  <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&cid=21385">
</div>
```

### 抽出可能な情報

#### 基本情報
- **カード名**: `.card_name`
- **ふりがな**: `.card_ruby`
- **カードID (cid)**: `input.cid`の`value`属性
- **画像URL**: `.box_card_img img`の`src`属性
- **詳細ページリンク**: `input.link_value`の`value`属性

#### モンスターカードの場合
- **属性**: `.box_card_attribute span`（テキスト）、またはimg要素の`src`からアイコンパス
- **レベル/ランク/リンク**: `.box_card_level_rank span`
- **種族・タイプ**: `.card_info_species_and_other_item`
- **攻撃力**: テキストから抽出（「攻撃力 XXXX」）
- **守備力**: テキストから抽出（「守備力 XXXX」）

#### 魔法・罠カードの場合
- **種類**: `.box_card_attribute span`（「魔法」「罠」）
- **効果種類**: `.box_card_effect span`（「速攻」「永続」「装備」など）

#### カードテキスト
- **効果テキスト**: `.box_card_text`

### ページネーション

```html
<div class="page_num">
  <p class="nowpage">1</p>
  <a href="javascript:ChangePage(2)" title="2ページ">2</a>
  <a href="javascript:ChangePage(3)" title="3ページ">3</a>
  ...
  <a class="yaji" href="javascript:ChangePage(6)">›</a>
  <a class="yaji max" href="javascript:ChangePage(1343)">»</a>
</div>
```

## 2. カード詳細ページの構造

### URL形式
```
https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=[カードID]&request_locale=ja
```

### 基本情報

カード詳細ページでは、検索結果ページと同様のクラス構造を持つが、より詳細な情報が含まれる。

### 2.1 収録パック情報

収録パックは`.t_row`形式でリスト表示される：

```html
<div class="t_body">
  <div class="t_row">
    <div class="inside">
      <!-- 発売日 -->
      <div class="time">2025-05-30</div>

      <div class="flex_1 contents">
        <!-- カードナンバー -->
        <div class="card_number">SSC1-JP001</div>

        <!-- パック名 -->
        <div class="pack_name flex_1">
          サンスター コラボ記念カード
        </div>

        <!-- パックへのリンク -->
        <input type="hidden" class="link_value"
               value="/yugiohdb/card_search.action?ope=1&sess=1&pid=1000009507000&rp=99999">
      </div>

      <!-- レアリティ -->
      <div class="icon rarity">
        <div class="lr_icon rid_9" style="background-color:#957fd5;">
          <p>P</p>
          <span>パラレル仕様</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 抽出可能な情報
- **発売日**: `.time`
- **カードナンバー**: `.card_number`
- **パック名**: `.pack_name`
- **パック検索リンク**: `input.link_value`
- **レアリティ**: `.lr_icon p`（略称）、`.lr_icon span`（正式名称）
- **レアリティID**: `.lr_icon`のクラス名から（例: `rid_9`）

### 2.2 関連カード情報

関連カードは検索結果と同じ`.t_row.c_normal`構造を使用：

```html
<h3><span class="card">関連カード</span></h3>

<div class="sort_set">
  <div class="text">検索結果 47件中 1～10件を表示</div>
  <!-- ソート・表示件数の選択 -->
</div>

<!-- カードリスト（検索結果と同じ構造） -->
<div class="list_style list">
  <div class="t_row c_normal open">
    <!-- カード情報（検索結果と同じ） -->
  </div>
  ...
</div>
```

### 2.3 Q&A情報

#### Q&A一覧ページへのリンク

```html
<a href="/yugiohdb/faq_search.action?ope=4&cid=4007">
  このカードのＱ＆Ａを表示
</a>
```

#### Q&A一覧ページの構造

URL: `https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=[カードID]&request_locale=ja`

```html
<div class="t_row">
  <div class="inside">
    <div class="dack_set flex_1">
      <!-- 質問タイトル -->
      <div class="dack_name">
        <span class="name">質問のタイトル</span>
      </div>

      <!-- タグ -->
      <div class="text">
        <div class="tag_name"><span>モンスター</span></div>
      </div>
    </div>

    <!-- 更新日 -->
    <div class="div date">
      <span>
        <span>更新日:</span>
        2025-01-25
      </span>
    </div>
  </div>

  <!-- Q&A詳細ページへのリンク -->
  <input type="hidden" class="link_value"
         value="/yugiohdb/faq_search.action?ope=5&fid=17900&keyword=&tag=-1">
</div>
```

#### 抽出可能な情報
- **質問タイトル**: `.dack_name .name`
- **タグ**: `.tag_name span`
- **更新日**: `.div.date span`
- **Q&A詳細リンク**: `input.link_value`

## 3. デッキ編集ページの構造

既存のドキュメント`docs/design/edit/deck-edit.md`を参照。

### フォーム構造の要点

- **フォームID**: `form_regist`
- **メソッド**: GET（表示）、POST（保存時）
- **カード情報フィールド**:
  - `monm`: カード名（text input）
  - `monum`: 枚数（text input）
  - `monsterCardId`: カードID（hidden input）
  - `imgs`: 画像ID（hidden input）

## 4. 実装時の考慮事項

### 4.1 言語設定

すべてのリクエストに`request_locale=ja`パラメータを付与することで、日本語版のページを取得できる。

### 4.2 セレクター優先順位

1. **最優先**: クラスベースのセレクター（`.t_row`、`.box_card_name`など）
2. **代替**: ID属性（ただしページごとに変わる可能性あり）
3. **最終手段**: タグ名やテキスト検索

### 4.3 エラーハンドリング

- 要素が見つからない場合のnullチェック
- 画像URLのエラー処理（404など）
- ページネーションの境界チェック

### 4.4 パフォーマンス最適化

- 検索結果ページから直接情報を抽出（詳細ページへの遷移を最小化）
- 必要な情報のみを抽出（不要な要素のスキップ）
- バッチ処理の実装（複数カードの一括取得）

## 5. 次のステップ

1. HTMLパーサーの実装
2. TypeScriptの型定義作成
3. ユニットテストの作成
4. Chrome拡張機能への統合

## 参考資料

- [検索パラメータ仕様書](./card-search/card-search-parameters-complete.md)
- [デッキ編集仕様書](../design/edit/deck-edit.md)

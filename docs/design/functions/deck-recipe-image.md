# デッキレシピ画像作成機能

最終更新: 2025-11-07

## 概要

遊戯王Neuronアプリのデッキレシピ風の画像を生成する機能。
公式データベースのデッキから、共有可能なJPEG画像を作成します。

## 機能仕様

### 基本機能

- **入力**: デッキデータ（メイン・エクストラ・サイドデッキ）
- **出力**: JPEG画像（750px幅、高さは可変）
- **品質**: JPEG品質80%
- **解像度**: 2倍レンダリング（Retina対応）

### カラーバリエーション

1. **赤バリエーション**（左クリック）
   - グラデーション: `#760f01` → `#240202`
   - ボーダー: `#fcc4c4`
   - アクセント: `#ed1b1b`

2. **青バリエーション**（右クリック、デフォルト）
   - グラデーション: `#003d76` → `#011224`
   - ボーダー: `#c7ecfc`
   - アクセント: `#1485ed`

### 画像構成

```
┌─────────────────────────────────────┐
│ Deck Name                           │ <- デッキ名（28px、太字）
├─────────────────────────────────────┤
│ [Back] Main Deck: 40 Cards          │ <- セクションヘッダー
│ ┌────┬────┬────┬────┬────┐         │
│ │card││card││card││card││card│       │ <- カード画像（10列）
│ └────┴────┴────┴────┴────┘         │
├─────────────────────────────────────┤
│ [Back] Extra Deck: 15 Cards         │
│ ┌────┬────┬────┬────┬────┐         │
│ │card││card││card││card││card│       │
│ └────┴────┴────┴────┴────┘         │
├─────────────────────────────────────┤
│ [Back] Side Deck: 15 Cards          │
│ ┌────┬────┬────┬────┬────┐         │
│ │card││card││card││card││card│       │
│ └────┴────┴────┴────┴────┘         │
├─────────────────────────────────────┤ <- 公開デッキのみ
│ [QR] Deck URL                       │ <- QRコード（128x128px）
├─────────────────────────────────────┤
│         exported on 2025/11/07      │ <- タイムスタンプ
└─────────────────────────────────────┘
```

### QRコード生成

**条件**: 公開デッキのみ（非公開デッキでは生成しない）

**判定方法**:
```javascript
// デッキ公開フラグの取得
const flag_private = document.getElementById("pflg") !== null ?
    document.getElementById("pflg").value == "0" :
    ["Private", "非公開"].indexOf(
        document.querySelector("#broad_title h1")
            .textContent.match(/【([^】]+)】/)[1].trim()
    ) !== -1;
```

**QRコードURL**: `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid={cgid}&dno={dno}`

**サイズ**: 128x128px（2倍レンダリング時は256x256px）
**補正レベル**: M（Medium）

## 技術実装

### 使用ライブラリ

1. **html2canvas** (v1.x)
   - 用途: HTML要素のキャプチャ（旧実装、現在は使用していない可能性）
   - ファイル: `ref/YGO_deck_extension/src_old/js/html2canvas.min.js`

2. **qrcode.js**
   - 用途: QRコード生成
   - ファイル: `ref/YGO_deck_extension/src_old/js/qrcode.min.js`
   - GitHub: https://github.com/davidshimjs/qrcodejs

### Canvas描画処理

#### 1. Canvas初期化

```javascript
const ratio = 2; // Retina対応
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

// サイズ計算
const can_width = 750 * ratio;
const can_height = ratio * (
    (img_qr !== null ? 80 : 0) + // QRコードエリア
    65 +                          // ヘッダー
    49 +                          // デッキ名エリア
    set_imgs.map(([_, imgs]) =>
        34 + Math.ceil(imgs.length / 10) * 107 // セクション毎
    ).reduce((acc, cur) => acc + cur, 0)
);

canvas.width = can_width;
canvas.height = can_height;
```

#### 2. 背景グラデーション

```javascript
const lg_all = ctx.createLinearGradient(can_width, 0, 0, can_height);
lg_all.addColorStop(0, cinfo.gradient_all_ne); // 右上
lg_all.addColorStop(1, cinfo.gradient_all_sw); // 左下

ctx.fillStyle = lg_all;
ctx.fillRect(0, 0, can_width, can_height);
```

#### 3. デッキ名描画

```javascript
ctx.font = `bold ${28 * ratio}px Yu Gothic, ヒラギノ角ゴ`;
ctx.fillStyle = cinfo.font; // #ffffff
ctx.fillText(deck_name, 7 * ratio, 35 * ratio);
```

#### 4. セクション描画（Main/Extra/Side）

各セクションについて：

```javascript
// セクションヘッダー背景
const lg_set_name = ctx.createLinearGradient(
    747, height_now + 17 * ratio,
    3 * ratio, height_now + 17 * ratio
);
lg_set_name.addColorStop(0, cinfo.gradient_name_e);
lg_set_name.addColorStop(1, cinfo.gradient_name_w);

ctx.fillStyle = lg_set_name;
ctx.fillRect(3 * ratio, height_now + 3 * ratio,
             can_width - 6 * ratio, 28 * ratio);

// カードバック画像
ctx.drawImage(img_back, 8 * ratio, height_now + 9 * ratio,
              14 * ratio, 17 * ratio);

// セクション名とカード数
ctx.fillText(
    `${set_name} Deck: ${imgs.length} Cards`,
    32 * ratio, height_now + 25 * ratio
);

// カード画像（10列で配置）
Array.from(imgs).forEach((img, ind) => {
    ctx.drawImage(img,
        75 * ratio * (ind % 10),           // X: 10列
        height_now + 107 * ratio * Math.floor(ind / 10), // Y: 行
        73 * ratio, 107 * ratio            // サイズ
    );
});
```

#### 5. QRコード描画（公開デッキのみ）

```javascript
if (img_qr !== null) {
    // QRコード画像
    ctx.drawImage(img_qr,
        8 * ratio, height_now + 8 * ratio,
        128 * ratio, 128 * ratio
    );

    // "Deck URL" ラベル
    ctx.lineWidth = 6 * ratio;
    ctx.strokeStyle = cinfo.gradient_all_ne;
    ctx.strokeText("Deck URL", 24 * ratio, height_now + 8 * ratio + 72 * ratio);
    ctx.fillStyle = cinfo.border_line;
    ctx.fillText("Deck URL", 24 * ratio, height_now + 8 * ratio + 72 * ratio);
}
```

#### 6. タイムスタンプ描画

```javascript
ctx.fillStyle = cinfo.font;
ctx.direction = "rtl"; // 右揃え

const date = new Date();
ctx.fillText(
    `exported on ${date.toLocaleDateString()}`,
    can_width - 10 * ratio,
    can_height - 12 * ratio
);
```

#### 7. 画像ダウンロード

```javascript
canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const date = new Date();
    const tail_date = date.toISOString()
        .replace(/[:]/g, "-")
        .replace(/\..+/, "");

    const file_name = `${deck_name}_${tail_date}.jpg`;
    a.download = file_name;
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}, "image/jpeg", 0.8); // JPEG品質80%
```

## デッキデータ取得

### カード画像の取得

```javascript
// 既存の#deck_imageから取得
const set_imgs = ["main", "extra", "side"].map(set_name =>
    [set_name, document.querySelectorAll(
        `#deck_image #${set_name}.card_set div.image_set span>img`
    )]
).filter(([_, imgs]) => imgs.length !== 0);

// デッキ画像が存在しない場合、一時的に生成
if (set_imgs.length === 0) {
    const div_tmp = createElement("div", { id: "deck_image_tmp" });
    addStyle(div_tmp, {
        scale: "0.1",
        position: "absolute",
        top: "0px"
    });
    document.querySelector("body").append(div_tmp);

    const df = await obtainDF(obtainLang());
    const row_results = obtainRowResults(df);
    const row_results_new = await sortCards(row_results);
    insertDeckImg(df, row_results_new, true, div_tmp);

    // 再取得
    const set_imgs = ["main", "extra", "side"].map(...);

    // 画像ロード待機
    await Promise.all(imgs_all.map(img =>
        new Promise(resolve => {
            if (img === null) resolve();
            img.addEventListener("load", () => resolve());
        })
    ));
}
```

### デッキ名の取得

```javascript
const dnm = document.getElementById("dnm");
const deck_name = dnm === null ?
    // 旧UI（2024/9/11以前）
    document.querySelector("#broad_title h1")
        .innerHTML.split("<br>")[0].split("】")[1].trim() :
    // 新UI（2024/9/11以降）
    (dnm.value || dnm.getAttribute("placeholder"));
```

## カード画像サイズ

- **Canvas上のサイズ**: 73x107px（ratio=1の場合）
- **実際のレンダリング**: 146x214px（ratio=2）
- **配置**: 10列グリッド、75px間隔

## フォント

- **ファミリー**: `Yu Gothic, ヒラギノ角ゴ`
- **デッキ名**: `bold 28px`
- **セクション名**: `21px`

## 参照ファイル

### 旧拡張機能

- **メイン実装**: `ref/YGO_deck_extension/src_old/script/main_functions.js:1926-2113`
- **ライブラリ**:
  - `ref/YGO_deck_extension/src_old/js/qrcode.min.js`
  - `ref/YGO_deck_extension/src_old/js/html2canvas.min.js`（未使用の可能性）
- **カードバック画像**: `ref/YGO_deck_extension/src/images/ja/card_back.png`

### ドキュメント

- **機能紹介**: `ref/YGO_deck_extension/intro/NEWS_v2p4.md`
- **スクリーンショット**: `ref/YGO_deck_extension/intro/imgs/deck_recipie_screenshot.jpg`

## 実装時の注意点

1. **画像ロード待機**: すべてのカード画像がロードされるまで待つ必要がある
2. **QRコード生成**: 公開デッキかどうかの判定が必要
3. **URL解析**: cgid, dnoをURLから抽出する必要がある
4. **カラー選択**: クリックイベント（e.button）で色を切り替え
5. **タイムゾーン**: タイムスタンプはローカル時刻を使用
6. **ファイル名**: 日付をISO8601形式（ハイフン区切り）で含める

## 今後の実装計画

### Phase 1: 基本機能の移植

- [ ] Canvas描画ロジックの実装
- [ ] カード画像取得の実装
- [ ] デッキ名取得の実装
- [ ] ダウンロード機能の実装

### Phase 2: QRコード対応

- [ ] qrcode.jsライブラリの統合
- [ ] 公開フラグ判定の実装
- [ ] QRコード生成と描画

### Phase 3: UI統合

- [ ] ボタンUIの追加
- [ ] カラー選択機能
- [ ] プログレス表示

### Phase 4: 最適化

- [ ] 画像ロード最適化
- [ ] エラーハンドリング
- [ ] TypeScript型定義

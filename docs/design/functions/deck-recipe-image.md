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

## 関数設計

### 責務の分離

デッキレシピ画像機能は以下の2つの関数に分離する：

#### 1. `createDeckRecipeImage()` - 画像作成関数

**役割**: パラメータに基づいてデッキレシピ画像を生成する純粋な作成関数

**シグネチャ**:
```typescript
async function createDeckRecipeImage(
  options: CreateDeckRecipeImageOptions
): Promise<Blob>

interface CreateDeckRecipeImageOptions {
  /** デッキ番号 */
  dno: string;

  /** QRコードを含めるか */
  includeQR: boolean;

  /** スケール倍率（デフォルト: 2、Retina対応） */
  scale?: number;

  /** カラーバリエーション */
  color: 'red' | 'blue';

  /** ファイル名（オプション、ダウンロード時に使用） */
  fileName?: string;

  /** デッキデータ（既に取得済みの場合、パフォーマンス最適化） */
  deckData?: DeckData;
}
```

**処理フロー**:
1. デッキデータの取得（`deckData`が未指定の場合、APIから取得）
2. Canvasの初期化（`scale`倍率適用）
3. 背景グラデーション描画（`color`に応じて）
4. デッキ名描画
5. カードセクション（Main/Extra/Side）描画
6. QRコード描画（`includeQR=true`の場合）
7. タイムスタンプ描画
8. `canvas.toBlob()`でJPEG Blob化（品質80%）して返す

**利点**:
- 純粋関数に近い形でテスト可能
- Blobを返すため、ダウンロード以外の用途（プレビュー、アップロード）にも使用可能
- 依存性が明確

#### 2. `downloadDeckRecipeImage()` - ダウンロード関数

**役割**: 画像作成関数を内部で呼び出し、ブラウザダウンロードまで実行する高レベル関数

**シグネチャ**:
```typescript
async function downloadDeckRecipeImage(
  options: DownloadDeckRecipeImageOptions
): Promise<void>

interface DownloadDeckRecipeImageOptions
  extends CreateDeckRecipeImageOptions {
  // createDeckRecipeImageと同じオプション
}
```

**処理フロー**:
1. `createDeckRecipeImage(options)`を呼び出し
2. 返されたBlobを受け取る
3. `URL.createObjectURL(blob)`でダウンロードURL作成
4. `<a>`要素を動的生成
   - `href`: 作成したURL
   - `download`: ファイル名（`{deck_name}_{ISO8601_timestamp}.jpg`）
5. `a.click()`でダウンロード実行
6. クリーンアップ（`URL.revokeObjectURL(url)`, `a.remove()`）

**利点**:
- ユーザーが直接呼び出すシンプルなAPI
- 内部で作成関数を使用するため、ロジックの重複なし

### 使用例

#### 例1: 直接ダウンロード
```typescript
// ユーザーがボタンをクリックした際の処理
await downloadDeckRecipeImage({
  dno: '1',
  color: 'red',
  includeQR: true
});
```

#### 例2: プレビュー表示
```typescript
// プレビューモーダルに表示
const blob = await createDeckRecipeImage({
  dno: '1',
  color: 'blue',
  includeQR: false,
  scale: 1 // プレビューは1倍でOK
});

const imgElement = document.createElement('img');
imgElement.src = URL.createObjectURL(blob);
previewContainer.appendChild(imgElement);
```

#### 例3: サーバーにアップロード
```typescript
// デッキレシピをサーバーに保存
const blob = await createDeckRecipeImage({
  dno: '1',
  color: 'red',
  includeQR: true
});

const formData = new FormData();
formData.append('image', blob, 'deck-recipe.jpg');
await fetch('/api/deck-recipes', {
  method: 'POST',
  body: formData
});
```

#### 例4: 複数カラーを一括生成
```typescript
// 赤と青の両方を生成
const [redBlob, blueBlob] = await Promise.all([
  createDeckRecipeImage({ dno: '1', color: 'red', includeQR: true }),
  createDeckRecipeImage({ dno: '1', color: 'blue', includeQR: true })
]);

// それぞれダウンロード
downloadBlob(redBlob, 'deck-red.jpg');
downloadBlob(blueBlob, 'deck-blue.jpg');
```

## 今後の実装計画

### Phase 1: 基本機能の実装

- [ ] TypeScript型定義の作成
  - [ ] `CreateDeckRecipeImageOptions`
  - [ ] `DeckData`インターフェース
  - [ ] `ColorVariant`型
- [ ] `createDeckRecipeImage()`の実装
  - [ ] Canvas初期化ロジック
  - [ ] 背景グラデーション描画
  - [ ] デッキ名描画
  - [ ] カードセクション描画
  - [ ] タイムスタンプ描画
  - [ ] Blob変換
- [ ] ユニットテストの作成

### Phase 2: ダウンロード機能の実装

- [ ] `downloadDeckRecipeImage()`の実装
  - [ ] ファイル名生成ロジック
  - [ ] ダウンロードトリガー
  - [ ] クリーンアップ処理
- [ ] エラーハンドリング
  - [ ] デッキデータ取得失敗
  - [ ] Canvas描画エラー
  - [ ] ブラウザ互換性チェック

### Phase 3: QRコード対応

- [ ] qrcode.jsライブラリの統合
  - [ ] npm packageの追加
  - [ ] TypeScript型定義
- [ ] 公開フラグ判定の実装
  - [ ] DOMから判定ロジック
  - [ ] APIレスポンスから判定
- [ ] QRコード生成と描画
  - [ ] 128x128pxサイズ
  - [ ] 補正レベルM
  - [ ] Canvas描画統合

### Phase 4: UI統合

- [ ] ボタンUIの追加
  - [ ] 左クリック: 赤バリエーション
  - [ ] 右クリック: 青バリエーション
- [ ] カラー選択UI
  - [ ] プレビュー機能
  - [ ] カスタムカラー対応（将来）
- [ ] プログレス表示
  - [ ] 画像生成中インジケーター
  - [ ] キャンセル機能

### Phase 5: 最適化とテスト

- [ ] パフォーマンス最適化
  - [ ] 画像ロードの並列化
  - [ ] Canvas描画の最適化
  - [ ] メモリ管理（Blob/URLの適切な破棄）
- [ ] E2Eテスト
  - [ ] 実際のデッキデータでのテスト
  - [ ] 各カラーバリエーションのテスト
  - [ ] QRコード有無のテスト
- [ ] ドキュメント整備
  - [ ] API仕様書
  - [ ] 使用例集
  - [ ] トラブルシューティングガイド

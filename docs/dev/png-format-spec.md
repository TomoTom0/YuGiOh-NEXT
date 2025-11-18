# PNG tEXt チャンク使用規約

YGO Deck Helperでは、デッキ情報をPNG画像のメタデータ領域（tEXtチャンク）に埋め込みます。

## 概要

### 技術仕様
- **形式**: PNG tEXtチャンク（ISO/IEC 15948:2004 準拠）
- **文字エンコーディング**: Latin-1（ISO-8859-1）
- **配置**: IENDチャンクの直前
- **CRC検証**: PNG仕様に準拠したCRC-32チェックサム

### 採用理由
1. **標準準拠**: PNGの公式仕様で定義されたメタデータ領域
2. **画質非破壊**: 画像データに一切影響しない
3. **互換性**: 標準的な画像ビューアで表示可能
4. **可搬性**: SNS・メッセンジャーでの共有時も保持される（多くの場合）

## tEXtチャンク構造

### バイナリフォーマット

```
[Length: 4 bytes]  - チャンクデータ長（ビッグエンディアン）
[Type: 4 bytes]    - "tEXt" (0x74455874)
[Data: N bytes]    - キー\0値（Latin-1エンコード）
[CRC: 4 bytes]     - Type + Data のCRC-32（ビッグエンディアン）
```

### データ部構造

```
[Keyword: 1-79 bytes]  - キーワード（Latin-1）
[Null: 1 byte]         - NULL区切り文字（0x00）
[Text: 0-N bytes]      - テキストデータ（Latin-1）
```

## 実装詳細

### キーワード定義

**キー名**: `DeckInfo`

**理由**:
- 簡潔で明確
- 他のアプリケーションとの名前衝突を避ける
- PNGのキーワード規約に準拠（1-79文字、Latin-1）

### 値のフォーマット

**形式**: JSON文字列（SimpleDeckInfo型）

```typescript
interface SimpleDeckInfo {
  main: Array<{
    cid: string;      // カードID
    ciid: string;     // イラストID
    enc: string;      // 画像ハッシュ
    quantity: number; // 枚数
  }>;
  extra: Array<{ cid: string; ciid: string; enc: string; quantity: number }>;
  side: Array<{ cid: string; ciid: string; enc: string; quantity: number }>;
}
```

**例**:
```json
{
  "main": [
    {"cid": "12950", "ciid": "1", "enc": "12950_1_1_1", "quantity": 2},
    {"cid": "4861", "ciid": "2", "enc": "4861_2_1_1", "quantity": 1}
  ],
  "extra": [
    {"cid": "9753", "ciid": "1", "enc": "9753_1_1_1", "quantity": 1}
  ],
  "side": [
    {"cid": "14558", "ciid": "1", "enc": "14558_1_1_1", "quantity": 3}
  ]
}
```

### エンコーディング処理

1. **SimpleDeckInfoの生成**
   - DeckInfoからカード名などの不要な情報を除外
   - 最小限のフィールド（cid, ciid, enc, quantity）のみ保持

2. **JSON文字列化**
   - `JSON.stringify()`で文字列化
   - 改行・インデントなし（コンパクト形式）

3. **UTF-8 → Latin-1変換**
   - TextEncoder/TextDecoderを使用
   - JSON自体がASCIIベースなので、通常は問題なし
   - 注意: カード名を含めない理由の一つ（多言語文字対応の複雑さ回避）

## 実装ガイド

### 埋め込み処理（`embedDeckInfoToPNG`）

```typescript
async function embedDeckInfoToPNG(
  pngBlob: Blob,
  deckInfo: DeckInfo
): Promise<Blob> {
  // 1. PNGバイナリ読み込み
  const pngData = new Uint8Array(await pngBlob.arrayBuffer());
  
  // 2. PNGシグネチャ検証
  validatePngSignature(pngData);
  
  // 3. IENDチャンク位置を探索
  const iendPosition = findIENDChunk(pngData);
  
  // 4. SimpleDeckInfo生成
  const simpleDeck = simplifyDeckInfo(deckInfo);
  const json = JSON.stringify(simpleDeck);
  
  // 5. tEXtチャンク作成
  const textChunk = createTextChunk('DeckInfo', json);
  
  // 6. IEND前に挿入
  const newPng = insertBeforeIEND(pngData, textChunk, iendPosition);
  
  return new Blob([newPng], { type: 'image/png' });
}
```

### 抽出処理（`extractDeckInfoFromPNG`）

```typescript
async function extractDeckInfoFromPNG(
  pngBlob: Blob
): Promise<SimpleDeckInfo | null> {
  // 1. PNGバイナリ読み込み
  const pngData = new Uint8Array(await pngBlob.arrayBuffer());
  
  // 2. PNGシグネチャ検証
  if (!validatePngSignature(pngData)) return null;
  
  // 3. 全チャンクを走査
  let offset = 8; // シグネチャ後
  while (offset < pngData.length) {
    const { type, data, nextOffset } = readChunk(pngData, offset);
    
    // 4. tEXtチャンクを発見
    if (type === 'tEXt') {
      const { key, value } = parseTextChunk(data);
      if (key === 'DeckInfo') {
        // 5. JSON解析
        return JSON.parse(value) as SimpleDeckInfo;
      }
    }
    
    if (type === 'IEND') break;
    offset = nextOffset;
  }
  
  return null;
}
```

### CRC-32計算

PNG仕様に準拠したCRC-32実装が必要です。

```typescript
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
```

**CRC計算対象**: `Type + Data`
- tEXtの場合: `"tEXt" + "DeckInfo\0{JSON文字列}"`

## テスト方法

### ユニットテスト

1. **有効なPNG画像での埋め込み・抽出**
2. **不正なPNG（シグネチャ不一致）の処理**
3. **複数tEXtチャンク含むPNGの処理**
4. **空デッキの処理**
5. **特殊文字を含むenc値の処理**
6. **往復テスト（embed → extract）**

### フィクスチャ

- `tests/fixtures/png/valid-1x1.png` - 最小限の有効なPNG（1x1透明）
- `tests/fixtures/png/invalid-signature.png` - 不正なシグネチャ
- `tests/fixtures/png/multi-text.png` - 複数tEXtチャンク含む

### 検証ツール

**ExifTool**で確認可能:
```bash
exiftool -a -G1 deck-image.png
```

出力例:
```
[PNG]           Text Chunk              : DeckInfo
[PNG]           Text Value              : {"main":[{"cid":"12950",...}]}
```

## 制約事項

### サイズ制限

- **理論上限**: 2^31-1 バイト（約2GB）
- **実用上限**: 数MB程度推奨
- **典型的なサイズ**: 
  - 40枚デッキ: 約2-3KB
  - 60枚デッキ: 約3-5KB

### 互換性

#### 保持される環境
- ✅ ローカルファイルシステム
- ✅ Discord（ほとんどの場合）
- ✅ メール添付
- ✅ クラウドストレージ（Google Drive, Dropbox等）

#### 失われる可能性がある環境
- ⚠️ Twitter（画像最適化により削除される場合あり）
- ⚠️ Instagram（メタデータ削除される）
- ⚠️ 一部の画像編集ソフト（保存時に削除）

### 文字エンコーディング

- **tEXtチャンク**: Latin-1（ISO-8859-1）のみ
- **対策**: JSON（ASCII文字のみ）を使用
- **注意**: カード名など多言語文字を含めない

もし多言語対応が必要な場合:
- iTXtチャンク（国際化テキスト）を使用
- UTF-8エンコーディングで保存可能
- 実装が複雑になるため、現在は非採用

## セキュリティ考慮事項

### JSON Injection対策

```typescript
// 安全な解析
try {
  const data = JSON.parse(value) as SimpleDeckInfo;
  // 型チェック
  if (!isValidSimpleDeckInfo(data)) {
    throw new Error('Invalid deck info structure');
  }
} catch (error) {
  console.error('Failed to parse deck info:', error);
  return null;
}
```

### サイズ制限

```typescript
// 異常に大きいデータを拒否
const MAX_JSON_SIZE = 1024 * 1024; // 1MB
if (value.length > MAX_JSON_SIZE) {
  throw new Error('Deck info too large');
}
```

## 将来の拡張

### バージョニング

メタデータ形式の変更に備えて、バージョン番号を含めることを検討:

```json
{
  "version": 1,
  "main": [...],
  "extra": [...],
  "side": [...]
}
```

### 追加情報

将来的に追加可能な情報:
- デッキ名
- 作成日時
- タグ・カテゴリ
- デッキスタイル

ただし、サイズ増加とのトレードオフを考慮すること。

## 参考資料

### PNG仕様
- **ISO/IEC 15948:2004** - PNG公式仕様
- **RFC 2083** - PNG仕様（RFC版）
- [PNG Specification (W3C)](https://www.w3.org/TR/PNG/)

### 関連実装
- `src/utils/png-metadata.ts` - 実装コード
- `tests/unit/png-metadata.test.ts` - テストコード
- `docs/usage/import-export.md` - ユーザー向けガイド

### チャンク仕様

#### 必須チャンク
- **IHDR**: 画像ヘッダー（最初のチャンク）
- **IDAT**: 画像データ
- **IEND**: 画像終端（最後のチャンク）

#### 補助チャンク（任意）
- **tEXt**: テキストデータ（Latin-1）← 使用中
- **iTXt**: 国際化テキスト（UTF-8）
- **zTXt**: 圧縮テキスト
- **tIME**: 最終更新時刻
- **pHYs**: 物理的ピクセル寸法

## トラブルシューティング

### 埋め込みが失敗する

**原因**: PNGシグネチャが不正
**対策**: 入力ファイルがPNG形式か確認

**原因**: IENDチャンクが見つからない
**対策**: ファイルが破損している可能性。再取得

### 抽出が失敗する（nullが返る）

**原因**: DeckInfo tEXtチャンクが存在しない
**対策**: YGO Deck Helperでエクスポートした画像か確認

**原因**: 画像編集ソフトで加工された
**対策**: メタデータを保持する設定で保存

### CRCエラー

**原因**: チャンクデータが破損
**対策**: CRC-32計算ロジックを再確認

## まとめ

PNG tEXtチャンクを使用することで、画像の見た目を変えずにデッキ情報を埋め込むことができます。標準準拠の方法であり、多くの環境で互換性があります。ただし、一部のSNSや画像編集ソフトではメタデータが削除される可能性があるため、ユーザーにその旨を周知することが重要です。

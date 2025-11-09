/**
 * Node.js環境で実際のデッキ画像サンプルを生成
 * canvas nodeモジュールを使用してscale=2の高解像度画像を作成
 */

import { createDeckRecipeImage } from '../../../src/content/deck-recipe/createDeckRecipeImage';
import { parseDeckDetail } from '../../../src/content/parser/deck-detail-parser';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

async function createSample(): Promise<void> {
  console.log('【高解像度デッキ画像サンプル作成】\n');

  // HTMLファイルからデッキデータを読み込み
  const htmlPath = path.join(__dirname, '../../../tests/combine/data/deck-detail-public.html');
  console.log(`HTMLファイルを読み込み: ${htmlPath}`);

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  console.log('デッキデータをパース中...');
  const deckData = parseDeckDetail(document);
  console.log(`デッキ名: ${deckData.name}`);
  console.log(`メインデッキ: ${deckData.mainDeck.length}枚`);
  console.log(`エクストラデッキ: ${deckData.extraDeck.length}枚`);
  console.log(`サイドデッキ: ${deckData.sideDeck.length}枚`);

  const outputDir = path.join(__dirname, '../../../docs/usage/images');
  const outputPath = path.join(outputDir, 'deck-recipe-sample.png');

  try {
    console.log('\n画像を生成中（scale=2, 赤背景, QR ON）...');

    const buffer = await createDeckRecipeImage({
      cgid: '87999bd183514004b8aa8afa1ff1bdb9',
      dno: '95',
      deckData,
      color: 'red',
      includeQR: true,
      scale: 2
    });

    // Bufferをファイルに保存
    fs.writeFileSync(outputPath, buffer as Buffer);

    console.log(`\n✅ 画像を保存: ${outputPath}`);
    const stats = fs.statSync(outputPath);
    console.log(`サイズ: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// 実行
createSample();

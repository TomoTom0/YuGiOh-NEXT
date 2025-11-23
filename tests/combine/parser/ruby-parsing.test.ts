
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseCardInfoFromDetailPage } from '../../../src/api/card-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRubyParsing() {
    console.log('=== Testing Ruby Parsing ===\n');

    // Load the HTML file
    const htmlPath = path.join(__dirname, '../../combine/data/card-detail-ruby.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const dom = new JSDOM(html);
    const doc = dom.window.document as unknown as Document;

    // Parse the card info
    // cid=4007 is Blue-Eyes White Dragon
    const cardInfo = parseCardInfoFromDetailPage(doc, '4007');

    if (!cardInfo) {
        console.error('ERROR: Failed to parse card info');
        process.exit(1);
    }

    console.log('Card Name:', cardInfo.name);
    console.log('Ruby:', cardInfo.ruby);

    // Assertions
    if (cardInfo.name !== '青眼の白龍') {
        console.error(`ERROR: Expected name "青眼の白龍", got "${cardInfo.name}"`);
    } else {
        console.log('✓ Name correct');
    }

    const expectedRuby = 'ブルーアイズ・ホワイト・ドラゴン';
    if (cardInfo.ruby !== expectedRuby) {
        console.error(`ERROR: Expected ruby "${expectedRuby}", got "${cardInfo.ruby}"`);
        process.exit(1);
    } else {
        console.log('✓ Ruby correct');
    }

    console.log('\n=== Test Passed ===');
}

testRubyParsing().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

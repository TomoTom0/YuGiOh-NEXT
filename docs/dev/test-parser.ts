
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseCardSearch } from '../src/utils/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../../tmp/https___www_db_yugioh_card_com_yugiohdb_card_search_action_ope_1.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const cards = parseCardSearch(html);

console.log(JSON.stringify(cards, null, 2));
console.log(`Parsed ${cards.length} cards.`);

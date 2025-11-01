const fs = require('fs');
const cheerio = require('cheerio');

function parseCardSearchHtml(html, baseUrl='https://www.db.yugioh-card.com'){
  const $ = cheerio.load(html);
  const results = [];
  $('img').each((_, el)=>{
    const src = $(el).attr('src') || '';
    if (/get_image\.action/.test(src) || (el.attribs && el.attribs.id && el.attribs.id.startsWith('card_image'))){
      const alt = $(el).attr('alt') || $(el).attr('title') || '';
      const parentLink = $(el).closest('a');
      const detail = parentLink && parentLink.length ? parentLink.attr('href') || '' : '';
      const cidMatch = (detail || src).match(/cid=(\d+)/);
      const cid = cidMatch ? cidMatch[1] : undefined;
      const imageUrl = src && src.startsWith('http') ? src : (src ? new URL(src, baseUrl).href : undefined);
      results.push({ cid, name: alt || undefined, detailUrl: detail ? new URL(detail, baseUrl).href : undefined, imageUrl });
    }
  });
  $('a').each((_, el)=>{
    const href = $(el).attr('href') || '';
    if (/card_search\.action\?ope=2|card_search\.action\?ope=1|cid=/.test(href)){
      const text = $(el).text().trim();
      const cidMatch = href.match(/cid=(\d+)/);
      const cid = cidMatch ? cidMatch[1] : undefined;
      results.push({ cid, name: text || undefined, detailUrl: href ? new URL(href, baseUrl).href : undefined });
    }
  });
  const seen = new Map();
  for(const r of results){
    const key = r.detailUrl || r.cid || r.imageUrl || r.name || JSON.stringify(r);
    if(!seen.has(key)) seen.set(key, r);
  }
  return Array.from(seen.values());
}

function parseMemberDeckHtml(html, baseUrl='https://www.db.yugioh-card.com'){
  const $ = cheerio.load(html);
  const decks = [];
  $('a').each((_, el)=>{
    const href = $(el).attr('href') || '';
    if (/member_deck\.action/.test(href)){
      const text = $(el).text().trim();
      const dnoMatch = href.match(/dno=(\d+)/);
      const deckId = dnoMatch ? dnoMatch[1] : undefined;
      decks.push({ deckId, title: text || undefined, detailUrl: href ? new URL(href, baseUrl).href : undefined });
    }
  });
  const uniq = new Map();
  for(const d of decks){
    const key = d.detailUrl || d.deckId || d.title || JSON.stringify(d);
    if(!uniq.has(key)) uniq.set(key, d);
  }
  return Array.from(uniq.values());
}

function loadFile(p){
  if(!fs.existsSync(p)) return null;
  return fs.readFileSync(p,'utf8');
}

const cardPath = 'tmp/https___www_db_yugioh_card_com_yugiohdb_card_search_action_ope_1.html';
const deckPath = 'tmp/https___www_db_yugioh_card_com_yugiohdb_member_deck_action_ope_4.html';
const cardHtml = loadFile(cardPath);
const deckHtml = loadFile(deckPath);
const out = { cards: [], decks: [] };
if(cardHtml) out.cards = parseCardSearchHtml(cardHtml);
if(deckHtml) out.decks = parseMemberDeckHtml(deckHtml);

fs.writeFileSync('tmp/parsed.json', JSON.stringify(out, null, 2), 'utf8');
console.log('Parsed results written to tmp/parsed.json');


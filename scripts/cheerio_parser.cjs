#!/usr/bin/env node
"use strict";
// Parse collected JSON and try to extract card IDs and deck detail links using cheerio.
// Usage: node scripts/cheerio_parser.js path/to/collected.json

const fs = require('fs');
const cheerio = require('cheerio');

function readInput(cb){
  const p = process.argv[2];
  if(p){ fs.readFile(p,'utf8',(e,d)=>{ if(e){console.error(e); process.exit(2);} cb(d); }); }
  else { let data=''; process.stdin.setEncoding('utf8'); process.stdin.on('data',c=>data+=c); process.stdin.on('end',()=>cb(data)); }
}

readInput(raw=>{
  if(!raw) { console.error('no input'); process.exit(1); }
  let obj; try{ obj=JSON.parse(raw); }catch(e){ console.error('invalid json'); process.exit(2); }

  const out={page: obj.page||{}, tokens: obj.tokens||{}, decks: [], cards: [], missing: []};

  // ensure ytkn
  if(!out.tokens.ytkn) out.missing.push('ytkn');

  // try to get cgid from URL
  try{ const u = new URL(out.page.url); out.tokens.cgid = out.tokens.cgid || u.searchParams.get('cgid') || null; }catch(e){}
  if(!out.tokens.cgid) out.missing.push('cgid');

  function parseHtmlSnippet(html){
    const $ = cheerio.load(html || '');
    // find links to deck detail or member_deck
    const deckLinks = [];
    $('a').each((i,el)=>{ const href = $(el).attr('href'); if(!href) return; if(href.indexOf('member_deck.action')!==-1 || href.indexOf('deck_detail')!==-1 || href.indexOf('deck_search')!==-1) deckLinks.push(href); });
    // find card ids in attributes
    const cardIds = [];
    // data-* attributes
    $('[data-dno],[data-card-id],[data-deck-id]').each((i,el)=>{ const d = $(el).attr('data-dno')||$(el).attr('data-card-id')||$(el).attr('data-deck-id'); if(d) cardIds.push(d); });
    // hidden input that contains link values: value="...cid=12345..."
    $('input.link_value,input[type="hidden"]').each((i,el)=>{
      const v = $(el).attr('value')||$(el).attr('data-value')||$(el).val();
      if(v){ try{ const U=new URL(v, out.page.url); if(U.searchParams.get('cid')) cardIds.push(U.searchParams.get('cid')); }catch(e){
          // fallback regex
          const m = v.match(/[?&]cid=(\d+)/); if(m) cardIds.push(m[1]);
        }}
    });
    // images that include cid in src
    $('img').each((i,el)=>{ const src = $(el).attr('src'); if(!src) return; try{ const U=new URL(src, out.page.url); if(U.pathname.indexOf('get_image.action')!==-1 && U.searchParams.get('cid')) cardIds.push(U.searchParams.get('cid')); }catch(e){ const m=src.match(/[?&]cid=(\d+)/); if(m) cardIds.push(m[1]); }});
    // find query params like dno= or card_no= or cid= in anchor hrefs
    const hrefs = $('a').map((i,el)=>$(el).attr('href')).get().filter(Boolean);
    hrefs.forEach(h=>{ try{ const U=new URL(h, out.page.url); if(U.searchParams.get('dno')) cardIds.push(U.searchParams.get('dno')); if(U.searchParams.get('card_no')) cardIds.push(U.searchParams.get('card_no')); if(U.searchParams.get('cid')) cardIds.push(U.searchParams.get('cid')); }catch(e){} });
    return {deckLinks: Array.from(new Set(deckLinks)).slice(0,50), cardIds: Array.from(new Set(cardIds)).slice(0,200)};
  }

  for(const d of (obj.decks||[])){
    const res = parseHtmlSnippet(d.html||d.html||'');
    out.decks.push({text: d.text||null, class: d.class||null, deckLinks: res.deckLinks, cardIds: res.cardIds});
  }

  for(const c of (obj.cards||[])){
    const res = parseHtmlSnippet(c.html||c.html||'');
    out.cards.push({text: c.text||null, class: c.class||null, deckLinks: res.deckLinks, cardIds: res.cardIds});
  }

  const anyCardIds = out.cards.some(x=>x.cardIds.length) || out.decks.some(x=>x.cardIds.length);
  if(!anyCardIds) out.missing.push('cardIds');

  console.log(JSON.stringify(out,null,2));
});

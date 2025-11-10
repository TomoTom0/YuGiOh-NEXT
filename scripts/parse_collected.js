#!/usr/bin/env node
"use strict";
// Usage: node scripts/parse_collected.js path/to/collected.json
// If no path is given, reads from STDIN.

const fs = require('fs');
const path = require('path');

function readInput(cb){
  const p = process.argv[2];
  if(p){
    fs.readFile(p,'utf8',(err,data)=>{ if(err) { console.error(err); process.exit(2); } cb(data); });
  } else {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => cb(data));
  }
}

function parseHrefParams(href){
  try{
    const u = new URL(href, 'https://example.invalid');
    const obj = {};
    for(const [k,v] of u.searchParams) obj[k]=v;
    return {href: u.href, params: obj};
  }catch(e){
    return {href: href, params: {}};
  }
}

function extractHrefsFromHtml(html){
  const hrefs = [];
  const re = /href\s*=\s*"([^"]+)"/ig;
  let m;
  while((m = re.exec(html))){ hrefs.push(m[1]); }
  return hrefs;
}

function extractDataFromSnippet(sn){
  const res = {hrefs:[], cgids:[], cardIds:[], texts:[]};
  if(!sn) return res;
  if(sn.html) {
    res.hrefs = extractHrefsFromHtml(sn.html);
    res.texts = sn.text ? [sn.text] : [];
    // find cgid in hrefs
    for(const h of res.hrefs){
      const parsed = parseHrefParams(h);
      if(parsed.params.cgid) res.cgids.push(parsed.params.cgid);
      // card id patterns
      if(parsed.params.dno) res.cardIds.push(parsed.params.dno);
      if(parsed.params.card_no) res.cardIds.push(parsed.params.card_no);
    }
    // also try to find data-card-id in html
    const reCard = /data-(?:card|deck)-?id\s*=\s*"([^"]+)"/ig;
    let mm;
    while((mm = reCard.exec(sn.html))){ res.cardIds.push(mm[1]); }
  }
  return res;
}

readInput((raw)=>{
  if(!raw) { console.error('no input'); process.exit(1); }
  let obj;
  try{ obj = JSON.parse(raw); }catch(e){ console.error('invalid json'); process.exit(2); }

  const out = {collectedAt: obj.collectedAt||null, page: obj.page||{}, tokens: obj.tokens||{}, summary: {decks:[], cards:[]}, missing: []};

  // ensure ytkn
  if(!out.tokens.ytkn) out.missing.push('ytkn');
  // cgid from tokens or url
  let cgid = out.tokens.cgid || null;
  try{ const u = new URL(out.page.url); if(!cgid) cgid = u.searchParams.get('cgid') || null; }catch(e){}
  out.tokens.cgid = cgid;
  if(!cgid) out.missing.push('cgid');

  // parse decks
  if(Array.isArray(obj.decks)){
    for(const d of obj.decks){
      const parsed = extractDataFromSnippet(d);
      out.summary.decks.push({text: d.text || null, class: d.class || null, hrefs: parsed.hrefs, cgids: parsed.cgids, cardIds: parsed.cardIds});
    }
  }

  // parse cards
  if(Array.isArray(obj.cards)){
    for(const c of obj.cards){
      const parsed = extractDataFromSnippet(c);
      out.summary.cards.push({text: c.text || null, class: c.class || null, hrefs: parsed.hrefs, cardIds: parsed.cardIds});
    }
  }

  // check if we found any cardIds or deck cgids
  const anyCardIds = out.summary.cards.some(c=>c.cardIds && c.cardIds.length) || out.summary.decks.some(d=>d.cardIds && d.cardIds.length);
  if(!anyCardIds) out.missing.push('cardIds');

  // print result
  process.stdout.write(JSON.stringify(out, null, 2));
});


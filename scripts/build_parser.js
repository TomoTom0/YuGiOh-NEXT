#!/usr/bin/env node
"use strict";
// Simple parser that extracts candidate deck detail URLs and card IDs from collected JSON.
// Usage: node scripts/build_parser.js path/to/collected.json

const fs = require('fs');

function readInput(cb){
  const p = process.argv[2];
  if(p){ fs.readFile(p,'utf8',(e,d)=>{ if(e){console.error(e); process.exit(2);} cb(d); }); }
  else { let data=''; process.stdin.setEncoding('utf8'); process.stdin.on('data',c=>data+=c); process.stdin.on('end',()=>cb(data)); }
}

function findAllRegex(str, re){ const res=[]; let m; while((m=re.exec(str))){ res.push(m.slice(1)); } return res; }

readInput(raw=>{
  if(!raw) { console.error('no input'); process.exit(1); }
  let obj;
  try{ obj = JSON.parse(raw); }catch(e){ console.error('invalid json'); process.exit(2); }

  const out = {page: obj.page||{}, tokens: obj.tokens||{}, candidates: {deckDetails: [], cardIds: []}, missing: []};

  // ensure ytkn
  if(!out.tokens.ytkn) out.missing.push('ytkn');

  // try to find cgid in page url
  try{ const u = new URL(out.page.url); out.tokens.cgid = out.tokens.cgid || u.searchParams.get('cgid') || null; }catch(e){}
  if(!out.tokens.cgid) out.missing.push('cgid');

  // scan decks and domSamples for member_deck links and dno/card_no params
  const snippets = [].concat(obj.decks||[]).concat(obj.cards||[]);
  for(const s of snippets){ if(s && s.html){
    // hrefs
    const hrefs = findAllRegex(s.html, /href\s*=\s*"([^"]+)"/ig).map(a=>a[0]);
    for(const h of hrefs){
      try{ const U = new URL(h, out.page.url);
        if(U.pathname.indexOf('/member_deck.action')!==-1 || U.pathname.indexOf('/deck_detail')!==-1) out.candidates.deckDetails.push(U.href);
        if(U.searchParams.get('dno')) out.candidates.cardIds.push(U.searchParams.get('dno'));
        if(U.searchParams.get('card_no')) out.candidates.cardIds.push(U.searchParams.get('card_no'));
        if(U.searchParams.get('cgid')) out.tokens.cgid = out.tokens.cgid || U.searchParams.get('cgid');
        // also capture cid (card id) and any image cid parameters
        if(U.searchParams.get('cid')) out.candidates.cardIds.push(U.searchParams.get('cid'));
        if(U.pathname.indexOf('get_image.action')!==-1 && U.searchParams.get('cid')) out.candidates.cardIds.push(U.searchParams.get('cid'));
      }catch(e){}
    }
    // also try to extract cid from inline HTML using regex (e.g. value="...cid=12345")
    try{
      var htmlStr = (s.html||"").replace(/&amp;/g,'&');
      const reCid = /[?&]cid=(\d+)/ig;
      let m;
      while((m = reCid.exec(htmlStr))){ out.candidates.cardIds.push(m[1]); }
      const reCidAttr = /value\s*=\s*"[^"]*cid=(\d+)[^\"]*"/ig;
      while((m = reCidAttr.exec(htmlStr))){ out.candidates.cardIds.push(m[1]); }
    }catch(e){}
    // inline data attributes
    const dmatch = findAllRegex(s.html, /data-(?:card|deck)-?id\s*=\s*"([^"]+)"/ig).map(x=>x[0]);
    out.candidates.cardIds.push(...dmatch);
  }}

  // also scan body sample
  if(obj.domSamples && obj.domSamples.body){
    const body = obj.domSamples.body;
    const hrefs = findAllRegex(body, /href\s*=\s*"([^"]+)"/ig).map(a=>a[0]);
    for(const h of hrefs){ try{ const U=new URL(h, out.page.url); if(U.searchParams.get('cgid')) out.tokens.cgid = out.tokens.cgid || U.searchParams.get('cgid'); if(U.searchParams.get('dno')) out.candidates.cardIds.push(U.searchParams.get('dno')); if(U.pathname.indexOf('/member_deck.action')!==-1) out.candidates.deckDetails.push(U.href);}catch(e){} }
  }

  // dedupe
  out.candidates.deckDetails = Array.from(new Set(out.candidates.deckDetails)).slice(0,20);
  out.candidates.cardIds = Array.from(new Set(out.candidates.cardIds)).slice(0,200);

  if(out.candidates.cardIds.length===0) out.missing.push('cardIds');

  console.log(JSON.stringify(out, null, 2));
});

const fs = require('fs');
const { chromium } = require('playwright');

async function run(){
  const wsFile = '.chrome_playwright_ws';
  if(!fs.existsSync(wsFile)){ console.error('wsEndpoint file missing'); process.exit(2); }
  const ws = fs.readFileSync(wsFile,'utf8').trim();
  const browser = await chromium.connect({ wsEndpoint: ws });
  const contexts = browser.contexts();
  const ctx = contexts.length ? contexts[0] : await browser.newContext();
  const page = (await ctx.pages())[0] || await ctx.newPage();

  const parsedPath = 'tmp/parsed.json';
  if(!fs.existsSync(parsedPath)){ console.error('parsed.json missing, run run-parser.js first'); await browser.close(); process.exit(2); }
  const parsed = JSON.parse(fs.readFileSync(parsedPath,'utf8'));
  const cards = parsed.cards || [];
  fs.mkdirSync('tmp/cards', { recursive: true });

  for(const c of cards){
    if(!c.cid) continue;
    const detail = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${c.cid}`;
    try{
      console.log('Fetching card', c.cid, detail);
      await page.goto(detail, { waitUntil: 'networkidle', timeout: 60000 });
      const safe = `tmp/cards/card_${c.cid}.html`;
      fs.writeFileSync(safe, await page.content(), 'utf8');
      console.log('Saved', safe);
      // fetch FAQ too
      const faq = `https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=${c.cid}`;
      try{
        await page.goto(faq, { waitUntil: 'networkidle', timeout: 60000 });
        const s2 = `tmp/cards/card_${c.cid}_faq.html`;
        fs.writeFileSync(s2, await page.content(), 'utf8');
        console.log('Saved', s2);
      }catch(e){ console.error('faq fetch failed', c.cid, e.message); }
    }catch(e){ console.error('card fetch failed', c.cid, e.message); }
  }

  // attempt member deck detail pages if any
  const decks = parsed.decks || [];
  fs.mkdirSync('tmp/decks',{recursive:true});
  for(const d of decks){
    if(!d.detailUrl) continue;
    try{
      console.log('Fetching deck', d.detailUrl);
      await page.goto(d.detailUrl, { waitUntil: 'networkidle', timeout: 60000 });
      const safe = `tmp/decks/${encodeURIComponent(d.detailUrl)}.html`;
      fs.writeFileSync(safe, await page.content(), 'utf8');
      console.log('Saved', safe);
    }catch(e){ console.error('deck fetch failed', d.detailUrl, e.message); }
  }

  await browser.close();
  console.log('Crawl done');
}

run().catch(e=>{ console.error(e); process.exit(1); });


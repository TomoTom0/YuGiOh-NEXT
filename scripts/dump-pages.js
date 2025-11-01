const fs = require('fs');
const { chromium } = require('playwright');

async function run() {
  try {
    const wsFile = '.chrome_playwright_ws';
    if (!fs.existsSync(wsFile)) {
      console.error('wsEndpoint file not found:', wsFile);
      process.exit(2);
    }
    const ws = fs.readFileSync(wsFile, 'utf8').trim();
    console.log('Connecting to', ws);
    const browser = await chromium.connect({ wsEndpoint: ws });
    const contexts = browser.contexts();
    const ctx = contexts.length ? contexts[0] : await browser.newContext();

    const pages = await ctx.pages();
    const page = pages.length ? pages[0] : await ctx.newPage();

    const targets = [
      'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1',
      'https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=4'
    ];

    for (const url of targets) {
      try {
        console.log('Navigating to', url);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        const safeName = url.replace(/[^a-z0-9]/gi, '_');
        const html = await page.content();
        fs.writeFileSync(`tmp/${safeName}.html`, html, 'utf8');
        console.log('Saved', `tmp/${safeName}.html`);
      } catch (err) {
        console.error('Failed to dump', url, err.message);
      }
    }

    // attempt to find individual card links from the card search page and dump them
    try {
      const searchHtml = fs.readFileSync('tmp/https___www_db_yugioh_card_com_yugiohdb_card_search_action_ope_1.html', 'utf8');
      const linkUrls = Array.from(new Set((await page.$$eval('a', els => els.map(a => a.href))).filter(h => /card_search.action\?ope=2|card_search.action\?ope=1|card_search.action\?ope=2&cid=/.test(h))));
      console.log('Found', linkUrls.length, 'card links to dump');
      for (let i = 0; i < Math.min(linkUrls.length, 50); i++) {
        const cardUrl = linkUrls[i];
        try {
          await page.goto(cardUrl, { waitUntil: 'networkidle', timeout: 60000 });
          const safe = cardUrl.replace(/[^a-z0-9]/gi, '_');
          const html = await page.content();
          fs.writeFileSync(`tmp/${safe}.html`, html, 'utf8');
          console.log('Saved card', `tmp/${safe}.html`);
        } catch (err) {
          console.error('Failed to dump card', cardUrl, err.message);
        }
      }
    } catch (e) {
      console.error('Card link extraction failed', e.message);
    }

    await browser.close();
    console.log('Done');
  } catch (err) {
    console.error('Error in dump-pages:', err);
    process.exit(1);
  }
}

run();

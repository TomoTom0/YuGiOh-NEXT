const fs = require('fs');
const { chromium } = require('playwright');

async function run(){
  const wsFile = '.chrome_playwright_ws';
  if(!fs.existsSync(wsFile)){
    console.error('wsEndpoint missing');
    process.exit(2);
  }
  const ws = fs.readFileSync(wsFile,'utf8').trim();
  const browser = await chromium.connect({ wsEndpoint: ws });
  const ctx = browser.contexts()[0] || await browser.newContext();
  const page = await ctx.newPage();

  const logs = { responses: [], failed: [], errors: [] };
  page.on('response', async res => {
    try{
      const status = res.status();
      const url = res.url();
      logs.responses.push({ url, status, headers: res.headers() });
    }catch(e){ logs.errors.push(String(e)); }
  });
  page.on('requestfailed', req => {
    try{
      const failure = req.failure() && req.failure().errorText ? req.failure().errorText : null;
      logs.failed.push({ url: req.url(), method: req.method(), failure });
    }catch(e){ logs.errors.push(String(e)); }
  });

  const target = 'https://my1.konami.net/api/authorizations?client_id=iiupvpe4ftzyqtu4t7faf56k2c5j2cvo&redirect_uri=https%3A%2F%2Fwww.db.yugioh-card.com%2Fyugiohdb%2Fmember_login.action&response_type=code&state=pjOadueZQ0wlrG0wmZjDmNmC4HpdTHQ8&claims=%7B%22userinfo%22%3A%7B%22sequentialId%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%2C%22profile%22%3A%7B%22given_name%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%2C%22family_name%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%2C%22birthdate%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%7D%2C%22address%22%3A%7B%22country%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%7D%2C%22accountType%22%3A%7B%22scopes%22%3A%5B%22read%22%5D%7D%2C%22link%22%3A%7B%22app%22%3A%7B%22cgn%22%3A%7B%22userId%22%3A%7B%22scopes%22%3A%5B%22create%22%2C%22update%22%5D%7D%7D%7D%7D%7D%7D';

  try{
    await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
  }catch(e){ logs.errors.push(String(e)); }

  // wait a moment for events
  await new Promise(r => setTimeout(r, 1000));
  fs.writeFileSync('tmp/auth_diagnose.json', JSON.stringify(logs, null, 2), 'utf8');
  console.log('Wrote tmp/auth_diagnose.json');
  await browser.disconnect?.();
}

run().catch(e=>{ console.error(e && e.stack || e); process.exit(1); });


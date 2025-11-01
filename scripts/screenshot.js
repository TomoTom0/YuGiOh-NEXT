const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  try {
    fs.mkdirSync('tmp', { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto('https://www.db.yugioh-card.com', { waitUntil: 'load', timeout: 60000 });
    await page.screenshot({ path: 'tmp/ygo_db.png', fullPage: true });
    await browser.close();
    console.log('Screenshot saved to tmp/ygo_db.png');
  } catch (err) {
    console.error('Error capturing screenshot:', err);
    process.exit(1);
  }
})();


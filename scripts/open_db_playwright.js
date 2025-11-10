#!/usr/bin/env node
// Open the Yugioh card DB in a headed Playwright browser for manual login
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  console.log('Opening https://www.db.yugioh-card.com ...');
  await page.goto('https://www.db.yugioh-card.com', { waitUntil: 'domcontentloaded' });
  console.log('Page opened. You can interact with the browser window to log in.');
  // Keep the process alive until the user closes the page window.
  await new Promise((resolve) => page.on('close', resolve));
  await browser.close();
})();

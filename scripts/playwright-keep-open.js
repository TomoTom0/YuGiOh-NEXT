const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  try {
    const wsFile = '.chrome_playwright_ws';
    const server = await chromium.launchServer({
      headless: true,
      args: [
        '--no-first-run',
        '--no-sandbox',
        '--disable-breakpad',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
    });

    const ws = server.wsEndpoint();
    fs.writeFileSync(wsFile, ws, 'utf8');
    console.log('Playwright server started. wsEndpoint written to', wsFile);
    console.log(ws);

    // keep process alive until terminated; do not close server on disconnect
    process.on('SIGINT', async () => {
      console.log('Shutting down Playwright server...');
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start Playwright server:', err);
    process.exit(1);
  }
})();

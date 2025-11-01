# Report: Current status and how to resume automated investigation

## Status

- Playwright helper and dump scripts added to `scripts/`:
  - `scripts/playwright-keep-open.js` — starts a Playwright server and writes `wsEndpoint` to `.chrome_playwright_ws`.
  - `scripts/dump-pages.js` — connects to the `wsEndpoint` and saves HTML for known target URLs to `tmp/`.

- Several logs and artifacts exist from earlier attempts: `tmp/ygo_db.png`, `.chrome_cache/*.log`.

## How this works

1. Start the Playwright server (one-time):

   ```bash
   node scripts/playwright-keep-open.js
   ```

   This will launch a visible browser window controlled by Playwright and write the `wsEndpoint` to `.chrome_playwright_ws`.

2. In that browser window, manually log in to the target site (`https://www.db.yugioh-card.com`).

3. Run the dump script (can be done on the same host):

   ```bash
   node scripts/dump-pages.js
   ```

   The script will connect to the Playwright server and save HTML snapshots to `tmp/` for analysis.

4. Analysis: parse `tmp/` HTML files using `src/utils/parser.ts` (not yet implemented) and produce structured output.

## Notes

- This process avoids repeatedly pasting console snippets; after the Playwright server is running, all dumps are automated.
- The Playwright server uses project-local wsEndpoint so it can be reattached across processes.
- No ownership (`chown`) operations are performed by these scripts.

## Next steps for full automation

- Implement `src/utils/parser.ts` to extract card and deck structures from the saved HTML.
- Add unit tests for parser and a CLI to run dumps+parsing in sequence.


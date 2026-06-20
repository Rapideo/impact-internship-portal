/**
 * Render the Quick Start & Testing Guide HTML to a print-ready PDF (US Letter)
 * using headless Chromium via Playwright. Re-runnable.
 *
 *   npx tsx docs/quick-start-guide/render.ts
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'docs', 'quick-start-guide');
const HTML = join(DIR, 'quick-start-guide.html');
const PDF = join(DIR, 'IMPACT-Portal-Quick-Start-Guide.pdf');

const footer = `
  <div style="width:100%; font-family:'IBM Plex Mono', monospace; font-size:7px;
              letter-spacing:0.08em; text-transform:uppercase; color:#5b6480;
              padding:0 0.7in; display:flex; justify-content:space-between; align-items:center;">
    <span>IMPACT Internship Assessment Portal &middot; Quick Start &amp; Testing Guide</span>
    <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
  // Make sure web fonts and every screenshot are decoded before printing.
  await page.evaluate(async () => {
    await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
      ),
    );
  });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: PDF,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footer,
    margin: { top: '0', right: '0', bottom: '0.6in', left: '0' },
  });
  await browser.close();
  console.log(`PDF written: ${PDF}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

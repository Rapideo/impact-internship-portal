// Regenerates public/email-logo.png from public/logo-reverse.svg.
//
// Why a PNG at all: Gmail and Outlook strip inline SVG and refuse <img> tags
// pointing at .svg, so the app's vector wordmark cannot be reused in mail.
// Rendered at 2x (360px) and displayed at 180px so it stays crisp on retina.
// Transparent background — it sits on the navy-deep masthead.
//
// Run:  npm run email:logo
// Then re-render and re-paste the Supabase templates (see docs/deployment.md).

import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'public/logo-reverse.svg';
const OUT = 'public/email-logo.png';
const DISPLAY_WIDTH = 180;
const SCALE = 2;

async function main() {
  const svg = readFileSync(SRC, 'utf8');
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error(`Could not read viewBox from ${SRC}`);
  const ratio = Number(viewBox[2]) / Number(viewBox[1]);

  const width = DISPLAY_WIDTH * SCALE;
  const height = Math.round(width * ratio);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const sized = svg
      .replace(/width="[\d.]+"/, `width="${width}"`)
      .replace(/height="[\d.]+"/, `height="${height}"`);
    await page.setContent(
      `<html><body style="margin:0;background:transparent;"><div style="width:${width}px;height:${height}px;">${sized}</div></body></html>`,
    );
    const buf = await page.screenshot({ omitBackground: true, type: 'png' });
    writeFileSync(OUT, buf);
    console.log(
      `Wrote ${OUT} — ${width}x${height} (displays at ${DISPLAY_WIDTH}px), ${(buf.length / 1024).toFixed(1)} KB`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

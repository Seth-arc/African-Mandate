import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5179';
const outDir = process.argv[3] ?? 'output/web-game/map-legend-ui-check';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.click('#enterArenaBtn');
await page.waitForSelector('#introVideoOverlay.active', { timeout: 12000 });
await page.waitForTimeout(900);
await page.evaluate(() => {
  const introVideo = document.getElementById('introVideo');
  if (!(introVideo instanceof HTMLVideoElement)) return;
  introVideo.dispatchEvent(new Event('ended'));
});

await page.waitForSelector('.session-auth-card', { timeout: 12000 });
await page.click('.session-auth-guest');
await page.waitForSelector('h2:has-text("Mission brief")', { timeout: 12000 });

const closeBtn = page.locator('.modal-content button[aria-label="Close"]');
if ((await closeBtn.count()) > 0) {
  await closeBtn.first().click();
}

await page.waitForTimeout(550);
await page.screenshot({ path: path.join(outDir, 'map-legend.png') });

const metrics = await page.evaluate(() => {
  const legend = document.querySelector('.map-legend-panel');
  const body = document.querySelector('.map-legend-body');
  const shortcuts = document.querySelector('.map-legend-shortcuts');
  const lastSection = body ? body.querySelector('.map-legend-section:last-child') : null;
  const zoom = document.querySelector('.leaflet-top.leaflet-right .leaflet-control-zoom');

  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
  };

  const legendRect = rect(legend);
  const shortcutsRect = rect(shortcuts);
  const lastRect = rect(lastSection);
  const zoomRect = rect(zoom);

  let overlap = false;
  if (legendRect && zoomRect) {
    overlap = !(zoomRect.left >= legendRect.right || zoomRect.right <= legendRect.left || zoomRect.top >= legendRect.bottom || zoomRect.bottom <= legendRect.top);
  }

  return {
    gapPx: lastRect && shortcutsRect ? Math.round(shortcutsRect.top - lastRect.bottom) : null,
    zoomOverlapLegend: overlap,
    zoomIsRightOfLegend: legendRect && zoomRect ? zoomRect.left > legendRect.right : null,
    legendRect,
    zoomRect,
  };
});

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();

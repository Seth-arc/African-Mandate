import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:5179';
const outDir = process.argv[3] ?? 'output/web-game/entry-flow-validation';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.click('#enterArenaBtn');
await page.waitForSelector('#introVideoOverlay.active', { timeout: 12000 });
await page.waitForTimeout(1300);

await page.evaluate(() => {
  const introVideo = document.getElementById('introVideo');
  if (!(introVideo instanceof HTMLVideoElement)) return;
  introVideo.dispatchEvent(new Event('ended'));
});

await page.waitForSelector('.session-auth-card', { timeout: 12000 });
await page.screenshot({ path: path.join(outDir, 'auth-modal.png') });

const authScrollCheck = await page.evaluate(() => {
  const modal = document.querySelector('.modal-content-entry-gate');
  const root = document.getElementById('root');
  return {
    modalFound: Boolean(modal),
    modalOverflowY: modal ? getComputedStyle(modal).overflowY : null,
    modalHasScrollbar: modal ? modal.scrollHeight > modal.clientHeight : null,
    pageHasScrollbar: document.documentElement.scrollHeight > window.innerHeight,
    rootVisible: root ? getComputedStyle(root).display !== 'none' : false,
  };
});

await page.click('.session-auth-guest');
await page.waitForSelector('.onboarding-loading-shell', { timeout: 9000 });
await page.screenshot({ path: path.join(outDir, 'guest-loading.png') });

await page.waitForSelector('h2:has-text("Mission brief")', { timeout: 12000 });
await page.screenshot({ path: path.join(outDir, 'onboarding-modal.png') });

const result = { authScrollCheck };
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));

await browser.close();

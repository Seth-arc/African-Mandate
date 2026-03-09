import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] ?? "http://localhost:5179";
const outDir = process.argv[3] ?? "output/web-game/story-sections";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const metrics = await page.evaluate(() => ({
  vh: window.innerHeight,
  sh: document.documentElement.scrollHeight,
}));

for (let i = 0; i < 5; i++) {
  await page.evaluate(({ index, vh }) => {
    window.scrollTo({ top: index * vh, behavior: "auto" });
  }, { index: i, vh: metrics.vh });

  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `section-${i + 1}.png`) });
}

await browser.close();

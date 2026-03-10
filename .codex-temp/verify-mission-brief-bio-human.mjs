import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });

await page.click("#enterArenaBtn");
await page.locator(".session-auth-guest").waitFor({ state: "visible", timeout: 20000 });
await page.click(".session-auth-guest");
await page.waitForTimeout(3700);
await page.click("#btn-mission-brief");

await page.locator(".mission-brief-envelope-toggle").waitFor({ state: "visible", timeout: 12000 });
await page.click(".mission-brief-envelope-toggle");
await page.waitForTimeout(200);

const payload = await page.evaluate(() => {
  const titles = Array.from(document.querySelectorAll(".mission-brief-envelope-title")).map((el) => el.textContent?.trim());
  const points = Array.from(document.querySelectorAll(".mission-brief-envelope-list li")).map((el) => el.textContent?.trim());
  return {
    titles,
    pointCount: points.length,
    hasHumanLine: points.some((line) => line?.includes("keeping difficult conversations moving")),
    hasLeadershipLine: points.some((line) => line?.includes("short-term gains must support long-term stability")),
  };
});

await page.locator(".modal-content-mission-brief").screenshot({ path: "output/web-game/mission-brief-bio-human-check/bio-envelope-open.png" });
console.log(JSON.stringify(payload));
await browser.close();

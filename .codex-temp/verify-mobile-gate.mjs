import { chromium, devices } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();

await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });
await page.locator("#enterArenaBtn").waitFor({ state: "visible", timeout: 15000 });
await page.click("#enterArenaBtn");
await page.waitForTimeout(350);

const payload = await page.evaluate(() => {
  const gate = document.getElementById("mobileGateModal");
  const gateActive = Boolean(gate && gate.classList.contains("active"));
  const gateTitle = gate ? gate.querySelector(".mobile-gate-title")?.textContent?.trim() ?? null : null;
  const gameActive = document.body.classList.contains("game-active");
  const introActive = Boolean(document.getElementById("introVideoOverlay")?.classList.contains("active"));
  return { gateActive, gateTitle, gameActive, introActive };
});

await page.locator("#mobileGateModal").screenshot({ path: "output/web-game/mobile-gate-check/mobile-gate-iphone13.png" });
console.log(JSON.stringify(payload));

await browser.close();

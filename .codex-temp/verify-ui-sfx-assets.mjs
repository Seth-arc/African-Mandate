import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });

const requestedAudio = new Set();
page.on("request", (request) => {
  try {
    const url = new URL(request.url());
    if (url.pathname.includes("/assets/audio/effects/")) {
      const file = url.pathname.split("/").pop();
      if (file) requestedAudio.add(file);
    }
  } catch {
    // ignore malformed URLs
  }
});

await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });
await page.click("#enterArenaBtn");
await page.locator(".session-auth-guest").waitFor({ state: "visible", timeout: 20000 });
await page.click(".session-auth-guest");
await page.waitForTimeout(4300);
await page.locator(".leaflet-container").waitFor({ state: "visible", timeout: 15000 });

const eventDispatchResult = await page.evaluate(() => {
  const target = document.querySelector(".leaflet-overlay-pane path.map-territory-status.leaflet-interactive");
  if (!target) return { dispatched: false };

  target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return { dispatched: true };
});

await page.waitForTimeout(1200);

const payload = {
  dispatched: eventDispatchResult.dispatched,
  requestedAudio: Array.from(requestedAudio).sort(),
  includesHover: requestedAudio.has("active_button_hover.wav"),
  includesClick: requestedAudio.has("select_click.mp3"),
};

await page.locator(".map-view").screenshot({ path: "output/web-game/ui-sfx-cross-platform-check/map-hover-click.png" });
console.log(JSON.stringify(payload));
await browser.close();

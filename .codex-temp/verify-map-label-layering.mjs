import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });

await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });
await page.click("#enterArenaBtn");
await page.locator(".session-auth-guest").waitFor({ state: "visible", timeout: 20000 });
await page.click(".session-auth-guest");
await page.waitForTimeout(4200);

await page.locator(".leaflet-container").waitFor({ state: "visible", timeout: 15000 });
await page.waitForTimeout(1200);

const payload = await page.evaluate(() => {
  const labelsPane = document.querySelector(".leaflet-pane.map-top-labels-pane");
  const overlayPane = document.querySelector(".leaflet-overlay-pane");
  const markerPane = document.querySelector(".leaflet-marker-pane");
  const labelTiles = labelsPane ? Array.from(labelsPane.querySelectorAll("img.leaflet-tile")) : [];
  const loadedLabelTiles = labelTiles.filter((tile) => tile.complete).length;

  const labelsZ = labelsPane ? Number.parseInt(getComputedStyle(labelsPane).zIndex || "0", 10) : null;
  const overlayZ = overlayPane ? Number.parseInt(getComputedStyle(overlayPane).zIndex || "0", 10) : null;
  const markerZ = markerPane ? Number.parseInt(getComputedStyle(markerPane).zIndex || "0", 10) : null;

  return {
    hasTopLabelsPane: Boolean(labelsPane),
    labelsTileCount: labelTiles.length,
    loadedLabelTiles,
    labelsPaneZ: labelsZ,
    overlayPaneZ: overlayZ,
    markerPaneZ: markerZ,
    labelsAboveOverlay: labelsZ !== null && overlayZ !== null ? labelsZ > overlayZ : false,
  };
});

await page.locator(".map-view").screenshot({ path: "output/web-game/map-label-layer-check/map-view.png" });
console.log(JSON.stringify(payload));

await browser.close();

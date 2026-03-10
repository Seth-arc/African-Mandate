import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://127.0.0.1:5174", { waitUntil: "domcontentloaded" });
await page.click("#enterArenaBtn");
await page.locator(".session-auth-guest").waitFor({ state: "visible", timeout: 20000 });
await page.click(".session-auth-guest");
await page.waitForTimeout(3800);

await page.locator("#btn-take-action").waitFor({ state: "visible", timeout: 20000 });
await page.click("#btn-take-action");

await page.locator("button.action-config-confirm", { hasText: "Review action" }).waitFor({ state: "visible", timeout: 12000 });
await page.click("button.action-config-confirm", { hasText: "Review action" });
await page.locator(".action-config-review").waitFor({ state: "visible", timeout: 12000 });

const payload = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll(".action-config-review-row"))
    .map((row) => {
      const label = row.querySelector("span")?.textContent?.trim() ?? "";
      const value = row.querySelector("strong")?.textContent?.trim() ?? "";
      return { label, value };
    });
  const target = rows.find((row) => row.label === "Target")?.value ?? null;
  const territory = rows.find((row) => row.label === "Territory")?.value ?? null;
  return {
    target,
    territory,
    hasTerritoryRow: rows.some((row) => row.label === "Territory"),
    territoryIsDetailed: Boolean(territory && territory !== "N/A"),
    rows,
  };
});

await page.locator(".modal-content").screenshot({ path: "output/web-game/action-review-territory-check/review-modal.png" });
console.log(JSON.stringify(payload));

await browser.close();

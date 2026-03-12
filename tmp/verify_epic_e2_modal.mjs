import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:5182'
const OUTPUT_DIR = path.resolve('output/web-game/epic-e2-validation')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  ensureDir(OUTPUT_DIR)
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader'],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const consoleErrors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ type: 'console.error', text: msg.text() })
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push({ type: 'pageerror', text: String(err) })
  })

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.click('#enterArenaBtn', { timeout: 20000 })
  await page.waitForSelector('.modal-content-entry-gate', { timeout: 45000 })
  await page.locator('.modal-content-entry-gate').screenshot({ path: path.join(OUTPUT_DIR, 'entry-gate.png') })

  const primaryCountBefore = await page.locator('.modal-content-entry-gate button[data-primary-cta="true"]').count()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  const telemetryAfterEnter = await page.evaluate(() => window.__africanMandateTelemetry ?? [])

  const continueAsGuest = page.getByRole('button', { name: /Continue as Guest/i })
  if ((await continueAsGuest.count()) > 0 && (await continueAsGuest.first().isVisible())) {
    await continueAsGuest.first().click()
  }

  await page.waitForTimeout(1200)
  const telemetry = await page.evaluate(() => window.__africanMandateTelemetry ?? [])

  const result = {
    baseUrl: BASE_URL,
    primaryCountBefore,
    modalOpenedCount: telemetry.filter((event) => event.name === 'modal_opened').length,
    modalClosedCount: telemetry.filter((event) => event.name === 'modal_closed').length,
    modalPrimaryCtaClickedCount: telemetry.filter((event) => event.name === 'modal_primary_cta_clicked').length,
    modalEscapeUsedCount: telemetry.filter((event) => event.name === 'modal_escape_used').length,
    telemetryTailAfterEnter: telemetryAfterEnter.slice(-6),
    telemetryTail: telemetry.slice(-10),
    consoleErrors,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

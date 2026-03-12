import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:5182'
const OUTPUT_DIR = path.resolve('output/web-game/epic-e3-validation')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function isVisible(locator) {
  if ((await locator.count()) === 0) return false
  return locator.first().isVisible().catch(() => false)
}

async function dismissOverlays(page) {
  const closePatterns = [/Skip/i, /Close Brief/i, /Continue/i, /^Close$/i]
  for (const pattern of closePatterns) {
    const button = page.getByRole('button', { name: pattern })
    if (await isVisible(button)) {
      await button.first().click({ timeout: 2000 }).catch(() => undefined)
      await page.waitForTimeout(350)
      return true
    }
  }
  return false
}

async function reachCommandDeck(page) {
  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    const takeAction = page.locator('#btn-take-action')
    const hasTakeAction = await isVisible(takeAction)
    const modalCount = await page.locator('.modal-backdrop').count()
    const tourCount = await page.locator('.demo-tour-backdrop').count()
    const loadingCount = await page.locator('.onboarding-loading-shell').count()
    if (hasTakeAction && modalCount === 0 && tourCount === 0 && loadingCount === 0) return

    const clicked = await dismissOverlays(page)
    if (!clicked) {
      await page.waitForTimeout(650)
    }
  }
  throw new Error('Timed out waiting for command deck readiness.')
}

async function openTakeActionModal(page) {
  const takeActionButton = page.locator('#btn-take-action')
  await dismissOverlays(page)
  await takeActionButton.click({ timeout: 10000, force: true })
  await page.waitForSelector('.action-config-layout', { timeout: 10000 })
}

function eventCounts(events) {
  return events.reduce((acc, event) => {
    const key = event?.name ?? 'unknown'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
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
  await page.getByRole('button', { name: /Continue as Guest/i }).click({ timeout: 10000, force: true })
  await reachCommandDeck(page)

  await openTakeActionModal(page)

  await page.keyboard.press('Enter')
  await page.waitForSelector('.action-forecast-card', { timeout: 10000 })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'forecast-review.png') })

  const confirmButton = page.locator('button.action-config-confirm', { hasText: 'Confirm action' }).first()
  const confirmVisible = await isVisible(confirmButton)
  const confirmEnabled = confirmVisible ? await confirmButton.first().isEnabled() : false
  const forecastVisible = await isVisible(page.locator('.action-forecast-card'))
  const confidenceText = forecastVisible
    ? await page.locator('.action-forecast-confidence').first().innerText().catch(() => '')
    : ''

  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)

  if (!(await isVisible(page.locator('.action-config-layout')))) {
    await openTakeActionModal(page)
  }

  await page.keyboard.press('Enter')
  await page.waitForSelector('.action-forecast-card', { timeout: 10000 })

  const confirmVisibleAfterReopen = await isVisible(confirmButton)
  const confirmEnabledAfterReopen = confirmVisibleAfterReopen ? await confirmButton.first().isEnabled() : false
  const shouldConfirm = confirmEnabled || confirmEnabledAfterReopen
  if (shouldConfirm) {
    await page.keyboard.press('Enter')
    await page.waitForSelector('.action-transition-shell, .modal-content-action-transition', { timeout: 15000 })
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'after-confirm.png') })
  }

  const telemetry = await page.evaluate(() => window.__africanMandateTelemetry ?? [])
  const result = {
    baseUrl: BASE_URL,
    forecastVisible,
    confidenceText,
    confirmVisible,
    confirmEnabled,
    confirmVisibleAfterReopen,
    confirmEnabledAfterReopen,
    telemetryCounts: eventCounts(telemetry),
    telemetryTail: telemetry.slice(-20),
    consoleErrors,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

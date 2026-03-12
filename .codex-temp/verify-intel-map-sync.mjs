import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const OUTPUT_DIR = path.resolve('output/web-game/intel-map-sync-check')
const URL = process.env.TEST_URL ?? 'http://127.0.0.1:4173'

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
}

async function enterGame(page) {
  console.log('[verify-intel-map] entering game')
  const enterArenaButton = page.locator('#enterArenaBtn')
  if (await enterArenaButton.isVisible().catch(() => false)) {
    await enterArenaButton.click()
    await page.waitForFunction(() => document.body.classList.contains('game-active'), undefined, { timeout: 30000 })
  }

  const guestButton = page.getByRole('button', { name: /continue as guest/i })
  if (await guestButton.isVisible({ timeout: 12000 }).catch(() => false)) {
    await guestButton.click()
  }

  const closeBriefButton = page.getByRole('button', { name: /close brief/i })
  if (await closeBriefButton.isVisible({ timeout: 12000 }).catch(() => false)) {
    await closeBriefButton.click()
  }
}

async function configureIntelAction(page) {
  console.log('[verify-intel-map] configuring intel action')
  await page.locator('#btn-take-action').click()
  await page.waitForSelector('.action-config-layout', { state: 'visible', timeout: 15000 })

  await page.evaluate(() => {
    const triggerSelect = (selectEl, value) => {
      if (!selectEl) return false
      const found = Array.from(selectEl.options).some((option) => option.value === value)
      if (!found) return false
      selectEl.value = value
      selectEl.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }

    let selects = Array.from(document.querySelectorAll('select.action-config-select'))
    triggerSelect(selects[0], 'intelligence')

    selects = Array.from(document.querySelectorAll('select.action-config-select'))
    triggerSelect(selects[1], 'intelligence_threat_assessment')

    selects = Array.from(document.querySelectorAll('select.action-config-select'))
    const targetSelect = selects[2]
    if (targetSelect) {
      const firstRealOption = Array.from(targetSelect.options).find((option) => option.value)
      if (firstRealOption) {
        targetSelect.value = firstRealOption.value
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  })

  console.log('[verify-intel-map] submitting action')
  await page.getByRole('button', { name: /review action/i }).click()
  await page.getByRole('button', { name: /confirm action/i }).click()
  await page.getByRole('button', { name: /resume operations/i }).click({ timeout: 25000 })
}

async function run() {
  await ensureOutputDir()

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1560, height: 980 } })
  page.setDefaultTimeout(30000)

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await enterGame(page)
  await configureIntelAction(page)
  console.log('[verify-intel-map] checking intel pins')
  await page.waitForTimeout(700)

  const intelMarkerCount = await page.locator('.map-intel-pin').count()
  let intelModalOpened = false

  if (intelMarkerCount > 0) {
    await page.locator('.map-intel-pin').first().click()
    intelModalOpened = await page.locator('.intel-report-modal-shell').isVisible({ timeout: 10000 }).catch(() => false)
  }

  const result = { intelMarkerCount, intelModalOpened }

  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'intel-map-sync.png'),
    fullPage: true,
  })
  await fs.writeFile(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(result, null, 2), 'utf8')
  await browser.close()

  console.log(JSON.stringify(result, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const OUTPUT_DIR = path.resolve('output/web-game/urgency-layer-check')
const URL = process.env.TEST_URL ?? 'http://127.0.0.1:4173'

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
}

async function maybeDismissEntryFlow(page) {
  const enterArenaButton = page.locator('#enterArenaBtn')
  if (await enterArenaButton.isVisible().catch(() => false)) {
    await enterArenaButton.click()
    await page.waitForFunction(() => document.body.classList.contains('game-active'), undefined, { timeout: 30000 })
  }

  const guestButton = page.getByRole('button', { name: /continue as guest/i })
  if (await guestButton.isVisible({ timeout: 25000 }).catch(() => false)) {
    await guestButton.click()
  }

  const closeBriefButton = page.getByRole('button', { name: /close brief/i })
  if (await closeBriefButton.isVisible({ timeout: 35000 }).catch(() => false)) {
    await closeBriefButton.click()
  }
}

async function run() {
  await ensureOutputDir()

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1560, height: 980 } })

  page.setDefaultTimeout(30000)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await maybeDismissEntryFlow(page)

  await page.waitForSelector('#action-bar', { state: 'visible' })
  await page.waitForSelector('.turn-pressure-block', { state: 'visible' })

  const takeActionButton = page.locator('#btn-take-action')
  await takeActionButton.click()
  await page.waitForTimeout(120)

  const metrics = await page.evaluate(() => {
    const actionBar = document.querySelector('#action-bar')
    const pressureBar = document.querySelector('.game-action-pressure-meter-fill')
    const commandStatus = document.querySelector('.game-action-command-status')
    const turnPressure = document.querySelector('.turn-pressure-value')

    return {
      actionBarClass: actionBar?.className ?? null,
      pressureWidth: pressureBar?.style.width ?? null,
      commandStatus: commandStatus?.textContent?.trim() ?? null,
      turnPressureText: turnPressure?.textContent?.trim() ?? null,
    }
  })

  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'urgency-layer.png'),
    fullPage: true,
  })
  await fs.writeFile(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(metrics, null, 2), 'utf8')
  await browser.close()

  console.log(JSON.stringify(metrics, null, 2))
}

run().catch(async (error) => {
  console.error(error)
  process.exitCode = 1
})

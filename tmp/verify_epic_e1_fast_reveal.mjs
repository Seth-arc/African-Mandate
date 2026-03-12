import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:5182'
const OUTPUT_DIR = path.resolve('output/web-game/epic-e1-validation')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function waitForEnabledButton(page, labelRegex, timeoutMs) {
  await page.waitForFunction(
    (pattern) => {
      const regex = new RegExp(pattern, 'i')
      const button = Array.from(document.querySelectorAll('button')).find((node) => regex.test(node.textContent ?? ''))
      return Boolean(button && !button.disabled)
    },
    labelRegex.source,
    { timeout: timeoutMs }
  )
}

async function completeActionLoop(page) {
  await page.getByRole('button', { name: /Take action/i }).click({ timeout: 15000 })
  await page.waitForSelector('.action-config-layout', { timeout: 15000 })
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('.action-config-select'))
    for (const select of selects) {
      const options = Array.from(select.querySelectorAll('option'))
      const firstValid = options.find((option) => option.value && !option.disabled)
      if (!firstValid) continue
      select.value = firstValid.value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  try {
    await waitForEnabledButton(page, /Review action/i, 20000)
  } catch (error) {
    const debugPayload = await page.evaluate(() => {
      const reviewButton = Array.from(document.querySelectorAll('button')).find((node) =>
        /Review action/i.test(node.textContent ?? '')
      )
      const selects = Array.from(document.querySelectorAll('.action-config-select')).map((select) => ({
        value: select.value,
        optionValues: Array.from(select.querySelectorAll('option')).map((opt) => ({
          value: opt.value,
          label: opt.textContent ?? '',
          disabled: opt.disabled,
        })),
      }))
      const validationText =
        document.querySelector('.action-config-validation')?.textContent?.trim() ??
        document.querySelector('.action-config-resource-warning')?.textContent?.trim() ??
        null
      return {
        reviewButtonDisabled: reviewButton ? reviewButton.hasAttribute('disabled') : null,
        validationText,
        selects,
      }
    })
    fs.writeFileSync(path.join(OUTPUT_DIR, 'action-config-debug.json'), JSON.stringify(debugPayload, null, 2))
    await page.locator('.action-config-layout').first().screenshot({ path: path.join(OUTPUT_DIR, 'action-config-debug.png') })
    throw error
  }
  await page.getByRole('button', { name: /Review action/i }).click({ timeout: 10000 })
  await waitForEnabledButton(page, /Confirm action/i, 20000)
  await page.getByRole('button', { name: /Confirm action/i }).click({ timeout: 10000 })
  await page.waitForSelector('.action-transition-shell--reveal', { timeout: 15000 })
}

async function settleToCommandDeck(page) {
  const deadline = Date.now() + 90000
  const fallbackPatterns = [/Close Brief/i, /Continue/i, /Close/i, /Skip/i]

  while (Date.now() < deadline) {
    const takeActionButton = page.getByRole('button', { name: /Take action/i })
    const loadingOverlayCount = await page.locator('.modal-backdrop .onboarding-loading-shell').count()
    const loadingGateCount = await page.locator('.modal-backdrop.loading-entry-from-gate').count()
    const loadingVideoCount = await page.locator('.onboarding-loading-video').count()
    const demoTourBlockingCount = await page.locator('.demo-tour-backdrop').count()
    const loadingBlocking = loadingOverlayCount > 0 || loadingGateCount > 0 || loadingVideoCount > 0
    if (
      (await takeActionButton.count()) > 0 &&
      (await takeActionButton.first().isVisible()) &&
      !loadingBlocking &&
      demoTourBlockingCount === 0
    ) {
      return
    }

    let clicked = false
    for (const pattern of fallbackPatterns) {
      const button = page.getByRole('button', { name: pattern }).first()
      if ((await button.count()) > 0 && (await button.isVisible())) {
        await button.click({ timeout: 2000 }).catch(() => undefined)
        clicked = true
        await page.waitForTimeout(500)
        break
      }
    }

    if (!clicked) {
      await page.waitForTimeout(1000)
    }
  }

  throw new Error('Take action button did not appear after onboarding flow.')
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
  await page.getByRole('button', { name: /Continue as Guest/i }).click({ timeout: 45000 })
  await settleToCommandDeck(page)

  await completeActionLoop(page)
  const fastRevealDisabledOnFirstReveal = await page.getByRole('button', { name: /Fast Reveal/i }).isDisabled()
  await page.locator('.action-transition-shell').first().screenshot({ path: path.join(OUTPUT_DIR, 'first-reveal.png') })
  await waitForEnabledButton(page, /Resume Operations/i, 20000)
  await page.getByRole('button', { name: /Resume Operations/i }).click({ timeout: 10000 })

  await completeActionLoop(page)
  const fastRevealEnabledOnSecondReveal = !(await page.getByRole('button', { name: /Fast Reveal/i }).isDisabled())
  await page.getByRole('button', { name: /Fast Reveal/i }).click({ timeout: 10000 })
  await page
    .locator('.action-transition-shell')
    .first()
    .screenshot({ path: path.join(OUTPUT_DIR, 'second-reveal-fast-selected.png') })
  await page.waitForSelector('.action-transition-shell', { state: 'detached', timeout: 10000 })

  const telemetry = await page.evaluate(() => window.__africanMandateTelemetry ?? [])

  const result = {
    baseUrl: BASE_URL,
    fastRevealDisabledOnFirstReveal,
    fastRevealEnabledOnSecondReveal,
    telemetryEventCounts: telemetry.reduce((acc, event) => {
      const key = event?.name ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
    telemetryTail: telemetry.slice(-12),
    consoleErrors,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

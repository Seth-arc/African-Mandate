import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:5182'
const OUTPUT_DIR = path.resolve('output/web-game/intel-executive-check')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

async function isVisible(locator) {
  if ((await locator.count()) === 0) return false
  return locator.first().isVisible().catch(() => false)
}

async function dismissOverlays(page) {
  const patterns = [/Skip/i, /Close Brief/i, /Continue/i, /^Close$/i]
  for (const pattern of patterns) {
    const button = page.getByRole('button', { name: pattern })
    if (await isVisible(button)) {
      await button.first().click({ timeout: 2000 }).catch(() => undefined)
      await page.waitForTimeout(300)
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

  await page.locator('#btn-take-action').click({ timeout: 10000, force: true })
  await page.waitForSelector('.action-config-layout', { timeout: 10000 })
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select.action-config-select'))
    const category = selects[0]
    const action = selects[1]
    if (category) {
      category.value = 'intelligence'
      category.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const nextSelects = Array.from(document.querySelectorAll('select.action-config-select'))
    const nextAction = nextSelects[1]
    if (nextAction) {
      const option = Array.from(nextAction.options).find((entry) => entry.value === 'intelligence_threat_assessment')
      if (option) {
        nextAction.value = option.value
        nextAction.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  })

  await page.keyboard.press('Enter')
  await page.waitForSelector('.action-forecast-card', { timeout: 10000 })
  await page.keyboard.press('Enter')
  await page.waitForSelector('.action-transition-shell, .modal-content-action-transition', { timeout: 20000 })
  await page.waitForSelector('button.action-config-confirm:not([disabled])', { timeout: 20000 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)

  let openedFrom = 'none'
  const intelFeedItem = page.locator('.intel-feed-item').first()
  if (await isVisible(intelFeedItem)) {
    await intelFeedItem.click({ timeout: 8000, force: true })
    openedFrom = 'feed'
  } else {
    const intelPin = page.locator('.map-intel-pin').first()
    if (await isVisible(intelPin)) {
      await intelPin.click({ timeout: 8000, force: true })
      openedFrom = 'map-pin'
    }
  }

  await page.waitForSelector('.intel-demarche-shell', { timeout: 20000 })
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'intel-modal.png') })

  const inspection = await page.evaluate(() => {
    const modalContent = document.querySelector('.modal-content')
    const modalClassName = modalContent instanceof HTMLElement ? modalContent.className : null
    const modalStyle =
      modalContent instanceof HTMLElement
        ? {
            opacity: window.getComputedStyle(modalContent).opacity,
            visibility: window.getComputedStyle(modalContent).visibility,
            display: window.getComputedStyle(modalContent).display,
          }
        : null
    const textNode = document.querySelector('.intel-demarche-section-text')
    const title = Array.from(document.querySelectorAll('.intel-demarche-section-title'))
      .map((node) => node.textContent?.trim() ?? '')
      .find((label) => label.toLowerCase().includes('executive assessment'))
    const sections = Array.from(document.querySelectorAll('.intel-demarche-section')).map((section) => {
      const heading = section.querySelector('.intel-demarche-section-title')
      const paragraph = section.querySelector('.intel-demarche-section-text')
      if (!(paragraph instanceof HTMLElement)) {
        return {
          title: heading?.textContent?.trim() ?? '',
          textLength: 0,
          opacity: null,
          color: null,
        }
      }
      const sectionTextStyle = window.getComputedStyle(paragraph)
      return {
        title: heading?.textContent?.trim() ?? '',
        textLength: paragraph.innerText.trim().length,
        textPreview: paragraph.innerText.trim().slice(0, 120),
        opacity: sectionTextStyle.opacity,
        color: sectionTextStyle.color,
        visibility: sectionTextStyle.visibility,
      }
    })
    if (!(textNode instanceof HTMLElement)) {
      return {
        modalClassName,
        modalStyle,
        hasExecutiveTitle: Boolean(title),
        hasTextNode: false,
        sections,
      }
    }
    const rect = textNode.getBoundingClientRect()
    const style = window.getComputedStyle(textNode)
    const parent = textNode.parentElement
    const parentStyle = parent instanceof HTMLElement ? window.getComputedStyle(parent) : null
    const opacityRules = []
    for (const sheet of Array.from(document.styleSheets)) {
      let rules
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      if (!rules) continue
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue
        if (!rule.selectorText) continue
        let matches = false
        try {
          matches = textNode.matches(rule.selectorText)
        } catch {
          matches = false
        }
        if (!matches) continue
        if (rule.style.opacity) {
          opacityRules.push({
            selector: rule.selectorText,
            opacity: rule.style.opacity,
            animation: rule.style.animation || null,
          })
        }
      }
    }
    return {
      modalClassName,
      modalStyle,
      hasExecutiveTitle: Boolean(title),
      hasTextNode: true,
      textLength: textNode.innerText.trim().length,
      textPreview: textNode.innerText.trim().slice(0, 140),
      color: style.color,
      opacity: style.opacity,
      animationName: style.animationName,
      visibility: style.visibility,
      display: style.display,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      parentOpacity: parentStyle?.opacity ?? null,
      parentAnimationName: parentStyle?.animationName ?? null,
      opacityRules,
      sections,
    }
  })

  const result = {
    openedFrom,
    inspection,
    consoleErrors,
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'result.json'), JSON.stringify(result, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

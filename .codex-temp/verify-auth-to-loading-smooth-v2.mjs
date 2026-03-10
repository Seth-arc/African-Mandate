import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const url = process.argv[2] ?? 'http://127.0.0.1:5174'
const outDir = process.argv[3] ?? 'output/web-game/auth-to-loading-smooth-v2-check'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.click('#enterArenaBtn', { timeout: 15000 })
await page.waitForSelector('.session-auth-shell', { timeout: 20000 })

const result = await page.evaluate(async () => {
  const marks = {
    clickAt: performance.now(),
    sessionGoneAt: null,
    loadingVisibleAt: null,
    loadingReadyAt: null,
    videoReadyStateAtVisible: null,
    videoCurrentTimeAtVisible: null,
    shellAnimation: null,
  }

  const btn = document.querySelector('.session-auth-guest')
  if (!(btn instanceof HTMLElement)) {
    return { error: 'guest_button_missing', marks }
  }
  btn.click()

  await new Promise((resolve) => {
    const deadline = performance.now() + 7000
    const tick = () => {
      const now = performance.now()
      const session = document.querySelector('.session-auth-shell')
      const loadingShell = document.querySelector('.onboarding-loading-shell')
      const loadingVideo = document.querySelector('.onboarding-loading-video')

      if (!session && marks.sessionGoneAt === null) {
        marks.sessionGoneAt = now
      }
      if (loadingShell && marks.loadingVisibleAt === null) {
        marks.loadingVisibleAt = now
        marks.shellAnimation = getComputedStyle(loadingShell).animationName
      }
      if (loadingShell instanceof HTMLElement && loadingShell.classList.contains('is-ready') && marks.loadingReadyAt === null) {
        marks.loadingReadyAt = now
      }
      if (loadingVideo instanceof HTMLVideoElement && marks.videoReadyStateAtVisible === null && marks.loadingVisibleAt !== null) {
        marks.videoReadyStateAtVisible = loadingVideo.readyState
        marks.videoCurrentTimeAtVisible = Number(loadingVideo.currentTime.toFixed(2))
      }

      if (marks.loadingVisibleAt !== null && marks.loadingReadyAt !== null) {
        resolve(null)
        return
      }
      if (now > deadline) {
        resolve(null)
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  return {
    marks,
    derived: {
      sessionToLoadingGapMs:
        marks.sessionGoneAt !== null && marks.loadingVisibleAt !== null
          ? Number((marks.loadingVisibleAt - marks.sessionGoneAt).toFixed(1))
          : null,
      loadingVisibleToReadyMs:
        marks.loadingVisibleAt !== null && marks.loadingReadyAt !== null
          ? Number((marks.loadingReadyAt - marks.loadingVisibleAt).toFixed(1))
          : null,
    },
  }
})

await page.waitForTimeout(260)
await page.screenshot({ path: path.join(outDir, 'auth-to-loading-smooth-v2.png'), fullPage: true })
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify({ url, result }, null, 2))
console.log(JSON.stringify({ url, result }, null, 2))

await browser.close()

import { expect, test, devices, type Page } from '@playwright/test'

async function stubMediaPlayback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const dispatchMediaEvent = (element: HTMLMediaElement, eventName: string): void => {
      element.dispatchEvent(new Event(eventName))
    }

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value() {
        const element = this as HTMLMediaElement
        window.setTimeout(() => {
          dispatchMediaEvent(element, 'loadedmetadata')
          dispatchMediaEvent(element, 'loadeddata')
          dispatchMediaEvent(element, 'canplay')
          dispatchMediaEvent(element, 'playing')
          if (!element.loop) {
            window.setTimeout(() => dispatchMediaEvent(element, 'ended'), 80)
          }
        }, 0)
        return Promise.resolve()
      },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value() {
        dispatchMediaEvent(this as HTMLMediaElement, 'pause')
      },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get() {
        return 1
      },
    })
  })
}

async function startNewCampaign(page: Page): Promise<void> {
  await page.goto('/')
  await page.locator('#enterArenaBtn').click()
  await expect(page.locator('body')).toHaveClass(/game-active/)
  await expect(page.getByRole('dialog', { name: /Mission Entry|Sessions/ })).toBeVisible()
  await page.getByRole('button', { name: 'Start new campaign' }).first().click()
  await expect(page.getByRole('button', { name: 'Take action' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function enterArenaToMissionEntry(page: Page): Promise<void> {
  await page.goto('/')
  await page.locator('#enterArenaBtn').click()
  await expect(page.locator('body')).toHaveClass(/game-active/)
  await expect(page.getByRole('dialog', { name: /Mission Entry|Sessions/ })).toBeVisible()
}

async function expectReleaseSupportGate(page: Page, reasonText: RegExp): Promise<void> {
  await expect(page.getByRole('dialog', { name: /Unsupported setup/i })).toBeVisible()
  await expect(page.getByText(reasonText)).toBeVisible()
  await expect(page.locator('body')).not.toHaveClass(/game-active/)
  await expect(page.locator('#root')).not.toBeVisible()
}

async function dismissVisibleModal(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if ((await page.getByRole('dialog').count()) === 0) return

    const continueToOperations = page.getByRole('button', { name: /Continue to operations/i })
    if (await continueToOperations.isVisible().catch(() => false)) {
      await continueToOperations.click()
      await page.keyboard.press('Escape')
      continue
    }

    const continueButton = page.getByRole('button', { name: /^Continue$/i })
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click()
      continue
    }

    const skipButton = page.getByRole('button', { name: /^Skip$/i })
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click()
      continue
    }

    const closeButton = page.getByRole('button', { name: /^Close$/i }).last()
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click()
      continue
    }

    await page.keyboard.press('Escape')
  }
}

async function expectVisibleTurnLabel(page: Page, turnLabel: string): Promise<void> {
  await expect(page.locator('.turn-progress-now-value').filter({ hasText: turnLabel })).toBeVisible({ timeout: 15_000 })
}

async function advanceTurn(page: Page, expectedTurnLabel: string, options: { dismissAfter?: boolean } = {}): Promise<void> {
  const dismissAfter = options.dismissAfter ?? true
  await dismissVisibleModal(page)
  await page.getByRole('button', { name: 'End turn' }).click()
  await expectVisibleTurnLabel(page, expectedTurnLabel)
  if (dismissAfter) {
    await dismissVisibleModal(page)
  }
}

test.beforeEach(async ({ page }) => {
  await stubMediaPlayback(page)
})

test('full player journey covers launch, onboarding, action review, invalid action, feedback, turns, save/resume, act transition, and deterministic ending', async ({ page }) => {
  await startNewCampaign(page)

  await page.getByRole('button', { name: 'Onboarding' }).click()
  await expect(page.getByRole('dialog', { name: /Opening Brief/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: /Command Rail/ })).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()

  await page.getByRole('button', { name: 'Take action' }).click()
  await expect(page.getByRole('dialog', { name: /Take Action/ })).toBeVisible()
  const selects = page.locator('select.action-config-select')
  await selects.first().selectOption('humanitarian')
  await selects.nth(1).selectOption({ label: 'Humanitarian Corridor Establishment' })
  await expect(page.getByText(/Required flag not set: idp_surge_active/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review action' })).toBeDisabled()

  await selects.first().selectOption('security')
  await selects.nth(1).selectOption({ label: 'Security Patrol Deployment' })
  await page.getByRole('button', { name: 'Review action' }).click()
  await expect(page.getByRole('button', { name: 'Confirm action' })).toBeEnabled()
  await page.getByRole('button', { name: 'Confirm action' }).click()
  await expect(page.getByText('Action Confirmed')).toBeVisible()
  await expect(page.getByRole('button', { name: /Resume Operations|Return to Command/ })).toBeEnabled({ timeout: 12_000 })
  await expect(page.getByText('Security Patrol Deployment')).toBeVisible()
  await page.getByRole('button', { name: /Resume Operations|Return to Command/ }).click()
  await expect(page.getByText('Latest action')).toBeVisible()

  await advanceTurn(page, '2/20')

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Save Session' }).click()
  await expect(page.getByRole('dialog', { name: /Sessions/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue mandate' })).toBeVisible()
  await page.getByRole('dialog', { name: /Sessions/ }).getByLabel('Close', { exact: true }).click()

  await page.reload()
  await page.locator('#enterArenaBtn').click()
  await expect(page.getByRole('dialog', { name: /Mission Entry|Sessions/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continue mandate' }).click()
  await expect(page.getByText('Saved Session Restored')).toBeVisible()
  await expectVisibleTurnLabel(page, '2/20')
  await dismissVisibleModal(page)

  await advanceTurn(page, '3/20')
  await advanceTurn(page, '4/20')
  await advanceTurn(page, '5/20', { dismissAfter: false })
  await expect(page.getByRole('dialog', { name: /Cutscene|Act briefing|Take Action/ }).first()).toBeVisible()
  await dismissVisibleModal(page)

  await advanceTurn(page, '6/20')
  await dismissVisibleModal(page)
  await page.getByRole('button', { name: 'End turn' }).click()
  await expect(page.getByRole('dialog', { name: /Campaign outcome/ })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('dialog', { name: /Campaign outcome/ }).getByText('Mandate Revoked', { exact: true })).toBeVisible()
})

test('direct SPA entry is blocked by the mission entry gate before gameplay is usable', async ({ page }) => {
  await page.goto('/?code=e2e-direct-entry')
  await expect(page.locator('body')).toHaveClass(/game-active/)
  await expect(page.getByRole('dialog', { name: /Mission Entry|Sessions/ })).toBeVisible()
  await expect(page.locator('.game-main')).toHaveAttribute('inert', '')
  await expect(page.locator('.game-action-bar')).toHaveAttribute('inert', '')
})

test('keyboard-only modal flow traps focus and restores it to the launcher', async ({ page }) => {
  await startNewCampaign(page)

  const missionBriefButton = page.locator('#btn-mission-brief')
  await missionBriefButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Mission brief/i })).toBeVisible()
  await expect(page.locator('.game-main')).toHaveAttribute('inert', '')

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab')
    await expect
      .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('.modal-content'))))
      .toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(missionBriefButton).toBeFocused()
})

test.describe('release support gate', () => {
  test('allows the supported desktop/laptop class at the minimum supported viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await enterArenaToMissionEntry(page)
  })

  test('allows the supported desktop/laptop class at the standard production viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await enterArenaToMissionEntry(page)
  })

  test('blocks undersized desktop windows before the game interface starts', async ({ page }) => {
    await page.setViewportSize({ width: 1279, height: 720 })
    await page.goto('/')
    await page.locator('#enterArenaBtn').click()
    await expectReleaseSupportGate(page, /viewport at least 1280 x 720/i)
  })

  test('blocks unsupported direct auth callback entry before the game interface starts', async ({ page }) => {
    await page.setViewportSize({ width: 1279, height: 720 })
    await page.goto('/?code=e2e-unsupported-entry')
    await expectReleaseSupportGate(page, /viewport at least 1280 x 720/i)
  })

  test.describe('phone touch device', () => {
    const iPhone13 = devices['iPhone 13']

    test.use({
      viewport: iPhone13.viewport,
      userAgent: iPhone13.userAgent,
      deviceScaleFactor: iPhone13.deviceScaleFactor,
      isMobile: iPhone13.isMobile,
      hasTouch: iPhone13.hasTouch,
    })

    test('blocks phones before the game interface starts', async ({ page }) => {
      await page.goto('/')
      await page.locator('#enterArenaBtn').click()
      await expectReleaseSupportGate(page, /phones, tablets, and touch-only devices/i)
    })
  })

  test.describe('tablet touch-only device', () => {
    test.use({
      viewport: { width: 1366, height: 1024 },
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })

    test('blocks tablets before the game interface starts', async ({ page }) => {
      await page.goto('/')
      await page.locator('#enterArenaBtn').click()
      await expectReleaseSupportGate(page, /phones, tablets, and touch-only devices/i)
    })
  })

  test.describe('unsupported browser family', () => {
    test.use({
      viewport: { width: 1440, height: 1000 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    })

    test('blocks non-Chromium desktop browsers before the game interface starts', async ({ page }) => {
      await page.goto('/')
      await page.locator('#enterArenaBtn').click()
      await expectReleaseSupportGate(page, /Use current stable Chrome or Edge/i)
    })
  })

  test('blocks storage-disabled browsers before the game interface starts', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('local storage disabled')
        },
      })
    })

    await page.goto('/')
    await page.locator('#enterArenaBtn').click()
    await expectReleaseSupportGate(page, /Enable browser local storage/i)
  })

  test('blocks offline entry before the game interface starts', async ({ page }) => {
    await page.goto('/')
    await page.context().setOffline(true)
    try {
      await page.locator('#enterArenaBtn').click()
      await expectReleaseSupportGate(page, /Reconnect to the internet/i)
    } finally {
      await page.context().setOffline(false)
    }
  })
})

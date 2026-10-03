import { expect, type Page } from '@playwright/test'

export type MediaMode = 'complete' | 'reject' | 'stall'

export interface ScriptedAction {
  turn: number
  actionId: string
  category: string
  dialogueAfter?: {
    actorKey: string
    choiceName: string
  }
}

export async function installMediaHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type HarnessWindow = Window & { __africanMandateMediaMode?: MediaMode }
    const harnessWindow = window as HarnessWindow
    const playingMedia = new WeakSet<HTMLMediaElement>()

    harnessWindow.__africanMandateMediaMode = 'complete'

    const dispatchMediaEvent = (element: HTMLMediaElement, eventName: string): void => {
      element.dispatchEvent(new Event(eventName))
    }

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value() {
        const element = this as HTMLMediaElement
        const mode = harnessWindow.__africanMandateMediaMode ?? 'complete'

        if (mode === 'reject') {
          return Promise.reject(new DOMException('Synthetic media rejection', 'NotAllowedError'))
        }

        playingMedia.add(element)
        window.setTimeout(() => {
          dispatchMediaEvent(element, 'loadedmetadata')
          dispatchMediaEvent(element, 'loadeddata')
          dispatchMediaEvent(element, 'canplay')
          dispatchMediaEvent(element, 'play')
          dispatchMediaEvent(element, 'playing')
          if (mode === 'complete' && !element.loop && !element.classList.contains('demo-tour-audio-native')) {
            window.setTimeout(() => {
              playingMedia.delete(element)
              dispatchMediaEvent(element, 'ended')
            }, 80)
          }
        }, 0)
        return Promise.resolve()
      },
    })

    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value() {
        const element = this as HTMLMediaElement
        playingMedia.delete(element)
        dispatchMediaEvent(element, 'pause')
      },
    })

    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() {
        return !playingMedia.has(this as HTMLMediaElement)
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

export async function setMediaMode(page: Page, mode: MediaMode): Promise<void> {
  await page.evaluate((nextMode) => {
    ;(window as Window & { __africanMandateMediaMode?: MediaMode }).__africanMandateMediaMode = nextMode
  }, mode)
}

export async function waitForNoDialog(page: Page): Promise<void> {
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })
}

export async function startGuestCampaign(
  page: Page,
  options: { sessionName?: string; difficulty?: 'narrative' | 'standard' | 'expert' } = {}
): Promise<void> {
  await page.goto('/')
  await page.locator('#enterArenaBtn').click()
  const entryDialog = page.getByRole('dialog', { name: /Mission Entry|Sessions/ })
  await expect(entryDialog).toBeVisible()
  await expect(entryDialog.getByText('Guest mode is active')).toBeVisible()

  if (options.sessionName) {
    await entryDialog.getByLabel('Session name').first().fill(options.sessionName)
  }
  const difficultyLabel = options.difficulty ?? 'standard'
  await entryDialog
    .getByRole('radio', { name: new RegExp(`^${difficultyLabel}`, 'i') })
    .check()

  await entryDialog.getByRole('button', { name: 'Start new campaign' }).click()
  await expect(page.getByRole('button', { name: 'Take action' })).toBeVisible({ timeout: 15_000 })
  await waitForNoDialog(page)
}

export async function dismissPostTurnOverlays(page: Page): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    if ((await page.getByRole('dialog').count()) === 0) return

    const turnTransition = page.getByRole('dialog', { name: 'Turn Transition', exact: true })
    if (await turnTransition.isVisible().catch(() => false)) {
      await expect(turnTransition).toBeHidden({ timeout: 5_000 })
      continue
    }

    const skip = page.getByRole('button', { name: 'Skip', exact: true })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click()
      continue
    }

    const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click()
      continue
    }

    const actBriefing = page.getByRole('dialog', { name: /Act briefing/i })
    if (await actBriefing.isVisible().catch(() => false)) {
      const continueToOperations = actBriefing.getByRole('button', {
        name: 'Continue to operations',
        exact: true,
      })
      if (await continueToOperations.isVisible().catch(() => false)) {
        await continueToOperations.click()
        const takeActionDialog = page.getByRole('dialog', { name: 'Take Action', exact: true })
        await expect(takeActionDialog).toBeVisible()
        await takeActionDialog.getByLabel('Close', { exact: true }).click()
      } else {
        await actBriefing.getByLabel('Close', { exact: true }).click()
      }
      continue
    }

    const dialogSummary = await page.getByRole('dialog').evaluateAll((dialogs) =>
      dialogs
        .map((dialog) => {
          const labelledBy = dialog.getAttribute('aria-labelledby')
          const accessibleName =
            dialog.getAttribute('aria-label') ??
            (labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : null) ??
            'unnamed dialog'
          const text = (dialog.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 240)
          return `${accessibleName}: ${text}`
        })
        .join(' | ')
    )
    throw new Error(
      `Unexpected post-turn modal; refusing to conceal the state with a generic Escape action. Visible dialog: ${dialogSummary}`
    )
  }

  await waitForNoDialog(page)
}

export async function expectTurn(page: Page, turn: number): Promise<void> {
  await expect(
    page.locator('.turn-progress-now-value').filter({ hasText: `${turn}/20` })
  ).toBeVisible({ timeout: 15_000 })
}

export async function endTurn(page: Page, expectedTurn: number): Promise<void> {
  await page.getByRole('button', { name: 'End turn' }).click()
  const expectedTurnIndicator = page
    .locator('.turn-progress-now-value')
    .filter({ hasText: `${expectedTurn}/20` })
  const outcomeDialog = page.getByRole('dialog', { name: /Campaign outcome/ })
  const transition = await Promise.race([
    expectedTurnIndicator.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'turn' as const),
    outcomeDialog.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'outcome' as const),
  ])
  if (transition === 'outcome') {
    const outcome = (await outcomeDialog.textContent())?.replace(/\s+/g, ' ').trim() ?? 'Unknown outcome'
    throw new Error(`Campaign ended before Turn ${expectedTurn}: ${outcome}`)
  }
  await dismissPostTurnOverlays(page)
}

export async function performAction(page: Page, scriptedAction: ScriptedAction): Promise<void> {
  await page.getByRole('button', { name: 'Take action' }).click()
  const dialog = page.getByRole('dialog', { name: /Take Action/ })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Category').selectOption(scriptedAction.category)
  await dialog.getByLabel('Action').selectOption(scriptedAction.actionId)

  const review = dialog.getByRole('button', { name: 'Review action' })
  await expect(review).toBeEnabled()
  await review.click()
  const confirm = dialog.getByRole('button', { name: 'Confirm action' })
  await expect(confirm).toBeEnabled()
  await confirm.click()

  const transitionDialog = page.getByRole('dialog', { name: 'Operational Transition' })
  await expect(transitionDialog).toBeVisible({ timeout: 12_000 })

  const resumeOperations = transitionDialog.getByRole('button', { name: 'Resume Operations' })
  await expect(resumeOperations).toBeEnabled({ timeout: 12_000 })
  await resumeOperations.click()
  await expect(transitionDialog).toBeHidden({ timeout: 15_000 })
}

export async function performDialogueChoice(
  page: Page,
  actorKey: string,
  choiceName: string
): Promise<void> {
  const actorCard = page.locator(`[data-actor-key="${actorKey}"]`)
  await expect(actorCard).toBeVisible()
  await actorCard.getByRole('button', { name: 'Engage', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Dialogue' })
  await expect(dialog).toBeVisible()
  const choice = dialog.getByRole('button', { name: new RegExp(`^${choiceName}\\b`, 'i') })
  await expect(choice).toBeEnabled()
  await choice.click()
  await expect(dialog.getByText('Dialogue outcome')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await waitForNoDialog(page)
}

export async function saveAndResumeGuestCampaign(page: Page, expectedTurn: number): Promise<void> {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Save Session' }).click()
  const sessionDialog = page.getByRole('dialog', { name: /Sessions/ })
  await expect(sessionDialog).toBeVisible()
  await expect(sessionDialog.getByRole('button', { name: 'Continue mandate' })).toBeEnabled()
  await sessionDialog.getByLabel('Close', { exact: true }).click()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#enterArenaBtn').click()
  const entryDialog = page.getByRole('dialog', { name: /Mission Entry|Sessions/ })
  await expect(entryDialog).toBeVisible()
  await entryDialog.getByRole('button', { name: 'Continue mandate' }).click()
  await expectTurn(page, expectedTurn)
  await dismissPostTurnOverlays(page)
}

export function collectUnexpectedErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

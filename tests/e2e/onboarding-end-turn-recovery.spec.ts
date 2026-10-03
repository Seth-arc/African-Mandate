import { expect, test } from '@playwright/test'
import {
  collectUnexpectedErrors,
  expectTurn,
  installMediaHarness,
  setMediaMode,
  startGuestCampaign,
  waitForNoDialog,
} from './support/gameplay'

test.beforeEach(async ({ page }) => {
  await installMediaHarness(page)
})

test('onboarding advances, closes, reopens, and restores focus to its launcher', async ({ page }) => {
  await startGuestCampaign(page)
  const launcher = page.getByRole('button', { name: 'Onboarding' })

  await launcher.focus()
  await launcher.click()
  await expect(page.getByRole('dialog', { name: /Opening Brief/ })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('dialog', { name: /Command Rail/ })).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()
  await waitForNoDialog(page)
  await expect(launcher).toBeFocused()

  await launcher.click()
  await expect(page.getByRole('dialog', { name: /Opening Brief/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await waitForNoDialog(page)
  await expect(launcher).toBeFocused()
})

test('rapid repeated End turn input advances exactly once and restores controls', async ({ page }) => {
  await startGuestCampaign(page)
  const endTurn = page.getByRole('button', { name: 'End turn' })

  await endTurn.evaluate((button) => {
    ;(button as HTMLButtonElement).click()
    ;(button as HTMLButtonElement).click()
  })

  await expectTurn(page, 2)
  await waitForNoDialog(page)
  await expect(page.getByRole('button', { name: 'End turn' })).toBeEnabled()
  await expect(page.locator('.turn-progress-now-value').filter({ hasText: '3/20' })).toHaveCount(0)
})

for (const mediaMode of ['reject', 'stall'] as const) {
  test(`End turn completes exactly once when transition media must ${mediaMode}`, async ({ page }) => {
    const unexpectedErrors = collectUnexpectedErrors(page)
    await startGuestCampaign(page)
    await setMediaMode(page, mediaMode)

    await page.getByRole('button', { name: 'End turn' }).click()
    await expectTurn(page, 2)
    await waitForNoDialog(page)
    await expect(page.getByRole('button', { name: 'End turn' })).toBeEnabled()
    await expect(page.locator('.turn-progress-now-value').filter({ hasText: '3/20' })).toHaveCount(0)
    expect(unexpectedErrors).toEqual([])
  })
}

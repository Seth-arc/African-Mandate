import { expect, test } from '@playwright/test'
import {
  endTurn,
  installMediaHarness,
  performAction,
  startGuestCampaign,
  waitForNoDialog,
} from './support/gameplay'

test.beforeEach(async ({ page }) => {
  await installMediaHarness(page)
})

test('guest is the supported default and saves, renames, refreshes, and resumes locally', async ({ page }) => {
  await page.route(/supabase\.co/i, (route) => route.abort())
  await page.goto('/')
  await page.locator('#enterArenaBtn').click()
  const entryGate = page.getByRole('dialog', { name: /Mission Entry|Sessions/ })
  await expect(entryGate.getByRole('button', { name: 'Continue with Google (Experimental)' })).toBeVisible()
  await expect(entryGate.getByText(/outside the supported demo guarantee/i)).toBeVisible()
  await entryGate.getByLabel('Session name').first().fill('Guest Release Run')
  await entryGate.getByRole('button', { name: 'Start new campaign' }).click()
  await expect(page.getByRole('button', { name: 'Take action' })).toBeVisible({ timeout: 15_000 })
  await waitForNoDialog(page)
  await expect(page.getByText('Guest Mode', { exact: true })).toBeVisible()

  await performAction(page, {
    turn: 1,
    actionId: 'security_patrol_deployment',
    category: 'security',
  })
  await endTurn(page, 2)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Save Session' }).click()
  const sessionDialog = page.getByRole('dialog', { name: /Sessions/ })
  await expect(sessionDialog).toBeVisible()
  await expect(sessionDialog.getByText(/Guest mode is active/)).toBeVisible()
  await sessionDialog.getByText('Saved mandates', { exact: true }).click()
  const savedName = sessionDialog.locator('input[id^="saved-session-name-"]').first()
  await expect(savedName).toHaveValue('Guest Release Run')
  await savedName.fill('Renamed Guest Release Run')
  await sessionDialog.getByRole('button', { name: 'Rename' }).first().click()
  await expect(sessionDialog.getByText('Session name updated.')).toBeVisible()
  await sessionDialog.getByLabel('Close', { exact: true }).click()

  await page.reload()
  await page.locator('#enterArenaBtn').click()
  const entryDialog = page.getByRole('dialog', { name: /Mission Entry|Sessions/ })
  await expect(entryDialog.getByText('Renamed Guest Release Run')).toBeVisible()
  await entryDialog.getByRole('button', { name: 'Continue mandate' }).click()
  await expect(page.locator('.turn-progress-now-value').filter({ hasText: '2/20' })).toBeVisible()
  await waitForNoDialog(page)
  await expect(page.getByText('Security Patrol Deployment')).toBeVisible()
})

test('guest storage failure keeps the campaign playable and exposes retry guidance', async ({ page }) => {
  await startGuestCampaign(page, { sessionName: 'Storage Recovery Run' })
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Synthetic storage quota failure', 'QuotaExceededError')
    }
  })

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Save Session' }).click()
  const sessionDialog = page.getByRole('dialog', { name: /Sessions/ })
  await expect(sessionDialog.getByRole('alert')).toContainText('Manual save failed.')
  await sessionDialog.getByLabel('Close', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Take action' })).toBeEnabled()
  await expect(page.getByRole('alert')).toContainText('Not saved.')
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible()
})

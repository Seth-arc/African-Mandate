import { expect, test, type Page, type TestInfo } from '@playwright/test'
import {
  collectUnexpectedErrors,
  endTurn,
  expectTurn,
  installMediaHarness,
  performAction,
  performDialogueChoice,
  saveAndResumeGuestCampaign,
  startGuestCampaign,
  type ScriptedAction,
} from './support/gameplay'

type StrategyName = 'security-heavy' | 'diplomacy-heavy' | 'balanced'

interface StrategyScript {
  name: StrategyName
  actions: ScriptedAction[]
}

const STRATEGIES: StrategyScript[] = [
  {
    name: 'security-heavy',
    actions: [
      { turn: 1, actionId: 'security_patrol_deployment', category: 'security' },
      {
        turn: 1,
        actionId: 'civil_society_partnership',
        category: 'diplomacy',
        dialogueAfter: { actorKey: 'civil_society_konate', choiceName: 'Full Partnership' },
      },
      { turn: 2, actionId: 'community_led_mediation', category: 'community_mediation' },
      { turn: 2, actionId: 'intelligence_threat_assessment', category: 'intelligence' },
      { turn: 3, actionId: 'humanitarian_corridor_establishment', category: 'humanitarian' },
      { turn: 4, actionId: 'security_patrol_deployment', category: 'security' },
      { turn: 5, actionId: 'intelligence_network_cultivation', category: 'intelligence' },
    ],
  },
  {
    name: 'diplomacy-heavy',
    actions: [
      { turn: 1, actionId: 'diplomacy_international_outreach', category: 'diplomacy' },
      {
        turn: 1,
        actionId: 'civil_society_partnership',
        category: 'diplomacy',
        dialogueAfter: { actorKey: 'civil_society_konate', choiceName: 'Full Partnership' },
      },
      { turn: 2, actionId: 'community_led_mediation', category: 'community_mediation' },
      { turn: 3, actionId: 'humanitarian_corridor_establishment', category: 'humanitarian' },
      { turn: 5, actionId: 'security_patrol_deployment', category: 'security' },
    ],
  },
  {
    name: 'balanced',
    actions: [
      { turn: 1, actionId: 'security_patrol_deployment', category: 'security' },
      {
        turn: 1,
        actionId: 'civil_society_partnership',
        category: 'diplomacy',
        dialogueAfter: { actorKey: 'civil_society_konate', choiceName: 'Full Partnership' },
      },
      { turn: 2, actionId: 'community_led_mediation', category: 'community_mediation' },
      { turn: 3, actionId: 'humanitarian_corridor_establishment', category: 'humanitarian' },
      { turn: 5, actionId: 'climate_drought_resilience', category: 'climate' },
      { turn: 6, actionId: 'intelligence_threat_assessment', category: 'intelligence' },
    ],
  },
]

function categoryTotals(actions: ScriptedAction[]): Record<string, number> {
  return actions.reduce<Record<string, number>>((totals, action) => {
    totals[action.category] = (totals[action.category] ?? 0) + 1
    return totals
  }, {})
}

function assertStrategyClassification(strategy: StrategyScript): void {
  const totals = categoryTotals(strategy.actions)
  const totalActions = strategy.actions.length
  const largestCount = Math.max(...Object.values(totals))

  if (strategy.name === 'security-heavy') {
    expect(totals.security).toBe(largestCount)
    expect((totals.security ?? 0) + (totals.intelligence ?? 0)).toBeGreaterThanOrEqual(
      Math.ceil(totalActions / 2)
    )
    return
  }

  if (strategy.name === 'diplomacy-heavy') {
    expect(totals.diplomacy).toBe(largestCount)
    expect((totals.diplomacy ?? 0) + (totals.community_mediation ?? 0)).toBeGreaterThanOrEqual(
      Math.ceil(totalActions / 2)
    )
    return
  }

  expect(Object.keys(totals)).toHaveLength(6)
  expect(largestCount / totalActions).toBeLessThanOrEqual(0.35)
}

async function captureTurnSnapshot(page: Page, turn: number, actions: ScriptedAction[]) {
  return {
    turn,
    actionIds: actions.map((action) => action.actionId),
    categories: actions.map((action) => action.category),
    resources: await page.locator('#resource-panel .resource-item').allTextContents(),
    metrics: await page.locator('#metrics-panel [role="progressbar"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        label: node.parentElement?.textContent?.trim() ?? '',
        value: node.getAttribute('aria-valuenow'),
      }))
    ),
    pressure: await page.locator('.turn-pressure-value').textContent(),
  }
}

async function attachRunRecord(
  testInfo: TestInfo,
  strategy: StrategyScript,
  snapshots: Awaited<ReturnType<typeof captureTurnSnapshot>>[],
  outcome: string
): Promise<void> {
  await testInfo.attach(`${strategy.name}-automated-run.json`, {
    body: JSON.stringify(
      {
        strategy: strategy.name,
        categoryTotals: categoryTotals(strategy.actions),
        scriptedActions: strategy.actions,
        snapshots,
        outcome,
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
}

for (const strategy of STRATEGIES) {
  test(`${strategy.name} script reaches and resolves Turn 20 with deterministic guest resume`, async ({ page }, testInfo) => {
    test.setTimeout(300_000)
    assertStrategyClassification(strategy)
    const unexpectedErrors = collectUnexpectedErrors(page)
    const snapshots: Awaited<ReturnType<typeof captureTurnSnapshot>>[] = []
    await installMediaHarness(page)
    await startGuestCampaign(page, {
      sessionName: `${strategy.name} release run`,
      difficulty: 'standard',
    })

    for (let turn = 1; turn <= 20; turn += 1) {
      await expectTurn(page, turn)
      const actions = strategy.actions.filter((candidate) => candidate.turn === turn)
      for (const action of actions) {
        await performAction(page, action)
        if (action.dialogueAfter) {
          await performDialogueChoice(
            page,
            action.dialogueAfter.actorKey,
            action.dialogueAfter.choiceName
          )
        }
      }

      snapshots.push(await captureTurnSnapshot(page, turn, actions))

      if (turn === 10) {
        await saveAndResumeGuestCampaign(page, turn)
      }

      if (turn < 20) {
        await endTurn(page, turn + 1)
      }
    }

    await page.getByRole('button', { name: 'End turn' }).click()
    const outcomeDialog = page.getByRole('dialog', { name: /Campaign outcome/ })
    await expect(outcomeDialog).toBeVisible({ timeout: 20_000 })
    const outcome = (await outcomeDialog.textContent()) ?? ''
    await attachRunRecord(testInfo, strategy, snapshots, outcome)
    expect(unexpectedErrors).toEqual([])
  })
}

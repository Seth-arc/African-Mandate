/**
 * Unit tests for UI selection and map layer state.
 * Sources:
 * - src/state/uiStore.ts
 * - game/dev_docs/AI_CO_DEVELOPMENT_PLAN.md (Phase 2 map selection contract)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../../src/state/uiStore'

describe('uiStore map and modal state', () => {
  beforeEach(() => {
    useUiStore.getState().reset()
  })

  it('tracks territory and zone selection in uiStore and clears both with clearMapSelection', () => {
    useUiStore.getState().setSelectedTerritory('mali')
    useUiStore.getState().setSelectedZone('gao')

    expect(useUiStore.getState().selectedTerritoryKey).toBe('mali')
    expect(useUiStore.getState().selectedZoneId).toBe('gao')

    useUiStore.getState().clearMapSelection()

    expect(useUiStore.getState().selectedTerritoryKey).toBeNull()
    expect(useUiStore.getState().selectedZoneId).toBeNull()
  })

  it('maintains map layer visibility toggles for territory, zones, and critical filtering', () => {
    const initialLayers = useUiStore.getState().mapLayers
    expect(initialLayers.territories).toBe(true)
    expect(initialLayers.zones).toBe(false)
    expect(initialLayers.criticalOnly).toBe(false)

    useUiStore.getState().setMapLayer('zones', true)
    expect(useUiStore.getState().mapLayers.zones).toBe(true)

    useUiStore.getState().toggleMapLayer('criticalOnly')
    expect(useUiStore.getState().mapLayers.criticalOnly).toBe(true)
  })

  it('tracks action flow allocation and resets flow state on close', () => {
    useUiStore.getState().openModal('action_config')
    useUiStore.getState().setActionFlowStep('review')
    useUiStore.getState().setActionAllocationValue('budget', 1250000)

    expect(useUiStore.getState().modal).toBe('action_config')
    expect(useUiStore.getState().actionFlowStep).toBe('review')
    expect(useUiStore.getState().actionAllocation?.budget).toBe(1250000)

    useUiStore.getState().closeModal()

    expect(useUiStore.getState().modal).toBe('none')
    expect(useUiStore.getState().actionFlowStep).toBe('configure')
    expect(useUiStore.getState().actionAllocation).toBeNull()
    expect(useUiStore.getState().actionOutcome).toBeNull()
  })

  it('tracks dialogue selection flow and resets it when actor changes or modal closes', () => {
    useUiStore.getState().setSelectedActorKey('junta_burkina_traore')
    useUiStore.getState().setSelectedDialogueId('dialogue_junta_negotiation')
    useUiStore.getState().openModal('dialogue')
    useUiStore.getState().setDialogueOutcome('loc.dialogue.junta.outcome.conditional.line_001', 'conditional_support')

    expect(useUiStore.getState().modal).toBe('dialogue')
    expect(useUiStore.getState().selectedDialogueId).toBe('dialogue_junta_negotiation')
    expect(useUiStore.getState().dialogueFlowStep).toBe('outcome')
    expect(useUiStore.getState().dialogueChoiceId).toBe('conditional_support')

    useUiStore.getState().setSelectedActorKey('civil_society_konate')
    expect(useUiStore.getState().selectedDialogueId).toBeNull()
    expect(useUiStore.getState().dialogueFlowStep).toBe('choices')
    expect(useUiStore.getState().dialogueOutcomeTextKey).toBeNull()

    useUiStore.getState().closeModal()
    expect(useUiStore.getState().modal).toBe('none')
    expect(useUiStore.getState().dialogueChoiceId).toBeNull()
  })

  it('keeps Fast Reveal locked until unlocked and tracks reveal mode + turn loop timing', () => {
    expect(useUiStore.getState().fastRevealUnlocked).toBe(false)
    expect(useUiStore.getState().revealMode).toBe('full')

    useUiStore.getState().setRevealMode('fast')
    expect(useUiStore.getState().revealMode).toBe('full')

    useUiStore.getState().unlockFastReveal()
    useUiStore.getState().setRevealMode('fast')
    expect(useUiStore.getState().fastRevealUnlocked).toBe(true)
    expect(useUiStore.getState().revealMode).toBe('fast')

    useUiStore.getState().startTurnLoop(1234)
    expect(useUiStore.getState().turnLoopStartedAtMs).toBe(1234)
    useUiStore.getState().clearTurnLoop()
    expect(useUiStore.getState().turnLoopStartedAtMs).toBeNull()
  })

  it('preserves take-action selection on close and clears it explicitly at turn transition', () => {
    useUiStore.getState().setTakeActionSelectionTurn(3)
    useUiStore.getState().setSelectedAction('deploy_mobile_clinics', { territory_key: 'mali' })
    useUiStore.getState().openModal('action_config')
    useUiStore.getState().closeModal()

    expect(useUiStore.getState().selectedActionId).toBe('deploy_mobile_clinics')
    expect(useUiStore.getState().selectedTarget).toEqual({ territory_key: 'mali' })
    expect(useUiStore.getState().takeActionSelectionTurn).toBe(3)

    useUiStore.getState().clearTakeActionSelection()
    expect(useUiStore.getState().selectedActionId).toBeNull()
    expect(useUiStore.getState().selectedTarget).toBeNull()
    expect(useUiStore.getState().takeActionSelectionTurn).toBeNull()
  })
})

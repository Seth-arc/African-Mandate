/**
 * UI state: modals, selections, panel toggles.
 * Kept separate from gameStore per BUILD_STEPS / AGENTS.md.
 */

import { create } from 'zustand'
import type { ActionLogEntry, Resources } from './types'
import { playUiSfx } from '../utils/uiSfx'

export type ModalKind =
  | 'none'
  | 'onboarding_loading'
  | 'session_manager'
  | 'dossier'
  | 'dossier_article'
  | 'relationship_matrix'
  | 'action_config'
  | 'territory_overview'
  | 'zone_list'
  | 'zone_detail'
  | 'intel_report'
  | 'actor_profile'
  | 'player_profile'
  | 'dialogue'
  | 'act_briefing'
  | 'campaign_outcome'
  | 'status_report'
  | 'mission_brief'
  | 'credits'
  | 'leaderboard'

const REPORT_MODAL_SOUND_KINDS: ReadonlySet<ModalKind> = new Set([
  'mission_brief',
  'intel_report',
  'status_report',
])

function playModalTransitionSfx(previousModal: ModalKind, nextModal: ModalKind): void {
  if (previousModal === nextModal) return

  const previousIsReportModal = REPORT_MODAL_SOUND_KINDS.has(previousModal)
  const nextIsReportModal = REPORT_MODAL_SOUND_KINDS.has(nextModal)

  if (previousIsReportModal && !nextIsReportModal) {
    playUiSfx('modal_close')
    return
  }

  if (nextIsReportModal) {
    playUiSfx('modal_open')
  }
}

export type ActionFlowStep = 'configure' | 'review' | 'outcome'
export type DialogueFlowStep = 'choices' | 'outcome'

export interface MapLayerState {
  territories: boolean
  zones: boolean
  criticalOnly: boolean
}

export interface UiState {
  /** Which modal is open. */
  modal: ModalKind
  /** Selected action id (for action_config modal). */
  selectedActionId: string | null
  /** Selected target (zone_id, territory_key, or actor_key). */
  selectedTarget: { zone_id?: string; territory_key?: string; actor_key?: string } | null
  /** Step within the action modal flow. */
  actionFlowStep: ActionFlowStep
  /** Draft resource allocation for the selected action. */
  actionAllocation: Partial<Resources> | null
  /** Last confirmed action outcome shown in modal step 3. */
  actionOutcome: ActionLogEntry | null
  /** Selected intel report_key (for intel_report modal). */
  selectedReportKey: string | null
  /** Selected dossier article id (for dossier article modal). */
  selectedDossierArticleId: string | null
  /** Selected actor_key (for dialogue modal). */
  selectedActorKey: string | null
  /** Selected dialogue_id (for dialogue modal). */
  selectedDialogueId: string | null
  /** Step within dialogue modal flow. */
  dialogueFlowStep: DialogueFlowStep
  /** Outcome text key from last selected dialogue choice. */
  dialogueOutcomeTextKey: string | null
  /** Last selected dialogue choice id. */
  dialogueChoiceId: string | null
  /** Intel feed minimized (right sidebar). */
  intelFeedMinimized: boolean
  /** Selected territory for map/territory details. */
  selectedTerritoryKey: string | null
  /** Selected zone_id for map/territory details. */
  selectedZoneId: string | null
  /** Map layer/legend toggle state. */
  mapLayers: MapLayerState
  /** Threat threshold used by critical-only map filtering. */
  mapThreatThreshold: number
}

const initialState: UiState = {
  modal: 'none',
  selectedActionId: null,
  selectedTarget: null,
  actionFlowStep: 'configure',
  actionAllocation: null,
  actionOutcome: null,
  selectedReportKey: null,
  selectedDossierArticleId: null,
  selectedActorKey: null,
  selectedDialogueId: null,
  dialogueFlowStep: 'choices',
  dialogueOutcomeTextKey: null,
  dialogueChoiceId: null,
  intelFeedMinimized: false,
  selectedTerritoryKey: null,
  selectedZoneId: null,
  mapLayers: {
    territories: true,
    zones: false,
    criticalOnly: false,
  },
  mapThreatThreshold: 75,
}

interface UiStore extends UiState {
  openModal: (kind: ModalKind) => void
  closeModal: () => void
  setSelectedAction: (actionId: string | null, target: UiState['selectedTarget']) => void
  setActionFlowStep: (step: ActionFlowStep) => void
  setActionAllocation: (allocation: Partial<Resources> | null) => void
  setActionAllocationValue: (key: keyof Resources, value: number) => void
  setActionOutcome: (outcome: ActionLogEntry | null) => void
  resetActionFlow: () => void
  setSelectedReportKey: (key: string | null) => void
  setSelectedDossierArticle: (id: string | null) => void
  setSelectedActorKey: (key: string | null) => void
  setSelectedDialogueId: (id: string | null) => void
  setDialogueFlowStep: (step: DialogueFlowStep) => void
  setDialogueOutcome: (outcomeTextKey: string | null, choiceId: string | null) => void
  resetDialogueFlow: () => void
  toggleIntelFeed: () => void
  setSelectedTerritory: (key: string | null) => void
  setSelectedZone: (zoneId: string | null) => void
  clearMapSelection: () => void
  setMapLayer: (layer: keyof MapLayerState, enabled: boolean) => void
  toggleMapLayer: (layer: keyof MapLayerState) => void
  setMapThreatThreshold: (threshold: number) => void
  reset: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  ...initialState,
  openModal: (kind) =>
    set((s) => {
      playModalTransitionSfx(s.modal, kind)
      if (kind !== 'action_config') {
        if (kind !== 'dialogue') {
          return { modal: kind }
        }
        return {
          modal: kind,
          dialogueFlowStep: 'choices',
          dialogueOutcomeTextKey: null,
          dialogueChoiceId: null,
        }
      }
      return {
        modal: kind,
        actionFlowStep: 'configure',
        actionAllocation: s.actionAllocation ?? null,
        actionOutcome: null,
      }
    }),
  closeModal: () =>
    set((s) => {
      playModalTransitionSfx(s.modal, 'none')
      return {
        modal: 'none',
        selectedActionId: null,
        selectedTarget: null,
        actionFlowStep: 'configure',
        actionAllocation: null,
        actionOutcome: null,
        selectedReportKey: null,
        selectedDossierArticleId: null,
        selectedActorKey: null,
        selectedDialogueId: null,
        dialogueFlowStep: 'choices',
        dialogueOutcomeTextKey: null,
        dialogueChoiceId: null,
      }
    }),
  setSelectedAction: (actionId, target) =>
    set({
      selectedActionId: actionId,
      selectedTarget: target ?? null,
      actionFlowStep: 'configure',
      actionOutcome: null,
    }),
  setActionFlowStep: (step) => set({ actionFlowStep: step }),
  setActionAllocation: (allocation) => set({ actionAllocation: allocation }),
  setActionAllocationValue: (key, value) =>
    set((s) => ({
      actionAllocation: {
        ...(s.actionAllocation ?? {}),
        [key]: value,
      },
    })),
  setActionOutcome: (outcome) => set({ actionOutcome: outcome }),
  resetActionFlow: () =>
    set({
      actionFlowStep: 'configure',
      actionAllocation: null,
      actionOutcome: null,
    }),
  setSelectedReportKey: (key) => set({ selectedReportKey: key }),
  setSelectedDossierArticle: (id) => set({ selectedDossierArticleId: id }),
  setSelectedActorKey: (key) =>
    set({
      selectedActorKey: key,
      selectedDialogueId: null,
      dialogueFlowStep: 'choices',
      dialogueOutcomeTextKey: null,
      dialogueChoiceId: null,
    }),
  setSelectedDialogueId: (id) =>
    set({
      selectedDialogueId: id,
      dialogueFlowStep: 'choices',
      dialogueOutcomeTextKey: null,
      dialogueChoiceId: null,
    }),
  setDialogueFlowStep: (step) => set({ dialogueFlowStep: step }),
  setDialogueOutcome: (outcomeTextKey, choiceId) =>
    set({
      dialogueOutcomeTextKey: outcomeTextKey,
      dialogueChoiceId: choiceId,
      dialogueFlowStep: 'outcome',
    }),
  resetDialogueFlow: () =>
    set({
      dialogueFlowStep: 'choices',
      dialogueOutcomeTextKey: null,
      dialogueChoiceId: null,
    }),
  toggleIntelFeed: () => set((s) => ({ intelFeedMinimized: !s.intelFeedMinimized })),
  setSelectedTerritory: (key) => set({ selectedTerritoryKey: key }),
  setSelectedZone: (zoneId) => set({ selectedZoneId: zoneId }),
  clearMapSelection: () => set({ selectedTerritoryKey: null, selectedZoneId: null }),
  setMapLayer: (layer, enabled) =>
    set((s) => ({
      mapLayers: {
        ...s.mapLayers,
        [layer]: enabled,
      },
    })),
  toggleMapLayer: (layer) =>
    set((s) => ({
      mapLayers: {
        ...s.mapLayers,
        [layer]: !s.mapLayers[layer],
      },
    })),
  setMapThreatThreshold: (threshold) =>
    set({
      mapThreatThreshold: Math.max(0, Math.min(100, Math.round(threshold))),
    }),
  reset: () => set(initialState),
}))

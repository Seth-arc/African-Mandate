import { createInitialState } from './initState'
import type { DifficultyMode, GameConfig, GameContent, GameState, Resources } from './types'

const DIFFICULTY_RESOURCE_MULTIPLIER: Record<DifficultyMode, number> = {
  narrative: 1.2,
  standard: 1,
  expert: 0.8,
}

const DIFFICULTY_EVENT_FREQUENCY_MULTIPLIER: Record<DifficultyMode, number> = {
  narrative: 0.8,
  standard: 1,
  expert: 1.2,
}

function scaleResourceValue(value: number, multiplier: number): number {
  return Math.max(0, Math.round(value * multiplier))
}

function scaleResources(resources: Resources, multiplier: number): Resources {
  return {
    budget: scaleResourceValue(resources.budget, multiplier),
    political_capital: scaleResourceValue(resources.political_capital, multiplier),
    personnel: scaleResourceValue(resources.personnel, multiplier),
    intel_points: scaleResourceValue(resources.intel_points, multiplier),
    time_months: scaleResourceValue(resources.time_months, multiplier),
  }
}

export function resolveDifficultyMode(mode: DifficultyMode | undefined): DifficultyMode {
  return mode ?? 'standard'
}

export function applyDifficultyToConfig(config: GameConfig, mode: DifficultyMode): GameConfig {
  const difficultyMode = resolveDifficultyMode(mode)
  const baseResources = config.base_starting_resources ?? config.starting_resources

  return {
    ...config,
    base_starting_resources: { ...baseResources },
    starting_resources: scaleResources(baseResources, DIFFICULTY_RESOURCE_MULTIPLIER[difficultyMode]),
    event_frequency_multiplier: DIFFICULTY_EVENT_FREQUENCY_MULTIPLIER[difficultyMode],
  }
}

export function createCampaignState(
  config: GameConfig,
  content: GameContent,
  mode: DifficultyMode
): GameState {
  const difficultyMode = resolveDifficultyMode(mode)
  const state = createInitialState(applyDifficultyToConfig(config, difficultyMode), content)
  return {
    ...state,
    difficulty_mode: difficultyMode,
  }
}

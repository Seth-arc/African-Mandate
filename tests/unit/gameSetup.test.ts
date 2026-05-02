import { describe, expect, it } from 'vitest'
import { applyDifficultyToConfig } from '../../src/state/gameSetup'
import type { GameConfig } from '../../src/state/types'
import gameConfigJson from '../../src/data/game_config.json'

const config = gameConfigJson.game_config as GameConfig

describe('gameSetup', () => {
  it('scales starting resources and event frequency for narrative mode', () => {
    const nextConfig = applyDifficultyToConfig(config, 'narrative')

    expect(nextConfig.starting_resources.budget).toBe(
      Math.round(config.starting_resources.budget * 1.2)
    )
    expect(nextConfig.starting_resources.time_months).toBe(
      Math.round(config.starting_resources.time_months * 1.2)
    )
    expect(nextConfig.event_frequency_multiplier).toBe(0.8)
  })

  it('reuses base starting resources when switching difficulty profiles', () => {
    const expertConfig = applyDifficultyToConfig(config, 'expert')
    const narrativeConfig = applyDifficultyToConfig(expertConfig, 'narrative')

    expect(narrativeConfig.starting_resources.personnel).toBe(
      Math.round(config.starting_resources.personnel * 1.2)
    )
    expect(narrativeConfig.event_frequency_multiplier).toBe(0.8)
  })
})

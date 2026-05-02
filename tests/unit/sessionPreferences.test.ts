import { describe, expect, it } from 'vitest'
import { defaultSessionPreferences } from '../../src/state/sessionPreferences'

describe('sessionPreferences', () => {
  it('defaults context tooltips to disabled', () => {
    const preferences = defaultSessionPreferences()
    expect(preferences.tooltips_enabled).toBe(false)
  })
})

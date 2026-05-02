import type { DifficultyMode } from './types'

export interface SessionPreferences {
  analytics_opt_in: boolean
  difficulty_mode: DifficultyMode
  high_contrast_enabled: boolean
  reduced_motion_enabled: boolean
  tooltips_enabled: boolean
}

const SESSION_PREFERENCES_KEY = 'african_mandate.session_preferences.v1'

function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isDifficultyMode(value: unknown): value is DifficultyMode {
  return value === 'narrative' || value === 'standard' || value === 'expert'
}

export function defaultSessionPreferences(): SessionPreferences {
  return {
    analytics_opt_in: false,
    difficulty_mode: 'standard',
    high_contrast_enabled: false,
    reduced_motion_enabled: systemPrefersReducedMotion(),
    tooltips_enabled: false,
  }
}

export function readStoredSessionPreferences(): SessionPreferences {
  const defaults = defaultSessionPreferences()
  if (typeof window === 'undefined') {
    return defaults
  }

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(SESSION_PREFERENCES_KEY)
  } catch {
    return defaults
  }

  if (!raw) {
    return defaults
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return defaults
  }

  const candidate = parsed as Partial<SessionPreferences>
  return {
    analytics_opt_in:
      typeof candidate.analytics_opt_in === 'boolean'
        ? candidate.analytics_opt_in
        : defaults.analytics_opt_in,
    difficulty_mode: isDifficultyMode(candidate.difficulty_mode)
      ? candidate.difficulty_mode
      : defaults.difficulty_mode,
    high_contrast_enabled:
      typeof candidate.high_contrast_enabled === 'boolean'
        ? candidate.high_contrast_enabled
        : defaults.high_contrast_enabled,
    reduced_motion_enabled:
      typeof candidate.reduced_motion_enabled === 'boolean'
        ? candidate.reduced_motion_enabled
        : defaults.reduced_motion_enabled,
    tooltips_enabled:
      typeof candidate.tooltips_enabled === 'boolean'
        ? candidate.tooltips_enabled
        : defaults.tooltips_enabled,
  }
}

export function writeStoredSessionPreferences(preferences: SessionPreferences): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SESSION_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Preference persistence should not block the UI.
  }
}

export function applySessionPreferencesToDocument(preferences: SessionPreferences): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.contrast = preferences.high_contrast_enabled ? 'high' : 'default'
  root.dataset.motion = preferences.reduced_motion_enabled ? 'reduced' : 'default'
  root.dataset.tooltips = preferences.tooltips_enabled ? 'enabled' : 'disabled'
}

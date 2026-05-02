import { describe, expect, it } from 'vitest'
import { listUiTooltips, resolveUiTooltip } from '../../src/ui/tooltips/tooltipCatalog'

describe('tooltipCatalog', () => {
  it('resolves known interface tooltip definitions', () => {
    const tooltip = resolveUiTooltip('resource.intel_points')

    expect(tooltip).not.toBeNull()
    expect(tooltip?.title).toBe('Intel points')
    expect(tooltip?.description).toContain('Analytical capacity')
  })

  it('returns null for unknown tooltip ids', () => {
    expect(resolveUiTooltip('missing.tooltip.id')).toBeNull()
  })

  it('ships a broad interface tooltip dataset', () => {
    expect(listUiTooltips().length).toBeGreaterThan(20)
  })
})

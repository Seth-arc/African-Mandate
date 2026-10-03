/**
 * Unit tests for the controlled desktop demo bundle budget.
 * Sources:
 * - scripts/validate-demo-bundle.mjs
 * - dev_docs/PRODUCTION_READINESS.md (Demo Bundle Budget)
 */
import { describe, expect, it } from 'vitest'
import { DEMO_BUNDLE_BUDGET, validateBundleMeasurements } from '../../scripts/validate-demo-bundle.mjs'

describe('controlled desktop demo bundle budget', () => {
  it('accepts raw and gzip sizes at the exact approved ceilings', () => {
    expect(() => validateBundleMeasurements(DEMO_BUNDLE_BUDGET)).not.toThrow()
  })

  it('rejects an initial bundle one byte over the raw ceiling', () => {
    expect(() =>
      validateBundleMeasurements({
        rawBytes: DEMO_BUNDLE_BUDGET.rawBytes + 1,
        gzipBytes: DEMO_BUNDLE_BUDGET.gzipBytes,
      })
    ).toThrow(/raw bytes/)
  })

  it('rejects an initial bundle one byte over the gzip ceiling', () => {
    expect(() =>
      validateBundleMeasurements({
        rawBytes: DEMO_BUNDLE_BUDGET.rawBytes,
        gzipBytes: DEMO_BUNDLE_BUDGET.gzipBytes + 1,
      })
    ).toThrow(/gzip bytes/)
  })
})

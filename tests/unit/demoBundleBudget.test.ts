/**
 * Unit tests for the controlled desktop demo bundle budget.
 * Sources:
 * - scripts/validate-demo-bundle.mjs
 * - src/main.tsx and src/styles/globals.css (CSS dependency order)
 * - dev_docs/PRODUCTION_READINESS.md (Demo Bundle Budget)
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEMO_BUNDLE_BUDGET,
  resolveLocalStylesheetUrls,
  validateBuiltStylesheetSource,
  validateBundleMeasurements,
} from '../../scripts/validate-demo-bundle.mjs'

describe('controlled desktop demo bundle budget', () => {
  it('loads tokens before global declarations without a browser-level CSS import', () => {
    const mainSource = readFileSync(new URL('../../src/main.tsx', import.meta.url), 'utf8')
    const globalsSource = readFileSync(
      new URL('../../src/styles/globals.css', import.meta.url),
      'utf8'
    )

    expect(mainSource.indexOf("import './styles/tokens.css'")).toBeGreaterThanOrEqual(0)
    expect(mainSource.indexOf("import './styles/tokens.css'")).toBeLessThan(
      mainSource.indexOf("import './styles/globals.css'")
    )
    expect(globalsSource).not.toMatch(/@import\b/i)
  })

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

  it('finds local built stylesheets without treating hosted font CSS as an artifact', () => {
    const html = `
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
      <link crossorigin href="/assets/index-abc123.css?release=1" rel="stylesheet">
    `

    expect(resolveLocalStylesheetUrls(html)).toEqual(['/assets/index-abc123.css?release=1'])
  })

  it('rejects browser-delivered imports in a built stylesheet', () => {
    expect(() =>
      validateBuiltStylesheetSource(
        '.root { color: black; } @import url("late.css");',
        '/assets/index.css'
      )
    ).toThrow(/contains an @import rule/)
  })

  it('accepts a built stylesheet whose dependencies were already bundled', () => {
    expect(() =>
      validateBuiltStylesheetSource(':root { --text: #fff; }', '/assets/index.css')
    ).not.toThrow()
  })
})

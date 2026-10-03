import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const DEMO_BUNDLE_BUDGET = Object.freeze({
  rawBytes: 1_300_000,
  gzipBytes: 350_000,
})

export function validateBundleMeasurements(measurements, budget = DEMO_BUNDLE_BUDGET) {
  if (measurements.rawBytes > budget.rawBytes) {
    throw new Error(
      `Initial demo bundle is ${measurements.rawBytes} raw bytes; budget is ${budget.rawBytes} bytes.`
    )
  }
  if (measurements.gzipBytes > budget.gzipBytes) {
    throw new Error(
      `Initial demo bundle is ${measurements.gzipBytes} gzip bytes; budget is ${budget.gzipBytes} bytes.`
    )
  }
}

function resolveInitialScriptPath(html) {
  const scriptMatch = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+\.js)["']/i)
  if (!scriptMatch?.[1]) {
    throw new Error('Unable to identify the initial module script in dist/index.html.')
  }
  return scriptMatch[1]
}

export function resolveLocalStylesheetUrls(html) {
  const stylesheetUrls = []

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const linkTag = match[0]
    const rel = linkTag.match(/\brel=["']([^"']+)["']/i)?.[1] ?? ''
    const href = linkTag.match(/\bhref=["']([^"']+)["']/i)?.[1]

    if (!rel.toLowerCase().split(/\s+/).includes('stylesheet') || !href) continue
    if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith('data:')) continue

    stylesheetUrls.push(href)
  }

  return stylesheetUrls
}

export function validateBuiltStylesheetSource(source, stylesheetUrl) {
  if (/@import\b/i.test(source)) {
    throw new Error(
      `Built stylesheet ${stylesheetUrl} contains an @import rule; CSS dependencies must be bundled before browser delivery.`
    )
  }
}

export async function validateBuiltStylesheets(html, distDirectory) {
  const stylesheetUrls = resolveLocalStylesheetUrls(html)
  if (stylesheetUrls.length === 0) {
    throw new Error('Unable to identify a local stylesheet in dist/index.html.')
  }

  for (const stylesheetUrl of stylesheetUrls) {
    const stylesheetPath = path.resolve(
      distDirectory,
      decodeURIComponent(stylesheetUrl.split(/[?#]/, 1)[0] ?? '').replace(/^\/+/, '')
    )
    const relativeStylesheetPath = path.relative(distDirectory, stylesheetPath)

    if (relativeStylesheetPath.startsWith('..') || path.isAbsolute(relativeStylesheetPath)) {
      throw new Error(`Built stylesheet URL resolves outside dist/: ${stylesheetUrl}`)
    }

    let source
    try {
      source = await readFile(stylesheetPath, 'utf8')
    } catch {
      throw new Error(
        `Built stylesheet referenced by dist/index.html is missing: ${stylesheetUrl}`
      )
    }
    validateBuiltStylesheetSource(source, stylesheetUrl)
  }

  return stylesheetUrls
}

export async function validateBuiltDemoBundle(distDirectory) {
  const indexPath = path.join(distDirectory, 'index.html')
  const html = await readFile(indexPath, 'utf8')
  const initialScriptUrl = resolveInitialScriptPath(html)
  const initialScriptPath = path.join(distDirectory, initialScriptUrl.replace(/^\//, ''))
  const [source, fileStats, stylesheetUrls] = await Promise.all([
    readFile(initialScriptPath),
    stat(initialScriptPath),
    validateBuiltStylesheets(html, distDirectory),
  ])
  const measurements = {
    rawBytes: fileStats.size,
    gzipBytes: gzipSync(source).byteLength,
  }

  validateBundleMeasurements(measurements)
  process.stdout.write(
    `Demo bundle budget passed: ${measurements.rawBytes} raw bytes / ${measurements.gzipBytes} gzip bytes ` +
      `(budgets: ${DEMO_BUNDLE_BUDGET.rawBytes} / ${DEMO_BUNDLE_BUDGET.gzipBytes}); ` +
      `${stylesheetUrls.length} local stylesheet reference${stylesheetUrls.length === 1 ? '' : 's'} verified.\n`
  )
  return measurements
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  validateBuiltDemoBundle(path.join(repositoryRoot, 'dist')).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Demo bundle budget failed: ${message}\n`)
    process.exitCode = 1
  })
}

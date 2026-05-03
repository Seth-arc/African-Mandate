import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const publicRoot = resolve(repoRoot, 'public')

const SCANNED_EXTENSIONS = new Set(['.css', '.html', '.json', '.ts', '.tsx'])

const referencePatterns = [
  /url\(\s*['"]?(\/?(?:assets|img)\/[^'")]+)['"]?\s*\)/g,
  /(?:src|href)=["'](\/?(?:assets|img)\/[^"']+)["']/g,
  /"(\/?(?:assets|img)\/[^"]+)"/g,
  /'(\/?(?:assets|img)\/[^']+)'/g,
  /`(\/?(?:assets|img)\/[^`]+)`/g,
]

function normalizeAssetReference(rawReference) {
  if (rawReference.includes('${')) return null

  const [withoutHash] = rawReference.split('#')
  const [withoutQuery] = (withoutHash ?? '').split('?')
  const normalized = withoutQuery.replace(/^\/+/, '')
  if (!normalized.startsWith('assets/') && !normalized.startsWith('img/')) {
    return null
  }

  try {
    return decodeURIComponent(normalized)
  } catch {
    return normalized
  }
}

function collectReferences(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const references = []

  for (const pattern of referencePatterns) {
    for (const match of source.matchAll(pattern)) {
      const reference = normalizeAssetReference(match[1] ?? '')
      if (reference) {
        references.push(reference)
      }
    }
  }

  return [...new Set(references)]
}

function collectFilesToScan(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath)
  if (!existsSync(absolutePath)) return []

  const stat = statSync(absolutePath)
  if (stat.isFile()) {
    return SCANNED_EXTENSIONS.has(extname(absolutePath)) ? [relativePath] : []
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) =>
    collectFilesToScan(`${relativePath}/${entry.name}`)
  )
}

const filesToScan = ['index.html', ...collectFilesToScan('src')]

const missing = []
const empty = []
const checked = new Set()

for (const relativeFilePath of filesToScan) {
  const filePath = resolve(repoRoot, relativeFilePath)
  if (!existsSync(filePath)) {
    missing.push(`${relativeFilePath} (scan target missing)`)
    continue
  }

  for (const assetReference of collectReferences(filePath)) {
    const assetPath = resolve(publicRoot, assetReference)
    const relativeAssetPath = relative(publicRoot, assetPath)
    const label = `${relativeFilePath} -> /${assetReference}`

    if (relativeAssetPath.startsWith('..') || isAbsolute(relativeAssetPath)) {
      missing.push(`${label} (resolved outside public/)`)
      continue
    }

    if (!existsSync(assetPath)) {
      missing.push(label)
      continue
    }

    if (extname(assetPath) !== '.html' && statSync(assetPath).size === 0) {
      empty.push(label)
      continue
    }

    checked.add(assetReference)
  }
}

if (missing.length > 0 || empty.length > 0) {
  if (missing.length > 0) {
    console.error('Missing static asset references:')
    for (const item of missing) console.error(`- ${item}`)
  }
  if (empty.length > 0) {
    console.error('Empty static asset files:')
    for (const item of empty) console.error(`- ${item}`)
  }
  process.exit(1)
}

console.log(`Validated ${checked.size} static asset reference${checked.size === 1 ? '' : 's'}.`)

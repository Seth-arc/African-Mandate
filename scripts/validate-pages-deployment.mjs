import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REQUIRED_WORKFLOW_PATTERNS = Object.freeze([
  ['Pages write permission', /^\s*pages:\s*write\s*$/m],
  ['OIDC token permission', /^\s*id-token:\s*write\s*$/m],
  ['production build', /^\s*(?:-\s*)?run:\s*npm run (?:build|verify:demo)\s*$/m],
  ['Pages configuration action', /actions\/configure-pages@/],
  ['Pages artifact upload action', /actions\/upload-pages-artifact@/],
  ['dist artifact path', /^\s*path:\s*\.\/dist\s*$/m],
  ['Pages deployment action', /actions\/deploy-pages@/],
])

export function validatePagesDeploymentContract({ viteConfig, workflow }) {
  const failures = []

  if (!/^\s*base:\s*['"]\/['"],?\s*$/m.test(viteConfig)) {
    failures.push("vite.config.ts must set base: '/' for the africanmandate.org custom domain")
  }

  for (const [label, pattern] of REQUIRED_WORKFLOW_PATTERNS) {
    if (!pattern.test(workflow)) {
      failures.push(`Pages workflow is missing ${label}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'))
  }
}

export async function validatePagesDeploymentFiles(repositoryRoot) {
  const [viteConfig, workflow] = await Promise.all([
    readFile(path.join(repositoryRoot, 'vite.config.ts'), 'utf8'),
    readFile(path.join(repositoryRoot, '.github', 'workflows', 'pages.yml'), 'utf8'),
  ])

  validatePagesDeploymentContract({ viteConfig, workflow })
  process.stdout.write('GitHub Pages deployment contract passed.\n')
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  validatePagesDeploymentFiles(repositoryRoot).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`GitHub Pages deployment contract failed:\n${message}\n`)
    process.exitCode = 1
  })
}

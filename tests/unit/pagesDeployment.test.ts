import { describe, expect, it } from 'vitest'
import { validatePagesDeploymentContract } from '../../scripts/validate-pages-deployment.mjs'

const validViteConfig = `
export default defineConfig({
  base: '/African-Mandate/',
})
`

const validWorkflow = `
permissions:
  pages: write
  id-token: write
steps:
  - run: npm run verify:demo
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v4
    with:
      path: ./dist
  - uses: actions/deploy-pages@v4
`

describe('GitHub Pages deployment contract', () => {
  it('accepts the project-site Vite base and dist deployment workflow', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig,
        workflow: validWorkflow,
      })
    ).not.toThrow()
  })

  it('rejects a root base while the project site is the release target', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig.replace("base: '/African-Mandate/'", "base: '/'"),
        workflow: validWorkflow,
      })
    ).toThrow(/African-Mandate/)
  })

  it('rejects a workflow that publishes the repository instead of dist', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig,
        workflow: validWorkflow.replace('path: ./dist', 'path: .'),
      })
    ).toThrow(/dist artifact path/)
  })

  it('rejects a workflow that deploys without a production-building gate', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig,
        workflow: validWorkflow.replace('npm run verify:demo', 'npm run test:e2e'),
      })
    ).toThrow(/production build/)
  })
})

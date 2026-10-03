import { describe, expect, it } from 'vitest'
import { validatePagesDeploymentContract } from '../../scripts/validate-pages-deployment.mjs'

const validViteConfig = `
export default defineConfig({
  base: '/',
})
`

const validWorkflow = `
permissions:
  pages: write
  id-token: write
steps:
  - run: npm run build
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v4
    with:
      path: ./dist
  - uses: actions/deploy-pages@v4
`

describe('GitHub Pages deployment contract', () => {
  it('accepts the custom-domain Vite base and dist deployment workflow', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig,
        workflow: validWorkflow,
      })
    ).not.toThrow()
  })

  it('rejects a project-site base while the custom domain is the release target', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig.replace("base: '/'", "base: '/African-Mandate/'"),
        workflow: validWorkflow,
      })
    ).toThrow(/base: '\/'/)
  })

  it('rejects a workflow that publishes the repository instead of dist', () => {
    expect(() =>
      validatePagesDeploymentContract({
        viteConfig: validViteConfig,
        workflow: validWorkflow.replace('path: ./dist', 'path: .'),
      })
    ).toThrow(/dist artifact path/)
  })
})

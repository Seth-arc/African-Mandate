import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import actorsJson from '../../src/data/actors.json'
import cutscenesJson from '../../src/data/cutscenes.json'

const testDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(testDir, '..', '..')
const publicRoot = resolve(repoRoot, 'public')

function publicAssetPath(assetPath: string): string {
  const normalized = assetPath.replace(/^\/+/, '')
  return resolve(publicRoot, decodeURIComponent(normalized))
}

describe('content asset references', () => {
  it('points every actor portrait_url at a shipped public asset', () => {
    for (const actor of actorsJson.actors) {
      expect(
        existsSync(publicAssetPath(actor.portrait_url)),
        `${actor.actor_key} portrait missing: ${actor.portrait_url}`
      ).toBe(true)
    }
  })

  it('points every cutscene media and fallback image at shipped public assets', () => {
    for (const cutscene of cutscenesJson.cutscenes) {
      expect(
        existsSync(publicAssetPath(cutscene.media_url)),
        `${cutscene.cutscene_id} media missing: ${cutscene.media_url}`
      ).toBe(true)
      expect(
        existsSync(publicAssetPath(cutscene.fallback_image_url)),
        `${cutscene.cutscene_id} fallback missing: ${cutscene.fallback_image_url}`
      ).toBe(true)
    }
  })
})

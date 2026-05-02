import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameError } from '../../src/state/types'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const profileUpsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        upsert: profileUpsert,
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  const client = {
    auth: {
      getUser,
    },
    from,
  }
  return {
    client,
    from,
    getUser,
    profileUpsert,
  }
})

vi.mock('../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => mocks.client,
  requireSupabaseClient: () => mocks.client,
  isSupabaseConfigured: () => true,
}))

describe('authService', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getUser.mockReset()
    mocks.profileUpsert.mockReset()
    mocks.from.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('syncs the current profile when resolving current identity', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'participant@example.com',
          user_metadata: {
            full_name: 'Envoy Diallo',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      },
      error: null,
    })
    mocks.profileUpsert.mockResolvedValue({ error: null })

    const { getCurrentIdentity } = await import('../../src/services/authService')
    const identity = await getCurrentIdentity()

    expect(identity).toEqual({
      auth_mode: 'authenticated',
      user_id: 'user-123',
      email: 'participant@example.com',
      display_name: 'Envoy Diallo',
    })
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.profileUpsert).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'participant@example.com',
      display_name: 'Envoy Diallo',
      avatar_url: 'https://example.com/avatar.png',
    }, { onConflict: 'id' })
  })

  it('rejects profile sync when the authenticated user does not match the expected user id', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'participant@example.com',
          user_metadata: {},
        },
      },
      error: null,
    })

    const { ensureCurrentProfileRecord } = await import('../../src/services/authService')

    await expect(ensureCurrentProfileRecord('other-user')).rejects.toMatchObject({
      code: 'AUTH_USER_MISMATCH',
    } satisfies Partial<GameError>)
    expect(mocks.profileUpsert).not.toHaveBeenCalled()
  })
})

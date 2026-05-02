import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js'
import { GameError } from '../state/types'
import {
  getSupabaseClient,
  isSupabaseConfigured,
  requireSupabaseClient,
  type Database,
} from './supabaseClient'

export type AuthMode = 'guest' | 'authenticated'

export interface AuthIdentity {
  auth_mode: AuthMode
  user_id: string | null
  email: string | null
  display_name: string | null
}

function guestIdentity(): AuthIdentity {
  return {
    auth_mode: 'guest',
    user_id: null,
    email: null,
    display_name: null,
  }
}

function getDisplayName(user: User): string | null {
  const metadata = user.user_metadata
  if (typeof metadata !== 'object' || metadata === null) return null

  const fullName = metadata['full_name']
  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName
  }

  const name = metadata['name']
  if (typeof name === 'string' && name.trim().length > 0) {
    return name
  }

  return null
}

function getAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata
  if (typeof metadata !== 'object' || metadata === null) return null

  const avatarUrl = metadata['avatar_url']
  if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    return avatarUrl
  }

  const picture = metadata['picture']
  if (typeof picture === 'string' && picture.trim().length > 0) {
    return picture
  }

  return null
}

function toIdentity(user: User | null): AuthIdentity {
  if (!user) return guestIdentity()
  return {
    auth_mode: 'authenticated',
    user_id: user.id,
    email: user.email ?? null,
    display_name: getDisplayName(user),
  }
}

async function getCurrentUser(client: SupabaseClient<Database>): Promise<User | null> {
  const { data, error } = await client.auth.getUser()
  if (error) {
    const lower = error.message.toLowerCase()
    if (lower.includes('session')) {
      return null
    }
    throw new GameError(`Auth lookup failed: ${error.message}`, 'AUTH_LOOKUP_FAILED')
  }
  return data.user
}

async function syncProfileRecord(client: SupabaseClient<Database>, user: User): Promise<void> {
  const profile = {
    id: user.id,
    email: user.email ?? null,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user),
  } satisfies Database['public']['Tables']['profiles']['Insert']

  const { error } = await client.from('profiles').upsert(profile, { onConflict: 'id' })
  if (error) {
    throw new GameError(`Auth profile sync failed: ${error.message}`, 'AUTH_PROFILE_SYNC_FAILED')
  }
}

export async function ensureCurrentProfileRecord(expectedUserId?: string): Promise<AuthIdentity> {
  const client = requireSupabaseClient()
  const user = await getCurrentUser(client)
  if (!user) {
    throw new GameError('Authentication is required for cloud session access.', 'AUTH_REQUIRED')
  }
  if (expectedUserId && user.id !== expectedUserId) {
    throw new GameError('Authenticated user mismatch during profile sync.', 'AUTH_USER_MISMATCH')
  }
  await syncProfileRecord(client, user)
  return toIdentity(user)
}

export async function getCurrentIdentity(): Promise<AuthIdentity> {
  const client = getSupabaseClient()
  if (!client) {
    return guestIdentity()
  }

  const user = await getCurrentUser(client)
  if (!user) {
    return guestIdentity()
  }
  await syncProfileRecord(client, user)
  return toIdentity(user)
}

export async function signInWithGoogle(): Promise<void> {
  const client = requireSupabaseClient()
  if (typeof window === 'undefined') {
    throw new GameError('Google sign-in is only available in the browser.', 'AUTH_BROWSER_ONLY')
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) {
    throw new GameError(`Google sign-in failed: ${error.message}`, 'AUTH_SIGN_IN_FAILED')
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return
  const { error } = await client.auth.signOut()
  if (error) {
    throw new GameError(`Sign-out failed: ${error.message}`, 'AUTH_SIGN_OUT_FAILED')
  }
}

export function subscribeAuthChanges(
  listener: (identity: AuthIdentity, event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => undefined
  }
  const client = requireSupabaseClient()
  const { data } = client.auth.onAuthStateChange((event, session) => {
    listener(toIdentity(session?.user ?? null), event, session)
  })
  return () => {
    data.subscription.unsubscribe()
  }
}

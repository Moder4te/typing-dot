import { supabase } from './supabase'
import type { Tier } from './entitlements'

// Tier changes go through the `set-tier` Edge Function (service role), NOT a
// direct profiles.update — the tier column is locked from client writes
// (migration 0005) so users can't grant themselves Pro. The function is still a
// MOCK (no real payment yet); that's where Stripe verification will live.
export async function setTierMock(tier: Tier): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'set-tier', { body: { tier } },
  )
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

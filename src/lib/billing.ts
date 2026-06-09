import { supabase } from './supabase'
import type { Tier } from './entitlements'

// MOCK billing. Sets the user's tier directly (no real payment).
// Replace with a Stripe Checkout + webhook (Edge Function) for production:
// the webhook would update profiles.tier / subscriptions using the service role.
export async function setTierMock(tier: Tier): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('로그인이 필요합니다')
  const { error } = await supabase.from('profiles').update({ tier }).eq('id', u.user.id)
  if (error) throw error
}

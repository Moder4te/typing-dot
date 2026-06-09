// Tier limits. Mirrored server-side in supabase/functions/analyze-emotion.
// Keep both in sync.
export const FREE_AI_DAILY = 20

export type Tier = 'free' | 'pro'

export interface Entitlements {
  aiDailyLimit: number | null   // null = unlimited
  unlimitedHistory: boolean
  premiumFonts: boolean
  exportEnabled: boolean
}

export function entitlementsFor(tier: Tier): Entitlements {
  if (tier === 'pro') {
    return { aiDailyLimit: null, unlimitedHistory: true, premiumFonts: true, exportEnabled: true }
  }
  return { aiDailyLimit: FREE_AI_DAILY, unlimitedHistory: false, premiumFonts: false, exportEnabled: false }
}

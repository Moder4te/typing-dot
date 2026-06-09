import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = (): boolean => url.length > 0 && anon.length > 0

// Guarded: when env is missing (e.g. fresh clone before Supabase setup),
// export null instead of throwing at import time. Consumers null-check via
// isSupabaseConfigured() / useAuth().configured.
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

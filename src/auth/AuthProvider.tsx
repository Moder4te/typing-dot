import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  tier: 'free' | 'pro'
  onboarded: boolean
}

interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const fetchProfile = async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, tier, onboarded')
      .eq('id', userId)
      .single()
    setProfile((data as Profile) ?? null)
  }

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id)
  }

  useEffect(() => {
    if (!supabase) return  // loading already false when unconfigured

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) fetchProfile(data.session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) fetchProfile(next.user.id)
      else setProfile(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const value: AuthContextValue = {
    configured: isSupabaseConfigured(),
    loading,
    session,
    user: session?.user ?? null,
    profile,
    refreshProfile,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

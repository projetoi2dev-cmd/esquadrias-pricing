import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { queryClient } from './queryClient'
import type { Profile } from './database.types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setProfile({
        id: user.id,
        full_name: String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''),
        email: user.email ?? '',
        created_at: user.created_at,
        updated_at: user.updated_at ?? user.created_at,
      })
      return
    }

    setProfile(
      (data as Profile | null) ?? {
        id: user.id,
        full_name: String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? ''),
        email: user.email ?? '',
        created_at: user.created_at,
        updated_at: user.updated_at ?? user.created_at,
      },
    )
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session?.user) void loadProfile(session.user)
    else setProfile(null)
  }, [loadProfile, session?.user])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    queryClient.clear()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user)
  }, [loadProfile, session?.user])

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, profile, loading, signIn, signOut, refreshProfile }),
    [loading, profile, refreshProfile, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return value
}

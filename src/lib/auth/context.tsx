import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Tables, Enums } from '@/lib/database.types'

type AuthContextValue = {
  session: Session | null
  profile: Tables<'profiles'> | null
  loading: boolean
  viewAs: Enums<'user_role'> | null
  setViewAs: (role: Enums<'user_role'> | null) => void
  effectiveRole: Enums<'user_role'> | null
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredViewAs(): Enums<'user_role'> | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem('continuum.viewAs') as Enums<'user_role'>) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewAs, setViewAsState] = useState<Enums<'user_role'> | null>(getStoredViewAs)

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    try {
      // Intentionally synchronous callback — supabase-js v2 awaits async onAuthStateChange
      // listeners before resolving signInWithPassword, which causes a 12 s timeout if the
      // profiles DB query is slow. Fire-and-forget fetchProfile; loading stays true until it
      // resolves, so router guards keep showing the spinner rather than redirecting to /login.
      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession)
        if (newSession?.user) {
          // Clear stale viewAs from a previous session so a fresh login always
          // routes to the signed-in user's own home, not a carried-over persona.
          if (event === 'SIGNED_IN') {
            // Keep guards on the spinner until the profile resolves, so a fresh
            // login routes to the role home instead of bouncing back to /login.
            setLoading(true)
            setViewAsState(null)
            if (typeof window !== 'undefined') localStorage.removeItem('continuum.viewAs')
          }
          void fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
          setViewAsState(null)
          if (typeof window !== 'undefined') localStorage.removeItem('continuum.viewAs')
          setLoading(false)
        }
      })
      subscription = data.subscription
    } catch (err) {
      console.error('[Auth] onAuthStateChange setup failed:', err)
      setLoading(false)
    }
    return () => subscription?.unsubscribe()
  }, [])

  const setViewAs = (role: Enums<'user_role'> | null) => {
    setViewAsState(role)
    if (typeof window !== 'undefined') {
      if (role) localStorage.setItem('continuum.viewAs', role)
      else localStorage.removeItem('continuum.viewAs')
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    } catch (err) {
      return {
        error: {
          message: err instanceof Error ? err.message : 'Unexpected sign-in error.',
        } as AuthError,
      }
    }
  }

  const signOut = async () => {
    setViewAs(null)
    await supabase.auth.signOut()
  }

  const effectiveRole = viewAs ?? profile?.role ?? null

  return (
    <AuthContext.Provider value={{ session, profile, loading, viewAs, setViewAs, effectiveRole, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

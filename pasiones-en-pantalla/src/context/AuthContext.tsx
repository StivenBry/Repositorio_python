import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend } from '../services'
import type { AdminSession } from '../types'

interface AuthState {
  session: AdminSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    backend
      .getSession()
      .then((s) => active && setSession(s))
      .catch(() => active && setSession(null))
      .finally(() => active && setLoading(false))
    const unsubscribe = backend.onAuthChange((s) => active && setSession(s))
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await backend.signIn(email, password))
  }, [])

  const signOut = useCallback(async () => {
    await backend.signOut()
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

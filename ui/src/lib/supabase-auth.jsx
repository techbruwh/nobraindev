import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { authService } from './auth'

const SupabaseAuthContext = createContext({})

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      authService.setUser(session?.user ?? null, session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      authService.setUser(session?.user ?? null, session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    session,
    loading,
    signInWithGoogle: authService.signInWithGoogle.bind(authService),
    signInWithOTP: authService.signInWithOTP.bind(authService),
    verifyOTP: authService.verifyOTP.bind(authService),
    signOut: authService.signOut.bind(authService),
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider')
  }
  return context
}

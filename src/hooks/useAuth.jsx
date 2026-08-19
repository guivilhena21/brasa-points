// React imports for creating context and using hooks.
import { createContext, useContext, useEffect, useState } from 'react'
// Import the initialized Supabase client used for authentication and database queries.
import { supabase } from '../lib/supabase'

// Create a React context to hold auth state and actions.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const devBypass = import.meta.env.DEV && localStorage.getItem('dev-bypass') === 'true'

  // Track the current signed-in user.
  // undefined means we are still loading auth state;
  // null means no user is signed in.
  const [user, setUser] = useState(undefined)
  // Store the user's profile data loaded from the profiles table.
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (devBypass) {
      let cancelled = false

      async function bootstrapDevBypass() {
        try {
          // Use a real authenticated user in dev so RLS-protected writes work.
          const { data: sessionData } = await supabase.auth.getSession()
          let activeUser = sessionData.session?.user ?? null

          if (!activeUser) {
            const { data, error } = await supabase.auth.signInAnonymously()
            if (error) {
              setUser(null)
              setProfile(null)
              return
            }
            activeUser = data.user
          }

          if (!activeUser || cancelled) return

          setUser(activeUser)

          // Ensure a profile exists for the dev user and elevate admin in dev mode.
          await supabase
            .from('profiles')
            .upsert(
              {
                id: activeUser.id,
                name: 'Dev User',
                role: 'Member',
                total_points: 500,
                events_attended: 3,
                is_admin: true,
              },
              { onConflict: 'id' }
            )

          await supabase.from('profiles').update({ is_admin: true }).eq('id', activeUser.id)
          await fetchProfile(activeUser.id)
        } catch {
          setUser(null)
          setProfile(null)
        }
      }

      bootstrapDevBypass()
      return () => {
        cancelled = true
      }
    }

    // On mount, check whether there is an active auth session.
    supabase.auth.getSession().then(({ data }) => {
      // If a session exists, set user to the authenticated user object.
      // Otherwise, set user to null.
      setUser(data.session?.user ?? null)
      if (data.session?.user) fetchProfile(data.session.user.id)
    })

    // Subscribe to auth state changes, e.g. sign in / sign out events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Update the user state whenever auth state changes.
      setUser(session?.user ?? null)

      if (session?.user) {
        // If user is signed in, fetch profile data for that user.
        fetchProfile(session.user.id)
      } else {
        // If user signed out, clear the profile.
        setProfile(null)
      }
    })

    // Cleanup subscription when the provider unmounts.
    return () => subscription.unsubscribe()
  }, [devBypass])

  // Load profile data for the given user ID from the profiles table.
  async function fetchProfile(uid) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()

    // Save the profile object in state.
    setProfile(data)
  }

  // Refresh the currently signed-in user's profile data.
  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  // Sign up a new user with email and password, and attach a name field.
  async function signUp(email, password, name) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      return { data, error }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Unable to create your account. Check your internet connection or Supabase settings.',
        },
      }
    }
  }

  // Sign in an existing user using email and password.
  async function signIn(email, password) {
    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Unable to sign in. Check your internet connection or Supabase settings.',
        },
      }
    }
  }

  // Sign out the current user.
  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    // Provide auth state and actions to all child components.
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for consuming auth context in components.
export function useAuth() {
  return useContext(AuthContext)
}

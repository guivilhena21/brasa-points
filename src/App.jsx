// App is the root component that decides whether to show the auth screen
// or the main application shell depending on the authentication state.
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import AppShell from './pages/AppShell'

export default function App() {
  // Get the current authenticated user from the auth hook.
  const { user } = useAuth()

  // While Supabase is checking the user session, user is undefined.
  // Show a loading screen during this state.
  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0F2D5E 0%, #1a4a8a 100%)',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <img src="/logo.png" alt="BRASA UCF" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5 }}>BRASA UCF</div>
        </div>
      </div>
    )
  }

  // If there is no authenticated user, show the login/signup page.
  if (!user) return <AuthPage />

  // Otherwise, show the main app shell for signed-in users.
  return <AppShell />
}

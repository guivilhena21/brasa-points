// App is the root component that decides whether to show the auth screen
// or the main application shell depending on the authentication state.
import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import AppShell from './pages/AppShell'
import CheckinPage from './pages/CheckinPage'
import { getQRTokenFromCurrentUrl } from './lib/qr'

function isCheckinPath() {
  if (typeof window === 'undefined') return false

  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  const currentPath = window.location.pathname.replace(/\/+$/, '')
  const relativePath = normalizedBase && normalizedBase !== '/'
    ? currentPath.startsWith(normalizedBase)
      ? currentPath.slice(normalizedBase.length) || '/'
      : currentPath
    : currentPath

  return relativePath === '/checkin'
}

export default function App() {
  // Get the current authenticated user from the auth hook.
  const { user } = useAuth()
  const checkinPath = isCheckinPath()
  const qrToken = checkinPath ? getQRTokenFromCurrentUrl() : ''

  // TEMPORARY DEV BYPASS: if enabled in localStorage, skip the login screen while developing.
  // This is only for local development and should be removed before production release.
  const devBypass = import.meta.env.DEV && localStorage.getItem('dev-bypass') === 'true'

  // While Supabase is checking the user session, user is undefined.
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

  if (checkinPath) {
    if (!user) return <AuthPage heading="Sign In To Complete Check-In" />
    return <CheckinPage token={qrToken} />
  }

  // The dev bypass still requires a real Supabase session for database writes.
  if (!user) return <AuthPage />

  // Otherwise, show the main app shell for signed-in users.
  return <AppShell />
}

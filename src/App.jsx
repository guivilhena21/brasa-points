import { useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import AppShell from './pages/AppShell'

export default function App() {
  const { user } = useAuth()

  // undefined = still loading session
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

  if (!user) return <AuthPage />

  return <AppShell />
}

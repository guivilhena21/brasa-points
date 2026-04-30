import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]     = useState('login') // 'login' | 'signup'
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoad]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoad(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password)
        if (err) setError(err.message)
      } else {
        if (!name.trim()) { setError('Please enter your name.'); setLoad(false); return }
        const { error: err } = await signUp(email, password, name.trim())
        if (err) setError(err.message)
        else setError('Check your email to confirm your account!')
      }
    } finally {
      setLoad(false)
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <img src="/logo.png" alt="BRASA UCF" style={{ width: 72, height: 72, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={styles.logoText}>BRASA UCF</span>
        </div>

        <h2 style={styles.title}>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPass(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <p style={{ ...styles.msg, color: error.includes('Check your email') ? '#16a34a' : '#dc2626' }}>
              {error}
            </p>
          )}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            style={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  bg: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0F2D5E 0%, #1a4a8a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: "'Poppins', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  logoText: { fontSize: '22px', fontWeight: '800', color: '#0F2D5E' },
  title: { fontSize: '20px', fontWeight: '700', color: '#111', marginBottom: '20px', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#555' },
  input: {
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '15px',
    fontFamily: "'Poppins', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  msg: { fontSize: '13px', fontWeight: '500', margin: '0' },
  btn: {
    background: '#0F2D5E',
    color: '#F5C800',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '700',
    fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer',
    marginTop: '4px',
  },
  switchText: { textAlign: 'center', fontSize: '13px', color: '#888', marginTop: '20px', marginBottom: 0 },
  switchBtn: {
    background: 'none', border: 'none', color: '#0F2D5E',
    fontWeight: '700', fontSize: '13px', cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif",
  },
}

// Import useState for local component state.
import { useState } from 'react'
// Import auth helpers from the custom auth hook.
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  // Get sign-in and sign-up functions from auth context.
  const { signIn, signUp } = useAuth()

  // mode keeps track of whether the form is in login or signup state.
  const [mode, setMode]     = useState('login') // 'login' | 'signup'

  // Controlled form fields for the user's name, email, and password.
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')

  // Error message to show feedback from auth calls.
  const [error, setError]   = useState('')
  // Loading state used to disable the button while submitting.
  const [loading, setLoad]  = useState(false)

  // Handle the form submission for login or signup.
  async function handleSubmit(e) {
    // Prevent the browser from refreshing the page.
    e.preventDefault()
    // Reset error before attempting auth.
    setError('')
    // Show loading state while waiting for the request.
    setLoad(true)
    try {
      if (mode === 'login') {
        // Attempt to sign in with email and password.
        const { error: err } = await signIn(email, password)
        if (err) setError(err.message)
      } else {
        // Signup flow requires a name.
        if (!name.trim()) {
          setError('Please enter your name.')
          setLoad(false)
          return
        }

        // Attempt to sign up and pass the name in user metadata.
        const { error: err } = await signUp(email, password, name.trim())
        if (err) setError(err.message)
        else setError('Check your email to confirm your account!')
      }
    } catch (err) {
      setError(err?.message || 'Unable to connect to the authentication service.')
    } finally {
      // Stop loading state after request finishes.
      setLoad(false)
    }
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        {/* App logo at the top of the auth card. */}
        <div style={styles.logo}>
          <img src="/logo.png" alt="BRASA UCF" style={{ width: 72, height: 72, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={styles.logoText}>BRASA UCF</span>
        </div>

        {/* Title changes based on current auth mode. */}
        <h2 style={styles.title}>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Show the full name field only in signup mode. */}
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

          {/* Email input field. */}
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

          {/* Password input field. */}
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

          {/* Show error or success messages when present. */}
          {error && (
            <p style={{ ...styles.msg, color: error.includes('Check your email') ? '#16a34a' : '#dc2626' }}>
              {error}
            </p>
          )}

          {/* Submit button changes text while loading and depending on mode. */}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Link to switch between login and signup modes. */}
        <p style={styles.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            style={styles.switchBtn}
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('') // Clear any existing error when switching modes.
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}

// Inline style definitions used by the auth page.
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

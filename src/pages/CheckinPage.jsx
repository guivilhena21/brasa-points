import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function getBasePath() {
  return import.meta.env.BASE_URL || '/'
}

function mapCheckinError(message) {
  const text = (message || '').toLowerCase()
  if (text.includes('expired')) return 'This QR code has expired. Ask an organizer for a new one.'
  if (text.includes('already')) return 'You already checked in to this event.'
  if (text.includes('event not found')) return 'Event not found for this QR code.'
  if (text.includes('not found') || text.includes('invalid')) return 'Invalid QR code. Please scan a valid event QR.'
  return message || 'Could not complete check-in. Please try again.'
}

export default function CheckinPage({ token }) {
  const { user, refreshProfile } = useAuth()
  const [status, setStatus] = useState('processing')
  const [result, setResult] = useState({ eventName: '', points: 0, message: '' })
  const handledTokenRef = useRef('')

  const normalizedToken = useMemo(() => (typeof token === 'string' ? token.trim() : ''), [token])

  useEffect(() => {
    if (!user) return

    if (!normalizedToken) {
      setStatus('error')
      setResult({ eventName: '', points: 0, message: 'Missing QR token. Please scan the QR code again.' })
      return
    }

    if (handledTokenRef.current === normalizedToken) return
    handledTokenRef.current = normalizedToken

    async function runCheckin() {
      setStatus('processing')

      const { data, error } = await supabase.rpc('process_qr_checkin', {
        p_user_id: user.id,
        p_qr_token: normalizedToken,
      })

      if (error) {
        setStatus('error')
        setResult({ eventName: '', points: 0, message: mapCheckinError(error.message) })
        return
      }

      if (!data?.success) {
        setStatus('error')
        setResult({
          eventName: data?.event_name || '',
          points: 0,
          message: mapCheckinError(data?.error),
        })
        return
      }

      await refreshProfile()
      setStatus('success')
      setResult({
        eventName: data.event_name || 'Event',
        points: Number(data.points_earned || 0),
        message: 'Check-in complete. Your points were added successfully.',
      })
    }

    runCheckin()
  }, [user, normalizedToken, refreshProfile])

  function goToApp() {
    window.location.assign(getBasePath())
  }

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src="/logo.png" alt="BRASA UCF" style={styles.logo} />
          <div style={styles.brand}>BRASA UCF</div>
        </div>

        {status === 'processing' && (
          <>
            <h1 style={styles.title}>Processing QR Check-in</h1>
            <p style={styles.text}>Validating your attendance and awarding points.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={styles.title}>You Are Checked In</h1>
            <div style={styles.points}>+{result.points} pts</div>
            <p style={styles.text}>{result.eventName}</p>
            <p style={styles.okText}>{result.message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={styles.title}>Check-in Failed</h1>
            <p style={styles.errorText}>{result.message}</p>
          </>
        )}

        <button type="button" onClick={goToApp} style={styles.button}>
          Open BRASA Points
        </button>
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
    width: '100%',
    maxWidth: 460,
    background: '#fff',
    borderRadius: 24,
    padding: '28px 24px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  logoWrap: {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 64,
    height: 64,
    objectFit: 'contain',
  },
  brand: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0F2D5E',
  },
  title: {
    margin: '8px 0 10px',
    fontSize: 24,
    color: '#111',
    fontWeight: 800,
  },
  points: {
    fontSize: 46,
    color: '#0F2D5E',
    fontWeight: 900,
    lineHeight: 1,
    margin: '2px 0 10px',
  },
  text: {
    color: '#4b5563',
    margin: '4px 0',
    fontSize: 14,
  },
  okText: {
    color: '#15803d',
    margin: '6px 0 0',
    fontSize: 14,
    fontWeight: 600,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    margin: '0 0 6px',
    fontWeight: 600,
  },
  button: {
    marginTop: 18,
    width: '100%',
    border: 'none',
    borderRadius: 12,
    padding: '12px 14px',
    background: '#0F2D5E',
    color: '#F5C800',
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer',
  },
}
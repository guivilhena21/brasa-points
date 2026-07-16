import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// CheckinSheet is a modal that appears when the user opens an event.
// It lets the user enter a code to confirm attendance and earn points.
function CheckinSheet({ event, checkedIn, onClose, onSuccess }) {
  const { user, refreshProfile } = useAuth()
  const [code, setCode]     = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [msg, setMsg]       = useState('')
  const [ptsEarned, setPts] = useState(0)

  // Submit the event check-in code to the Supabase RPC function.
  async function submit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setStatus('loading')

    const { data, error } = await supabase.rpc('process_checkin', {
      p_user_id:  user.id,
      p_event_id: event.id,
      p_code:     code.trim().toUpperCase(),
    })

    if (error) {
      setStatus('error')
      setMsg(error.message)
      return
    }

    if (!data.success) {
      setStatus('error')
      setMsg(data.error)
      return
    }

    // If successful, show the earned points and refresh the user's profile.
    setPts(data.points_earned)
    setStatus('success')
    await refreshProfile()

    // Wait a short time so the success message is visible before closing.
    setTimeout(() => {
      onSuccess({ ...event, points_earned: data.points_earned })
      onClose()
    }, 1400)
  }

  // If the user already checked in, show a simple confirmation modal.
  if (checkedIn) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="success-check">✅</div>
          <div className="modal-pts-big" style={{ color: '#16a34a' }}>Already checked in!</div>
          <div className="modal-pts-label">You already registered attendance for this event.</div>
          <button className="modal-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  // Otherwise show the check-in form or success state.
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        {status === 'success' ? (
          <>
            <div className="success-check">✅</div>
            <div className="modal-pts-big">+{ptsEarned}</div>
            <div className="modal-pts-label">Points added to your account!</div>
          </>
        ) : (
          <>
            <div className="modal-event-name">{event.name}</div>
            <div className="modal-meta">
              {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'long' })}
              {event.time ? ` · ${event.time}` : ''}
              {event.location ? ` · ${event.location}` : ''}
            </div>
            <div className="modal-pts-big">+{event.points}</div>
            <div className="modal-pts-label">points for attending</div>

            <form onSubmit={submit} style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 10, textAlign: 'center' }}>
                Enter the 6-letter code provided by the event organizer
              </p>
              <input
                style={{
                  width: '100%', border: '2px solid #e5e7eb', borderRadius: 12,
                  padding: '14px', fontSize: 22, fontWeight: 700, textAlign: 'center',
                  letterSpacing: 6, fontFamily: "'Poppins', sans-serif", outline: 'none',
                  textTransform: 'uppercase', marginBottom: 12,
                  color: '#0F2D5E',
                }}
                maxLength={6}
                placeholder="XXXXXX"
                value={code}
                onChange={e => { setCode(e.target.value); setStatus('idle'); setMsg('') }}
                autoFocus
              />
              {status === 'error' && (
                <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                  {msg}
                </p>
              )}
              <button
                className="modal-btn"
                type="submit"
                disabled={status === 'loading' || code.length < 1}
              >
                {status === 'loading' ? 'Verifying...' : 'Confirm Check-in'}
              </button>
            </form>
            <button className="modal-cancel" onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

// Main Events screen shows upcoming events and handles check-in selection.
export default function EventsScreen({ onToast }) {
  const { user } = useAuth()
  const [events, setEvents]       = useState([])
  const [checkedIn, setCheckedIn] = useState(new Set())
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)

  // Load all events and current user's check-ins.
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: evData }, { data: myCheckins }] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: true }),
      supabase.from('checkins').select('event_id').eq('user_id', user.id),
    ])
    setEvents(evData ?? [])
    setCheckedIn(new Set((myCheckins ?? []).map(c => c.event_id)))
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  // Handle successful check-in by marking the event checked in and showing a toast.
  function handleSuccess(data) {
    setCheckedIn(prev => new Set([...prev, data.id]))
    onToast(data)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => e.date >= today)
  const past     = events.filter(e => e.date <  today)

  function EventCard({ ev, featured }) {
    const d     = new Date(ev.date + 'T12:00:00')
    const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
    const day   = d.getDate()
    const done  = checkedIn.has(ev.id)

    if (featured) {
      return (
        <div className="event-full-card featured" onClick={() => setSelected(ev)}>
          <div className="efc-top">
            <div className="efc-top-label">⚡ Next Up</div>
            <div className="efc-top-name">{ev.name}</div>
            <div className="efc-top-meta">{month} {day} · {ev.location}{ev.time ? ` · ${ev.time}` : ''}</div>
          </div>
          <div className="efc-bottom">
            <div>
              <div className="efc-pts">+{ev.points} pts</div>
              <div className="efc-pts-label">for attending</div>
            </div>
            <button className={`efc-checkin-btn ${done ? 'done' : ''}`} onClick={e => { e.stopPropagation(); setSelected(ev) }}>
              {done ? '✓ Checked In' : 'Check In'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="event-full-card" onClick={() => setSelected(ev)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
          <div className="esi-date">
            <div className="esi-month">{month}</div>
            <div className="esi-day">{day}</div>
          </div>
          <div className="esi-info">
            <div className="esi-name">{ev.name}</div>
            <div className="esi-sub">{ev.location}{ev.time ? ` · ${ev.time}` : ''}</div>
          </div>
          <div className="esi-pts">{done ? '✓' : `+${ev.points}`}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-slide">
      <div className="events-header">
        <p className="events-title">Events</p>
        <p className="events-sub">Attend events, earn points</p>
      </div>

      <div className="events-list" style={{ paddingTop: 16 }}>
        {loading && <p style={{ color: '#888', fontSize: 13, paddingLeft: 4 }}>Loading...</p>}

        {!loading && upcoming.length === 0 && (
          <p style={{ color: '#888', fontSize: 13, paddingLeft: 4 }}>No upcoming events.</p>
        )}

        {upcoming.map((ev, i) => (
          <EventCard key={ev.id} ev={ev} featured={i === 0} />
        ))}

        {past.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 }}>
              Past Events
            </div>
            {past.map(ev => <EventCard key={ev.id} ev={ev} featured={false} />)}
          </>
        )}
      </div>

      {/* Render the modal sheet when an event is selected. */}
      {selected && (
        <CheckinSheet
          event={selected}
          checkedIn={checkedIn.has(selected.id)}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

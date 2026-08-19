import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Html5QrcodeScanner } from 'html5-qrcode'

// CheckinSheet is a modal that appears when the user opens an event.
// It lets the user scan a QR code to confirm attendance and earn points.
function CheckinSheet({ event, checkedIn, onClose, onSuccess }) {
  const { user, refreshProfile } = useAuth()
  const [status, setStatus] = useState('idle') // idle | loading | success | error | scanning
  const [msg, setMsg] = useState('')
  const [ptsEarned, setPts] = useState(0)
  const scannerRef = useRef(null)
  const scannerInstanceRef = useRef(null)

  // Initialize QR scanner
  useEffect(() => {
    if (status !== 'scanning' || !scannerRef.current) return

    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      false
    )

    scannerInstanceRef.current = scanner

    scanner.render(
      async (decodedText) => {
        // QR code scanned
        scanner.pause()
        await processQRToken(decodedText)
      },
      () => {
        // Scanning error - usually just means no QR in frame
      }
    )

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {})
      }
    }
  }, [status])

  // Submit the QR token to the Supabase RPC function.
  async function processQRToken(qrToken) {
    setStatus('loading')

    const { data, error } = await supabase.rpc('process_qr_checkin', {
      p_user_id: user.id,
      p_qr_token: qrToken.trim(),
    })

    if (error) {
      setStatus('error')
      setMsg(error.message)
      // Resume scanner after error
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.resume()
      }
      return
    }

    if (!data.success) {
      setStatus('error')
      setMsg(data.error)
      // Resume scanner after error
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.resume()
      }
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

  // Start scanning
  function startScanning() {
    setMsg('')
    setStatus('scanning')
  }

  // Cancel scanning
  function cancelScanning() {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear().catch(() => {})
    }
    setStatus('idle')
    setMsg('')
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {})
      }
    }
  }, [])

  // If the user already checked in, show a simple confirmation modal.
  if (checkedIn) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="modal-handle" />
          <div className="success-check">✅</div>
          <div className="modal-pts-big" style={{ color: '#16a34a' }}>
            Already checked in!
          </div>
          <div className="modal-pts-label">You already registered attendance for this event.</div>
          <button className="modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  // Otherwise show the scanner or success state.
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
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
              {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'long',
              })}
              {event.time ? ` · ${event.time}` : ''}
              {event.location ? ` · ${event.location}` : ''}
            </div>
            <div className="modal-pts-big">+{event.points}</div>
            <div className="modal-pts-label">points for attending</div>

            {status === 'scanning' ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 12, textAlign: 'center' }}>
                  Point your camera at the QR code
                </p>
                <div
                  id="qr-scanner"
                  ref={scannerRef}
                  style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
                />
                {msg && (
                  <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                    {msg}
                  </p>
                )}
                <button
                  className="modal-cancel"
                  onClick={cancelScanning}
                  style={{ marginTop: 0 }}
                >
                  Close Scanner
                </button>
              </div>
            ) : (
              <>
                {status === 'error' && (
                  <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                    {msg}
                  </p>
                )}
                <button
                  className="modal-btn"
                  onClick={startScanning}
                  disabled={status === 'loading'}
                  style={{ marginTop: 16 }}
                >
                  {status === 'loading' ? 'Processing...' : '📱 Scan QR Code'}
                </button>
              </>
            )}
            <button className="modal-cancel" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Main Events screen shows upcoming events and handles check-in selection.
export default function EventsScreen({ onToast }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [checkedIn, setCheckedIn] = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  // Load all events and current user's check-ins.
  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: evData }, { data: myCheckins }] = await Promise.all([
      supabase.from('events').select('*').order('date', { ascending: true }),
      supabase.from('checkins').select('event_id').eq('user_id', user.id),
    ])
    setEvents(evData ?? [])
    setCheckedIn(new Set((myCheckins ?? []).map((c) => c.event_id)))
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  // Handle successful check-in by marking the event checked in and showing a toast.
  function handleSuccess(data) {
    setCheckedIn((prev) => new Set([...prev, data.id]))
    onToast(data)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events.filter((e) => e.date >= today)
  const past = events.filter((e) => e.date < today)

  const visibleEvents = filter === 'all' ? events : filter === 'upcoming' ? upcoming : past

  function formatDate(dateString) {
    const d = new Date(dateString + 'T12:00:00')
    return {
      month: d.toLocaleString('en', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
      long: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    }
  }

  function EventCard({ ev, featured }) {
    const d = formatDate(ev.date)
    const done = checkedIn.has(ev.id)

    if (featured) {
      return (
        <div className="event-full-card featured" onClick={() => setSelected(ev)}>
          <div className="efc-top">
            <div className="efc-top-label">⚡ Next Up</div>
            <div className="efc-top-name">{ev.name}</div>
            <div className="efc-top-meta">
              {d.long} · {ev.location}
              {ev.time ? ` · ${ev.time}` : ''}
            </div>
          </div>
          <div className="efc-bottom">
            <div>
              <div className="efc-pts">+{ev.points} pts</div>
              <div className="efc-pts-label">for attending</div>
            </div>
            <button
              className={`efc-checkin-btn ${done ? 'done' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setSelected(ev)
              }}
            >
              {done ? '✓ Checked In' : '📱 Check In'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="event-card-row" onClick={() => setSelected(ev)}>
        <div className="event-date-box compact">
          <span className="event-month">{d.month}</span>
          <span className="event-day">{d.day}</span>
        </div>

        <div className="event-info-block">
          <div className="event-name-row">{ev.name}</div>
          <div className="event-meta-row">
            {ev.location}
            {ev.time ? ` · ${ev.time}` : ''}
          </div>
          <div className="event-meta-row subtle">{d.long}</div>
        </div>

        <div className="event-points-badge">{done ? '✓' : `+${ev.points}`}</div>
      </div>
    )
  }

  return (
    <div className="screen-slide">
      <div className="events-header">
        <p className="events-title">Events</p>
        <p className="events-sub">Attend events, earn points</p>

        <div className="events-stats">
          <div className="event-stat-pill">
            <span className="event-stat-value">{upcoming.length}</span>
            <span className="event-stat-label">Upcoming</span>
          </div>
          <div className="event-stat-pill">
            <span className="event-stat-value">{past.length}</span>
            <span className="event-stat-label">Past</span>
          </div>
          <div className="event-stat-pill">
            <span className="event-stat-value">{checkedIn.size}</span>
            <span className="event-stat-label">Checked in</span>
          </div>
        </div>
      </div>

      <div className="events-list" style={{ paddingTop: 16 }}>
        <div className="events-filter-bar">
          {['upcoming', 'all', 'past'].map((option) => (
            <button
              key={option}
              className={`filter-pill ${filter === option ? 'active' : ''}`}
              onClick={() => setFilter(option)}
            >
              {option === 'upcoming' ? 'Upcoming' : option === 'all' ? 'All' : 'Past'}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#888', fontSize: 13, paddingLeft: 4 }}>Loading...</p>}

        {!loading && visibleEvents.length === 0 && (
          <div className="empty-state-card">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No events found</div>
            <div className="empty-state-text">Check back soon for the next BRASA event.</div>
          </div>
        )}

        {!loading && visibleEvents.length > 0 && (
          <>
            {filter === 'upcoming' && visibleEvents[0] && (
              <EventCard key={visibleEvents[0].id} ev={visibleEvents[0]} featured />
            )}

            {visibleEvents
              .filter((_, index) => filter !== 'upcoming' || index > 0)
              .map((ev) => (
                <EventCard key={ev.id} ev={ev} featured={false} />
              ))}
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

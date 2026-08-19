
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// Badge definitions used on the home screen.
const BADGES = [
  { emoji: '🎉', name: '5 Events',   threshold: 5,   type: 'events' },
  { emoji: '⭐', name: 'Top 3',      threshold: 3,   type: 'rank'   },
  { emoji: '🤝', name: 'Connector',  threshold: 3,   type: 'events' },
  { emoji: '🌱', name: 'Rookie',     threshold: 1,   type: 'events' },
  { emoji: '🤝', name: 'Ambassador', threshold: 10,  type: 'rank'   },
  { emoji: '🔥', name: '10 Events',  threshold: 10,  type: 'events' },
  { emoji: '🦁', name: 'OG Member',  threshold: 500, type: 'points' },
  { emoji: '🌟', name: 'BRASA MVP',  threshold: 1000, type: 'points'},
]

// Determine which badges are unlocked based on profile data and rank.
function getBadges(profile, rank) {
  return BADGES.map(b => {
    let unlocked = false
    if (b.type === 'events' && profile?.events_attended >= b.threshold) unlocked = true
    if (b.type === 'points' && profile?.total_points   >= b.threshold) unlocked = true
    if (b.type === 'rank'   && rank <= b.threshold)                    unlocked = true
    return { ...b, unlocked }
  })
}

export default function HomeScreen({ onTab, onToast }) {
  const { profile } = useAuth()
  const [events, setEvents]   = useState([])
  const [rank, setRank]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      // Load upcoming events and leaderboard data in parallel.
      const [{ data: evData }, { data: board }] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(3),
        supabase
          .from('profiles')
          .select('id, total_points')
          .order('total_points', { ascending: false }),
      ])

      setEvents(evData ?? [])

      if (board && profile) {
        // Determine the user's ranking position based on total points.
        const r = board.findIndex(p => p.id === profile.id) + 1
        setRank(r > 0 ? r : board.length + 1)
      }
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const badges = getBadges(profile, rank)
  const initials = profile?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() ?? '?'
  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="screen-slide">
      {/* Hero section showing welcome message, points, and rank */}
      <div className="home-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p className="home-greeting" style={{ marginBottom: 0 }}>Welcome back 👋</p>
            <p className="home-name" style={{ marginBottom: 0 }}>{firstName}</p>
          </div>
          <img src="/logo.png" alt="BRASA UCF" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </div>
        <div className="pts-card">
          <div className="pts-left">
            <span className="pts-label">Your Points</span>
            <span className="pts-val">{profile?.total_points ?? 0}</span>
            <span className="pts-sub">{profile?.events_attended ?? 0} events attended</span>
          </div>
          <div className="pts-rank">
            <span className="pts-rank-num">#{rank ?? '—'}</span>
            <span className="pts-rank-label">Ranking</span>
          </div>
        </div>
      </div>

      {/* Badges section */}
      <div className="section-header">
        <span className="section-title">Your Badges</span>
        <span className="section-link" style={{ cursor: 'pointer' }} onClick={() => onTab('profile')}>
          See all
        </span>
      </div>
      <div className="badges-scroll">
        {badges.map((b, i) => (
          <div key={i} className={`badge-card ${b.unlocked ? '' : 'locked'}`}>
            <span className="badge-emoji">{b.emoji}</span>
            <span className="badge-name">{b.name}</span>
          </div>
        ))}
      </div>

      {/* Upcoming events section */}
      <div className="section-header" style={{ marginTop: 8 }}>
        <span className="section-title">Upcoming Events</span>
        <span className="section-link" style={{ cursor: 'pointer' }} onClick={() => onTab('events')}>
          See all
        </span>
      </div>
      <div className="upcoming-events">
        {loading && <p style={{ padding: '0 20px', color: '#888', fontSize: 13 }}>Loading...</p>}
        {!loading && events.length === 0 && (
          <p style={{ padding: '0 20px', color: '#888', fontSize: 13 }}>No upcoming events.</p>
        )}
        {events.map(ev => {
          const d = new Date(ev.date + 'T12:00:00')
          const month = d.toLocaleString('en', { month: 'short' }).toUpperCase()
          const day   = d.getDate()
          return (
            <div key={ev.id} className="event-card" onClick={() => onTab('events')}>
              <div className="event-date-box">
                <span className="event-month">{month}</span>
                <span className="event-day">{day}</span>
              </div>
              <div className="event-info">
                <div className="event-name">{ev.name}</div>
                <div className="event-loc">{ev.location}{ev.time ? ` · ${ev.time}` : ''}</div>
              </div>
              <span className="event-pts-pill">+{ev.points} pts</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

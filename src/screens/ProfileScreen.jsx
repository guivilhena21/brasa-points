import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const BADGES = [
  { emoji: '🎉', name: '5 Events',  threshold: 5,    type: 'events' },
  { emoji: '⭐', name: 'Top 3',     threshold: 3,    type: 'rank'   },
  { emoji: '🤝', name: 'Connector', threshold: 3,    type: 'events' },
  { emoji: '🌱', name: 'Rookie',      threshold: 1,   type: 'events' },
  { emoji: '🤝', name: 'Ambassador', threshold: 10,  type: 'rank'   },
  { emoji: '🔥', name: '10 Events', threshold: 10,   type: 'events' },
  { emoji: '🦁', name: 'OG Member', threshold: 500,  type: 'points' },
  { emoji: '🌟', name: 'BRASA MVP', threshold: 1000, type: 'points' },
]

export default function ProfileScreen({ onTab }) {
  const { profile, signOut } = useAuth()
  const [history, setHistory] = useState([])
  const [rank, setRank]       = useState(null)
  const [rewards, setRewards] = useState([])

  useEffect(() => {
    supabase.from('rewards').select('*').order('points_required', { ascending: true })
      .then(({ data }) => setRewards(data ?? []))
  }, [])

  useEffect(() => {
    if (!profile) return
    async function load() {
      const [{ data: hist }, { data: board }] = await Promise.all([
        supabase
          .from('checkins')
          .select('points_earned, checked_in_at, events(name)')
          .eq('user_id', profile.id)
          .order('checked_in_at', { ascending: false })
          .limit(10),
        supabase
          .from('profiles')
          .select('id')
          .order('total_points', { ascending: false }),
      ])
      setHistory(hist ?? [])
      if (board) {
        const r = board.findIndex(p => p.id === profile.id) + 1
        setRank(r > 0 ? r : board.length + 1)
      }
    }
    load()
  }, [profile])

  const initials = profile?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() ?? '?'

  const badges = BADGES.map(b => {
    let unlocked = false
    if (b.type === 'events' && profile?.events_attended >= b.threshold) unlocked = true
    if (b.type === 'points' && profile?.total_points   >= b.threshold) unlocked = true
    if (b.type === 'rank'   && rank && rank <= b.threshold)            unlocked = true
    return { ...b, unlocked }
  })

  const pts = profile?.total_points ?? 0

  return (
    <div className="screen-slide">
      <div className="profile-hero">
        <div className="prof-avatar">{initials}</div>
        <div className="prof-name">{profile?.name}</div>
        <div className="prof-role">{profile?.role} · BRASA UCF</div>
        <div className="prof-stats">
          <div className="prof-stat">
            <div className="prof-stat-val">{pts}</div>
            <div className="prof-stat-label">Points</div>
          </div>
          <div className="prof-stat">
            <div className="prof-stat-val">{profile?.events_attended ?? 0}</div>
            <div className="prof-stat-label">Events</div>
          </div>
          <div className="prof-stat">
            <div className="prof-stat-val">#{rank ?? '—'}</div>
            <div className="prof-stat-label">Rank</div>
          </div>
          <div className="prof-stat">
            <div className="prof-stat-val">{badges.filter(b => b.unlocked).length}</div>
            <div className="prof-stat-label">Badges</div>
          </div>
        </div>
      </div>

      <div className="profile-body">
        {/* Rewards progress */}
        <div className="prof-card" style={{ marginTop: 16 }}>
          <div className="prof-card-title">Progress to Next Reward</div>
          {rewards.length === 0 && <p style={{ fontSize: 13, color: '#aaa' }}>No rewards configured yet.</p>}
          {rewards.map(r => {
            const pct = Math.min(100, Math.round((pts / r.points_required) * 100))
            const done = pts >= r.points_required
            return (
              <div key={r.id} className="prog-bar-wrap">
                <div className="prog-label">
                  <span className="prog-name">{r.name}</span>
                  <span className="prog-val">{pts} / {r.points_required} pts{done ? ' ✓' : ''}</span>
                </div>
                <div className="prog-bar-bg">
                  <div
                    className="prog-bar-fill"
                    style={{ width: `${pct}%`, background: done ? '#16a34a' : '#010077' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Badges */}
        <div className="prof-card">
          <div className="prof-card-title">Badges</div>
          <div className="badges-grid">
            {badges.map((b, i) => (
              <div key={i} className={`badge-item ${b.unlocked ? '' : 'locked'}`}>
                <span className="badge-icon">{b.emoji}</span>
                <span className="badge-lbl">{b.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="prof-card">
          <div className="prof-card-title">Recent Activity</div>
          {history.length === 0 && (
            <p style={{ fontSize: 13, color: '#888' }}>No events yet. Go check in!</p>
          )}
          <div className="history-list">
            {history.map((h, i) => (
              <div key={i} className="hist-row">
                <div className="hist-dot" />
                <span className="hist-name">{h.events?.name ?? 'Evento'}</span>
                <span className="hist-pts">+{h.points_earned}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            width: '100%', background: 'none', border: '1.5px solid #e5e7eb',
            borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '600',
            color: '#dc2626', fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

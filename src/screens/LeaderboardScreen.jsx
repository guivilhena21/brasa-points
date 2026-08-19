// Leaderboard screen displays top members sorted by points.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const COLORS = ['#0F2D5E','#143875','#1a5a2e','#5c2d91','#7c3d12','#065f46','#831843','#1e3a5f']

export default function LeaderboardScreen() {
  const { user } = useAuth()
  const [period, setPeriod]   = useState('all')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, name, total_points, events_attended')
        .order('total_points', { ascending: false })
        .limit(20)
      setMembers(data ?? [])
      setLoading(false)
    }
    load()
  }, [period])

  const top3 = members.slice(0, 3)
  const rest  = members.slice(3)

  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)  // 2nd, 1st, 3rd layout
    : top3

  const podiumHeights = [60, 90, 44]
  const podiumColors  = ['#9ca3af', '#0F2D5E', '#b45309']
  const avatarSizes   = [56, 72, 48]
  const borderColors  = ['#C0C0C0', '#F5C800', '#CD7F32']

  function initials(name) {
    return (name ?? '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  }

  return (
    <div className="screen-slide">
      <div className="lb-header">
        <p className="lb-title">Leaderboard</p>
        <p className="lb-sub">BRASA UCF · All Time</p>
        <div className="lb-period">
          {[['all','All Time'],['semester','Semester'],['month','This Month']].map(([id,label]) => (
            <button key={id} className={`lb-pill ${period === id ? 'active' : ''}`} onClick={() => setPeriod(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ padding: '24px 20px', color: '#888', fontSize: 13 }}>Loading...</p>}

      {!loading && top3.length > 0 && (
        <div className="podium">
          {podiumOrder.map((m, i) => {
            const actualRank = members.indexOf(m) + 1
            const pIdx = i
            return (
              <div key={m.id} className="podium-item">
                {pIdx === 1 && <span className="podium-crown">👑</span>}
                <div
                  className="podium-avatar"
                  style={{
                    width: avatarSizes[pIdx], height: avatarSizes[pIdx],
                    fontSize: avatarSizes[pIdx] * 0.36,
                    background: COLORS[actualRank - 1] ?? '#0F2D5E',
                    border: `3px solid ${borderColors[pIdx]}`,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}
                >
                  {initials(m.name)}
                </div>
                <span className="podium-name">{m.name}</span>
                <span className="podium-pts">{m.total_points}</span>
                <div
                  className="podium-stand"
                  style={{ height: podiumHeights[pIdx], background: podiumColors[pIdx] }}
                >
                  {actualRank}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="lb-list">
        {rest.map((m, i) => {
          const rank = i + 4
          const isMe = m.id === user?.id
          return (
            <div key={m.id} className={`lb-row ${isMe ? 'me' : ''}`}>
              <span className="lb-rank-num">{rank}</span>
              <div className="lb-avatar-sm" style={{ background: COLORS[rank - 1] ?? '#333' }}>
                {initials(m.name)}
              </div>
              <div className="lb-info">
                <div className="lb-row-name">{m.name}{isMe ? ' (você)' : ''}</div>
                <div className="lb-row-events">{m.events_attended} events attended</div>
              </div>
              <span className="lb-row-pts">{m.total_points}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

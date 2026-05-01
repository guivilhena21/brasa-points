import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const BLUE   = '#0F2D5E'
const YELLOW = '#F5C800'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }
const fieldWrap  = { marginBottom: 12 }

// ── Countdown ──────────────────────────────────────────────────────────────
function Countdown({ expiresAt, totalMins = 20 }) {
  const totalSecs = totalMins * 60
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)))
  useEffect(() => {
    if (secs <= 0) return
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [secs])
  const mins  = Math.floor(secs / 60)
  const ss    = String(secs % 60).padStart(2, '0')
  const pct   = Math.max(0, (secs / totalSecs) * 100)
  const color = secs > 300 ? '#16a34a' : secs > 60 ? '#d97706' : '#dc2626'
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>Expires in</div>
      <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'monospace' }}>{mins}:{ss}</div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1s linear' }} />
      </div>
    </div>
  )
}

// ── TAB: Check-in Codes ────────────────────────────────────────────────────
function CodesTab({ events }) {
  const { user } = useAuth()
  const [activeCodes, setCodes] = useState({})
  const [generating, setGen]    = useState(null)
  const [minutes, setMinutes]   = useState(20)
  const today = new Date().toISOString().split('T')[0]

  async function generateCode(ev) {
    setGen(ev.id)
    const code      = randomCode()
    const mins      = Math.max(1, Math.min(120, Number(minutes) || 20))
    const expiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString()
    const { error } = await supabase.from('checkin_codes').insert({ event_id: ev.id, code, created_by: user.id, expires_at: expiresAt })
    setGen(null)
    if (!error) setCodes(prev => ({ ...prev, [ev.id]: { code, expiresAt, mins } }))
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 13, color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>Code duration:</span>
        <input
          type="number"
          min={1}
          max={120}
          value={minutes}
          onChange={e => setMinutes(e.target.value)}
          style={{ width: 64, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", outline: 'none', textAlign: 'center' }}
        />
        <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>minutes</span>
      </div>
      {events.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>No events yet.</p>}
      {events.map(ev => {
        const active    = activeCodes[ev.id]
        const isExpired = active && new Date(active.expiresAt) < new Date()
        const isPast    = ev.date < today
        return (
          <div key={ev.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', opacity: isPast ? 0.6 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{ev.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US')}{ev.time ? ` · ${ev.time}` : ''} · {ev.points} pts
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>{ev.checkins?.[0]?.count ?? 0} check-ins</div>
            </div>
            {active && !isExpired ? (
              <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <Countdown expiresAt={active.expiresAt} totalMins={active.mins ?? 20} />
                <div
                  style={{ fontSize: 32, fontWeight: 800, letterSpacing: 8, textAlign: 'center', color: BLUE, marginTop: 14, fontFamily: 'monospace', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard?.writeText(active.code)}
                  title="Click to copy"
                >
                  {active.code}
                </div>
                <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 6 }}>Click the code to copy · Share with members</p>
              </div>
            ) : active && isExpired ? (
              <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>⏰ Code expired.</p>
            ) : null}
            <button
              onClick={() => generateCode(ev)}
              disabled={generating === ev.id || isPast}
              style={{ width: '100%', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: isPast ? 'default' : 'pointer', background: isPast ? '#f3f4f6' : BLUE, color: isPast ? '#aaa' : YELLOW }}
            >
              {generating === ev.id ? 'Generating...' : active && !isExpired ? `🔄 Generate New Code` : isPast ? 'Past event' : `🔑 Generate Code (${minutes} min)`}
            </button>
          </div>
        )
      })}
    </>
  )
}

// ── Event Form (outside EventsTab to prevent remount on each keystroke) ────
function EventForm({ form, setForm, onSubmit, onCancel, saving, error, submitLabel }) {
  return (
    <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
      <div style={fieldWrap}>
        <label style={labelStyle}>Event Name</label>
        <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Game Night" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div>
          <label style={labelStyle}>Time</label>
          <input style={inputStyle} type="text" placeholder="7:00 PM" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
        </div>
      </div>
      <div style={fieldWrap}>
        <label style={labelStyle}>Location</label>
        <input style={inputStyle} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required placeholder="Student Union" />
      </div>
      <div style={fieldWrap}>
        <label style={labelStyle}>Points</label>
        <input style={inputStyle} type="number" min={1} max={500} value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} required />
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ flex: 1, background: BLUE, color: YELLOW, border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} style={{ flex: 1, background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── TAB: Events ────────────────────────────────────────────────────────────
function EventsTab({ events, onRefresh }) {
  const [editing, setEditing]   = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [loadingCI, setLoadCI]  = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ name: '', date: '', time: '', location: '', points: 50 })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const { user } = useAuth()

  async function loadCheckins(eventId) {
    if (expanded === eventId) { setExpanded(null); return }
    setExpanded(eventId)
    setLoadCI(true)
    const { data } = await supabase
      .from('checkins')
      .select('points_earned, checked_in_at, profiles(name)')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })
    setCheckins(data ?? [])
    setLoadCI(false)
  }

  async function deleteEvent(ev) {
    if (!confirm(`Delete "${ev.name}"? This will also remove all check-ins.`)) return
    await supabase.from('events').delete().eq('id', ev.id)
    onRefresh()
  }

  function startEdit(ev) {
    setEditing(ev.id)
    setCreating(false)
    setForm({ name: ev.name, date: ev.date, time: ev.time ?? '', location: ev.location, points: ev.points })
    setError('')
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('events').update({ ...form, points: Number(form.points) }).eq('id', editing)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditing(null)
    onRefresh()
  }

  async function createEvent(e) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('events').insert({ ...form, points: Number(form.points), created_by: user.id })
    setSaving(false)
    if (err) { setError(err.message); return }
    setCreating(false)
    setForm({ name: '', date: '', time: '', location: '', points: 50 })
    onRefresh()
  }

  function cancelForm() { setEditing(null); setCreating(false) }

  return (
    <>
      {!creating && !editing && (
        <button
          onClick={() => { setCreating(true); setForm({ name: '', date: '', time: '', location: '', points: 50 }); setError('') }}
          style={{ width: '100%', background: BLUE, color: YELLOW, border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', marginBottom: 16 }}
        >
          + New Event
        </button>
      )}

      {creating && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>New Event</div>
          <EventForm form={form} setForm={setForm} onSubmit={createEvent} onCancel={cancelForm} saving={saving} error={error} submitLabel="Create Event" />
        </div>
      )}

      {events.length === 0 && <p style={{ color: '#aaa', fontSize: 13 }}>No events yet.</p>}

      {events.map(ev => (
        <div key={ev.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {editing === ev.id ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Editing: {ev.name}</div>
              <EventForm form={form} setForm={setForm} onSubmit={saveEdit} onCancel={cancelForm} saving={saving} error={error} submitLabel="Save Changes" />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{ev.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {new Date(ev.date + 'T12:00:00').toLocaleDateString('en-US')}{ev.time ? ` · ${ev.time}` : ''} · {ev.location} · {ev.points} pts
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{ev.checkins?.[0]?.count ?? 0} check-ins</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => loadCheckins(ev.id)} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#555' }}>
                  {expanded === ev.id ? '▲ Hide Check-ins' : '▼ View Check-ins'}
                </button>
                <button onClick={() => startEdit(ev)} style={{ flex: 1, background: '#eff6ff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: BLUE }}>
                  ✏️ Edit
                </button>
                <button onClick={() => deleteEvent(ev)} style={{ flex: 1, background: '#fef2f2', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#dc2626' }}>
                  🗑️ Delete
                </button>
              </div>

              {expanded === ev.id && (
                <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                  {loadingCI && <p style={{ fontSize: 12, color: '#888' }}>Loading...</p>}
                  {!loadingCI && checkins.length === 0 && <p style={{ fontSize: 12, color: '#aaa' }}>No check-ins yet.</p>}
                  {checkins.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                      <span style={{ fontSize: 13, color: '#333' }}>{c.profiles?.name ?? 'Unknown'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>+{c.points_earned} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </>
  )
}

// ── Reward Form (outside RewardsTab to prevent remount on each keystroke) ──
function RewardForm({ form, setForm, onSubmit, onCancel, saving, error, submitLabel }) {
  return (
    <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
      <div style={fieldWrap}>
        <label style={labelStyle}>Reward Name</label>
        <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="BRASA Jersey" />
      </div>
      <div style={fieldWrap}>
        <label style={labelStyle}>Points Required</label>
        <input style={inputStyle} type="number" min={1} value={form.points_required} onChange={e => setForm(f => ({ ...f, points_required: e.target.value }))} required />
      </div>
      <div style={fieldWrap}>
        <label style={labelStyle}>Description (optional)</label>
        <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Claim at next general meeting" />
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ flex: 1, background: BLUE, color: YELLOW, border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} style={{ flex: 1, background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── TAB: Rewards ───────────────────────────────────────────────────────────
function RewardsTab() {
  const [rewards, setRewards]   = useState([])
  const [editing, setEditing]   = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ name: '', points_required: '', description: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('rewards').select('*').order('points_required', { ascending: true })
    setRewards(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function saveReward(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, points_required: Number(form.points_required) }
    const { error: err } = editing
      ? await supabase.from('rewards').update(payload).eq('id', editing)
      : await supabase.from('rewards').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setEditing(null); setCreating(false)
    setForm({ name: '', points_required: '', description: '' })
    load()
  }

  async function deleteReward(r) {
    if (!confirm(`Delete reward "${r.name}"?`)) return
    await supabase.from('rewards').delete().eq('id', r.id)
    load()
  }

  function startEdit(r) {
    setEditing(r.id); setCreating(false)
    setForm({ name: r.name, points_required: r.points_required, description: r.description ?? '' })
    setError('')
  }

  function cancelForm() { setEditing(null); setCreating(false) }

  return (
    <>
      {!creating && !editing && (
        <button
          onClick={() => { setCreating(true); setForm({ name: '', points_required: '', description: '' }); setError('') }}
          style={{ width: '100%', background: BLUE, color: YELLOW, border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', marginBottom: 16 }}
        >
          + New Reward
        </button>
      )}

      {creating && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>New Reward</div>
          <RewardForm form={form} setForm={setForm} onSubmit={saveReward} onCancel={cancelForm} saving={saving} error={error} submitLabel="Create Reward" />
        </div>
      )}

      {rewards.map(r => (
        <div key={r.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {editing === r.id ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Editing: {r.name}</div>
              <RewardForm form={form} setForm={setForm} onSubmit={saveReward} onCancel={cancelForm} saving={saving} error={error} submitLabel="Save Changes" />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{r.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>{r.points_required} pts</div>
                  {r.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => startEdit(r)} style={{ flex: 1, background: '#eff6ff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: BLUE }}>
                  ✏️ Edit
                </button>
                <button onClick={() => deleteReward(r)} style={{ flex: 1, background: '#fef2f2', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif", cursor: 'pointer', color: '#dc2626' }}>
                  🗑️ Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </>
  )
}

// ── TAB: Members ───────────────────────────────────────────────────────────
function MembersTab() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editPts, setEditPts] = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, total_points, events_attended, is_admin')
      .order('total_points', { ascending: false })
    setMembers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleAdmin(member) {
    if (member.id === user.id) return
    const { error } = await supabase.rpc('toggle_admin', { target_id: member.id })
    if (!error) load()
  }

  async function savePoints(member) {
    const pts = Number(editPts.value)
    if (isNaN(pts) || pts < 0) return
    setSaving(true)
    await supabase.rpc('set_member_points', { target_id: member.id, new_points: pts })
    setSaving(false)
    setEditPts(null)
    load()
  }

  if (loading) return <p style={{ fontSize: 13, color: '#888' }}>Loading...</p>

  return (
    <>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{members.length} members</p>
      {members.map(m => (
        <div key={m.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                {m.name}
                {m.is_admin && <span style={{ marginLeft: 6, fontSize: 10, background: BLUE, color: YELLOW, borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>ADMIN</span>}
                {m.id === user.id && <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>(you)</span>}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>{m.events_attended} events attended</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {editPts?.id === m.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={editPts.value}
                    onChange={e => setEditPts(p => ({ ...p, value: e.target.value }))}
                    style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 14, fontWeight: 700, fontFamily: "'Poppins', sans-serif", outline: 'none' }}
                    autoFocus
                  />
                  <button onClick={() => savePoints(m)} disabled={saving} style={{ background: BLUE, color: YELLOW, border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                    {saving ? '...' : '✓'}
                  </button>
                  <button onClick={() => setEditPts(null)} style={{ background: '#f3f4f6', color: '#555', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, fontFamily: "'Poppins', sans-serif", cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  style={{ fontSize: 20, fontWeight: 800, color: BLUE, cursor: 'pointer' }}
                  onClick={() => setEditPts({ id: m.id, value: m.total_points })}
                  title="Click to edit points"
                >
                  {m.total_points} pts
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => toggleAdmin(m)}
            disabled={m.id === user.id}
            style={{
              width: '100%', border: 'none', borderRadius: 8, padding: '8px',
              fontSize: 12, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
              cursor: m.id === user.id ? 'default' : 'pointer',
              background: m.is_admin ? '#fef2f2' : '#f0fdf4',
              color: m.is_admin ? '#dc2626' : '#16a34a',
            }}
          >
            {m.is_admin ? '🔴 Remove Admin' : '🟢 Make Admin'}
          </button>
        </div>
      ))}
    </>
  )
}

// ── Main Admin Screen ──────────────────────────────────────────────────────
export default function AdminScreen() {
  const [view, setView]     = useState('codes')
  const [events, setEvents] = useState([])

  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*, checkins(count)')
      .order('date', { ascending: false })
    setEvents(data ?? [])
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  const tabs = [
    ['codes',   '🔑 Codes'],
    ['events',  '📅 Events'],
    ['rewards', '🎁 Rewards'],
    ['members', '👥 Members'],
  ]

  return (
    <div className="screen-slide">
      <div style={{ background: `linear-gradient(160deg, ${BLUE} 0%, #1a4a8a 100%)`, padding: '20px 20px 24px' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Admin Panel</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Manage events and check-ins</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: 'none', fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
                background: view === id ? YELLOW : 'rgba(255,255,255,0.1)',
                color: view === id ? BLUE : 'rgba(255,255,255,0.7)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {view === 'codes'   && <CodesTab   events={events} />}
        {view === 'events'  && <EventsTab  events={events} onRefresh={loadEvents} />}
        {view === 'rewards' && <RewardsTab />}
        {view === 'members' && <MembersTab />}
      </div>
    </div>
  )
}

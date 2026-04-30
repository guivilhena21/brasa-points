import { useEffect } from 'react'

export default function Toast({ event, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="toast">
      <span className="toast-icon">⭐</span>
      <div className="toast-text">
        <div className="toast-title">Points Earned!</div>
        <div className="toast-sub">{event.name}</div>
      </div>
      <span className="toast-pts">+{event.points_earned ?? event.points}</span>
    </div>
  )
}

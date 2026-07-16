// React hook import for lifecycle behavior inside the component.
import { useEffect } from 'react'

// Toast component rendered when points are earned.
// Props:
// - event: object containing event details and points.
// - onDone: callback function called when the toast should disappear.
export default function Toast({ event, onDone }) {
  // useEffect runs after the component mounts and when `onDone` changes.
  useEffect(() => {
    // Start a timer that calls onDone after 3000ms (3 seconds).
    const t = setTimeout(onDone, 3000)

    // Cleanup function: if the component unmounts before the timer ends,
    // clear the timeout to avoid calling onDone after the component is gone.
    return () => clearTimeout(t)
  }, [onDone])

  return (
    // Outer container for the toast notification.
    <div className="toast">
      {/* Static icon shown next to the toast text. */}
      <span className="toast-icon">⭐</span>

      {/* Text content wrapper. */}
      <div className="toast-text">
        {/* Title shown when points are earned. */}
        <div className="toast-title">Points Earned!</div>
        {/* Subtitle shows the event name from the event prop. */}
        <div className="toast-sub">{event.name}</div>
      </div>

      {/* Points display. Use points_earned if present, otherwise fall back to points. */}
      <span className="toast-pts">+{event.points_earned ?? event.points}</span>
    </div>
  )
}

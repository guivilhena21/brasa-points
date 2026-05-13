const baseTabs = [
  {
    id: 'home', label: 'Home',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'leaderboard', label: 'Ranking',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'events', label: 'Events',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'profile', label: 'Profile',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
]

const adminTab = {
  id: 'admin', label: 'Admin',
  icon: (active) => (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" fill={active ? '#010077' : '#bbb'} />
    </svg>
  ),
}

export default function TabBar({ active, onTab, isAdmin }) {
  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs

  return (
    <div className="tab-bar">
      {tabs.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onTab(t.id)}
          >
            {t.icon(isActive)}
            <span className="tab-label">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

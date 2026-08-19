// Define the default tabs that every user sees.
// Each tab has an id, a label, and an icon renderer function.
const baseTabs = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      // The icon function returns an SVG element.
      // It uses the `active` boolean to choose the icon color.
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Ranking',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Events',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={active ? '#010077' : '#bbb'} />
      </svg>
    ),
  },
]

// Define the admin-only tab that is appended conditionally.
const adminTab = {
  id: 'admin',
  label: 'Admin',
  icon: (active) => (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z" fill={active ? '#010077' : '#bbb'} />
    </svg>
  ),
}

// Export the TabBar component as the default export from this file.
// The component renders a list of tab buttons and highlights the active one.
export default function TabBar({ active, onTab, isAdmin }) {
  // Choose the tab list depending on whether the current user is an admin.
  // If `isAdmin` is true, add the extra admin tab.
  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs

  return (
    // The outer wrapper for the tab bar.
    <div className="tab-bar">
      {tabs.map(t => {
        // Determine if this current tab is the active one.
        const isActive = active === t.id
        return (
          // Each tab is rendered as a button.
          <button
            key={t.id}
            className={`tab-item ${isActive ? 'active' : ''}`} // Add the active class when selected.
            onClick={() => onTab(t.id)} // Call the onTab callback when clicked.
          >
            {t.icon(isActive)} {/* Render the tab icon.
                                      Pass the active state so the icon can change color. */}
            <span className="tab-label">{t.label}</span> {/* Display the tab label. */}
          </button>
        )
      })}
    </div>
  )
}

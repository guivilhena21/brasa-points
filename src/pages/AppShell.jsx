import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import TabBar from '../components/TabBar'
import Toast from '../components/Toast'
import HomeScreen from '../screens/HomeScreen'
import LeaderboardScreen from '../screens/LeaderboardScreen'
import EventsScreen from '../screens/EventsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import AdminScreen from '../screens/AdminScreen'

// AppShell is the main container for the logged-in application UI.
// It manages the active tab, toast notifications, and renders the selected screen.
export default function AppShell() {
  // Get the current user's profile from auth context.
  const { profile } = useAuth()

  // Track which tab is currently selected.
  // Default is 'home' when the app first loads.
  const [tab, setTab]   = useState('home')

  // Toast state holds the current notification event, or null when no toast is shown.
  const [toast, setToast] = useState(null)

  // Show a toast by storing its event data.
  function showToast(data) {
    setToast(data)
  }

  // Handle tab selection from the TabBar or child screens.
  function handleTab(id) {
    setTab(id)
  }

  return (
    <div className="app-shell">
      {/* Screen content area switches based on the current tab. */}
      <div className="screen-content">
        {tab === 'home'        && <HomeScreen onTab={handleTab} onToast={showToast} />}
        {tab === 'leaderboard' && <LeaderboardScreen />}
        {tab === 'events'      && <EventsScreen onToast={showToast} />}
        {tab === 'profile'     && <ProfileScreen onTab={handleTab} />}
        {tab === 'admin'       && <AdminScreen />}
      </div>

      {/* TabBar receives the active tab and a callback for tab changes.
          If the user is an admin, the admin tab will be shown. */}
      <TabBar active={tab} onTab={handleTab} isAdmin={profile?.is_admin} />

      {/* Render the toast notification only when toast state is not null. */}
      {toast && <Toast event={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

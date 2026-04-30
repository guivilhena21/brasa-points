import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import TabBar from '../components/TabBar'
import Toast from '../components/Toast'
import HomeScreen from '../screens/HomeScreen'
import LeaderboardScreen from '../screens/LeaderboardScreen'
import EventsScreen from '../screens/EventsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import AdminScreen from '../screens/AdminScreen'

export default function AppShell() {
  const { profile } = useAuth()
  const [tab, setTab]   = useState('home')
  const [toast, setToast] = useState(null)

  function showToast(data) {
    setToast(data)
  }

  // Add admin tab dynamically if user is admin
  function handleTab(id) {
    setTab(id)
  }

  return (
    <div className="app-shell">
      <div className="screen-content">
        {tab === 'home'        && <HomeScreen onTab={handleTab} onToast={showToast} />}
        {tab === 'leaderboard' && <LeaderboardScreen />}
        {tab === 'events'      && <EventsScreen onToast={showToast} />}
        {tab === 'profile'     && <ProfileScreen onTab={handleTab} />}
        {tab === 'admin'       && <AdminScreen />}
      </div>

      <TabBar active={tab} onTab={handleTab} isAdmin={profile?.is_admin} />

      {toast && <Toast event={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

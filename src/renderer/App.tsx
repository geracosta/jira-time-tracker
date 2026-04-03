import React from 'react'
import { useApp } from './context/AppContext'
import TaskSearch from './components/TaskSearch'
import ActiveTimer from './components/ActiveTimer'
import ManualEntry from './components/ManualEntry'
import WorklogHistory from './components/WorklogHistory'
import SettingsView from './components/Settings'

export default function App() {
  const { currentView, setCurrentView, isConnected, settings } = useApp()

  // Show settings if not configured
  const needsSetup = !settings?.jiraUrl || !settings?.email || !settings?.apiToken

  if (needsSetup || currentView === 'settings') {
    return (
      <div className="app">
        <SettingsView onBack={needsSetup ? undefined : () => setCurrentView('main')} />
      </div>
    )
  }

  if (currentView === 'manual-entry') {
    return (
      <div className="app">
        <ManualEntry onBack={() => setCurrentView('main')} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Jira Time Tracker</h1>
        <div className="header-actions">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <button className="icon-btn" onClick={() => setCurrentView('settings')} title="Configuración">
            ⚙
          </button>
        </div>
      </header>

      <ActiveTimer />
      <TaskSearch />
      <WorklogHistory />
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useApp } from './context/AppContext'
import TaskSearch from './components/TaskSearch'
import ActiveTimer from './components/ActiveTimer'
import ManualEntry from './components/ManualEntry'
import WorklogHistory from './components/WorklogHistory'
import SettingsView from './components/Settings'
import type { Settings } from './types'

function isWithinWorkHours(settings: Settings | null): boolean {
  if (!settings) return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = settings.workStartHour * 60 + settings.workStartMinute
  const endMinutes = settings.workEndHour * 60 + settings.workEndMinute
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

function useNeedsPlay(): boolean {
  const { settings, timer, isConnected } = useApp()
  const [withinHours, setWithinHours] = useState(() => isWithinWorkHours(settings))

  useEffect(() => {
    setWithinHours(isWithinWorkHours(settings))
    const id = setInterval(() => setWithinHours(isWithinWorkHours(settings)), 30 * 1000)
    return () => clearInterval(id)
  }, [settings])

  return isConnected && !timer.isRunning && withinHours
}

export default function App() {
  const { currentView, setCurrentView, isConnected, settings } = useApp()
  const needsPlay = useNeedsPlay()
  const appClass = `app${needsPlay ? ' needs-play' : ''}`

  // Show settings if not configured
  const needsSetup = !settings?.jiraUrl || !settings?.email || !settings?.apiToken

  if (needsSetup || currentView === 'settings') {
    return (
      <div className={appClass}>
        <SettingsView onBack={needsSetup ? undefined : () => setCurrentView('main')} />
      </div>
    )
  }

  if (currentView === 'manual-entry') {
    return (
      <div className={appClass}>
        <ManualEntry onBack={() => setCurrentView('main')} />
      </div>
    )
  }

  return (
    <div className={appClass}>
      <header className="app-header">
        <h1>JIRA TIME TRACKER</h1>
        <div className="header-actions">
          <span className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <button className="icon-btn" onClick={() => setCurrentView('settings')} title="Configuración">
            CFG
          </button>
        </div>
      </header>

      <ActiveTimer />
      <TaskSearch />
      <WorklogHistory />
    </div>
  )
}

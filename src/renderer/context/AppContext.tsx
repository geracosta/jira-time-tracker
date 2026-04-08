import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { JiraIssue, Worklog, Settings, TimerState, View } from '../types'

interface AppContextValue {
  // Settings
  settings: Settings | null
  loadSettings: () => Promise<void>
  saveSettings: (s: Partial<Settings>) => Promise<void>
  isConnected: boolean
  userName: string

  // Timer
  timer: TimerState
  startTimer: (issue: JiraIssue) => void
  stopTimer: () => Promise<void>
  discardTimer: () => void

  // Worklogs
  todayWorklogs: Worklog[]
  todayTotalSeconds: number
  refreshWorklogs: () => Promise<void>

  // Search
  searchResults: JiraIssue[]
  myIssues: JiraIssue[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  isSearching: boolean
  loadMyIssues: () => Promise<void>

  // Manual entry
  selectedIssue: JiraIssue | null
  setSelectedIssue: (issue: JiraIssue | null) => void

  // View
  currentView: View
  setCurrentView: (v: View) => void

  // Connection
  testConnection: () => Promise<{ success: boolean; error?: string }>
}

const defaultTimer: TimerState = {
  isRunning: false,
  isPaused: false,
  issueKey: '',
  issueSummary: '',
  startedAt: null,
  accumulatedSeconds: 0
}

const AppContext = createContext<AppContextValue>(null!)

export function useApp(): AppContextValue {
  return useContext(AppContext)
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userName, setUserName] = useState('')
  const [timer, setTimer] = useState<TimerState>(defaultTimer)
  const [todayWorklogs, setTodayWorklogs] = useState<Worklog[]>([])
  const [searchResults, setSearchResults] = useState<JiraIssue[]>([])
  const [myIssues, setMyIssues] = useState<JiraIssue[]>([])
  const [searchQuery, setSearchQueryState] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null)
  const [currentView, setCurrentView] = useState<View>('main')
  const searchTimeout = useRef<NodeJS.Timeout>()

  const todayTotalSeconds = todayWorklogs.reduce((sum, wl) => sum + wl.timeSpentSeconds, 0)

  // Refs to avoid stale closures in callbacks
  const todayWorklogsRef = useRef(todayWorklogs)
  useEffect(() => {
    todayWorklogsRef.current = todayWorklogs
  }, [todayWorklogs])

  const stopTimerRef = useRef(() => {})
  useEffect(() => {
    stopTimerRef.current = stopTimer
  }, [stopTimer])

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    const s = await window.api.settings.get()
    setSettings(s)
    if (s.jiraUrl && s.email && s.apiToken) {
      const result = await window.api.jira.testConnection()
      setIsConnected(result.success)
      if (result.displayName) setUserName(result.displayName)
    }
  }, [])

  const saveSettingsHandler = useCallback(async (partial: Partial<Settings>) => {
    await window.api.settings.save(partial)
    await loadSettings()
  }, [loadSettings])

  // Restore timer state on mount
  useEffect(() => {
    loadSettings()

    window.api.timer.getState().then((state) => {
      if (state && state.isRunning && state.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)
        setTimer({
          isRunning: true,
          isPaused: false,
          issueKey: state.issueKey,
          issueSummary: state.issueSummary,
          startedAt: new Date(state.startedAt),
          accumulatedSeconds: state.accumulatedSeconds + elapsed
        })
        window.api.timer.notifyRunning(true, state.issueKey)
        window.api.notifications.reportTimerState(true)
      }
    })

    // Listen for end-of-day check
    const unsubscribe = window.api.notifications.onCheckDailyHours(() => {
      const total = todayWorklogsRef.current.reduce((sum, wl) => sum + wl.timeSpentSeconds, 0)
      window.api.notifications.reportDailyHours(total / 3600)
    })

    // Listen for stop request from mini-widget
    const unsubWidget = window.api.timer.onWidgetStop(() => {
      stopTimerRef.current()
    })

    return () => { unsubscribe(); unsubWidget() }
  }, [])

  // Persist timer state
  useEffect(() => {
    if (timer.isRunning) {
      window.api.timer.saveState({
        isRunning: true,
        issueKey: timer.issueKey,
        issueSummary: timer.issueSummary,
        startedAt: timer.startedAt?.toISOString() || null,
        accumulatedSeconds: timer.accumulatedSeconds
      })
    } else {
      window.api.timer.saveState(null)
    }
  }, [timer.isRunning, timer.issueKey])

  // Notify main process of timer state
  useEffect(() => {
    window.api.timer.notifyRunning(timer.isRunning, timer.issueKey)
    window.api.notifications.reportTimerState(timer.isRunning)
  }, [timer.isRunning])

  const startTimer = useCallback((issue: JiraIssue) => {
    setTimer({
      isRunning: true,
      isPaused: false,
      issueKey: issue.key,
      issueSummary: issue.summary,
      startedAt: new Date(),
      accumulatedSeconds: 0
    })
  }, [])

  const stopTimer = useCallback(async () => {
    if (!timer.isRunning || !timer.startedAt) return

    const elapsed = Math.floor((Date.now() - timer.startedAt.getTime()) / 1000) + timer.accumulatedSeconds
    // Jira mínimo acepta 60 segundos, si es menos redondeamos a 60
    const timeToLog = Math.max(60, elapsed)

    const result = await window.api.jira.addWorklog(
      timer.issueKey,
      timeToLog,
      timer.startedAt.toISOString()
    )

    if (result.success) {
      window.api.notifications.reportWorklogAdded()
      await refreshWorklogs()
    } else {
      console.error('Error guardando worklog:', result.error)
    }

    setTimer(defaultTimer)
  }, [timer])

  const discardTimer = useCallback(() => {
    setTimer(defaultTimer)
  }, [])

  const refreshWorklogs = useCallback(async () => {
    const today = new Date().toISOString().substring(0, 10)
    const worklogs = await window.api.jira.getMyWorklogs(today)
    setTodayWorklogs(worklogs)
  }, [])

  // Load worklogs on mount and when connected
  useEffect(() => {
    if (isConnected) {
      refreshWorklogs()
    }
  }, [isConnected, refreshWorklogs])

  // Search with debounce
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const results = await window.api.jira.search(query)
      setSearchResults(results)
      setIsSearching(false)
    }, 400)
  }, [])

  const loadMyIssues = useCallback(async () => {
    const issues = await window.api.jira.getMyIssues()
    setMyIssues(issues)
  }, [])

  useEffect(() => {
    if (isConnected) {
      loadMyIssues()
    }
  }, [isConnected, loadMyIssues])

  const testConnection = useCallback(async () => {
    const result = await window.api.jira.testConnection()
    setIsConnected(result.success)
    if (result.displayName) setUserName(result.displayName)
    return result
  }, [])

  return (
    <AppContext.Provider
      value={{
        settings,
        loadSettings,
        saveSettings: saveSettingsHandler,
        isConnected,
        userName,
        timer,
        startTimer,
        stopTimer,
        discardTimer,
        todayWorklogs,
        todayTotalSeconds,
        refreshWorklogs,
        searchResults,
        myIssues,
        searchQuery,
        setSearchQuery,
        isSearching,
        loadMyIssues,
        selectedIssue,
        setSelectedIssue,
        currentView,
        setCurrentView,
        testConnection
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

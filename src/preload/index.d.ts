export interface JiraIssue {
  key: string
  summary: string
  status: string
  project: string
  issueType: string
}

export interface Worklog {
  id: string
  issueKey: string
  issueSummary: string
  timeSpentSeconds: number
  timeSpent: string
  started: string
  comment: string
}

export interface Settings {
  jiraUrl: string
  email: string
  apiToken: string
  workStartHour: number
  workStartMinute: number
  workEndHour: number
  workEndMinute: number
  reminderIntervalMinutes: number
  targetHoursPerDay: number
  notificationsEnabled: boolean
}

export interface ConnectionResult {
  success: boolean
  displayName?: string
  accountId?: string
  error?: string
}

export interface WorklogResult {
  success: boolean
  worklog?: any
  error?: string
}

export interface PersistedTimerState {
  isRunning: boolean
  issueKey: string
  issueSummary: string
  startedAt: string | null
  accumulatedSeconds: number
}

export interface ElectronAPI {
  jira: {
    testConnection: () => Promise<ConnectionResult>
    search: (query: string) => Promise<JiraIssue[]>
    getMyIssues: () => Promise<JiraIssue[]>
    addWorklog: (issueKey: string, timeSpentSeconds: number, started: string, comment?: string) => Promise<WorklogResult>
    getMyWorklogs: (date: string) => Promise<Worklog[]>
  }
  settings: {
    get: () => Promise<Settings>
    save: (settings: Partial<Settings>) => Promise<void>
  }
  timer: {
    getState: () => Promise<PersistedTimerState | null>
    saveState: (state: PersistedTimerState | null) => Promise<void>
    notifyRunning: (isRunning: boolean, issueKey?: string, startedAt?: number, accumulatedSeconds?: number) => void
    notifyPaused: (issueKey: string, frozenTime: string) => void
    tick: (issueKey: string, formattedTime: string) => void
    onWidgetStop: (callback: () => void) => () => void
    onWidgetPause: (callback: () => void) => () => void
    onWidgetPlay: (callback: () => void) => () => void
  }
  notifications: {
    reportTimerState: (running: boolean) => void
    reportWorklogAdded: () => void
    reportDailyHours: (hours: number) => void
    onCheckDailyHours: (callback: () => void) => () => void
  }
  app: {
    minimizeToTray: () => void
    quit: () => void
    show: () => void
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

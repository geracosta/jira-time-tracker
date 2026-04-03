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

export interface TimerState {
  isRunning: boolean
  isPaused: boolean
  issueKey: string
  issueSummary: string
  startedAt: Date | null
  accumulatedSeconds: number
}

export type View = 'main' | 'settings' | 'manual-entry'

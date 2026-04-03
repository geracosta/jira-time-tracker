import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

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

export interface PersistedTimerState {
  isRunning: boolean
  issueKey: string
  issueSummary: string
  startedAt: string | null // ISO date string
  accumulatedSeconds: number
}

const defaultSettings: Settings = {
  jiraUrl: '',
  email: '',
  apiToken: '',
  workStartHour: 9,
  workStartMinute: 0,
  workEndHour: 18,
  workEndMinute: 0,
  reminderIntervalMinutes: 15,
  targetHoursPerDay: 8,
  notificationsEnabled: true
}

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function readJson<T>(filename: string, defaults: T): T {
  const filepath = join(getDataDir(), filename)
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8'))
    }
  } catch {
    // Return defaults on error
  }
  return defaults
}

function writeJson(filename: string, data: unknown): void {
  const filepath = join(getDataDir(), filename)
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getSettings(): Settings {
  return readJson('settings.json', defaultSettings)
}

export function saveSettings(partial: Partial<Settings>): void {
  const current = getSettings()
  writeJson('settings.json', { ...current, ...partial })
}

export function getTimerState(): PersistedTimerState | null {
  return readJson<PersistedTimerState | null>('timer-state.json', null)
}

export function saveTimerState(state: PersistedTimerState | null): void {
  writeJson('timer-state.json', state)
}

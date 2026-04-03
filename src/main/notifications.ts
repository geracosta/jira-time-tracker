import { Notification, BrowserWindow, app } from 'electron'
import { getSettings } from './store'
import { flashTrayWarning } from './tray'

let schedulerInterval: NodeJS.Timeout | null = null
let timerIsRunning = false
let mainWindow: BrowserWindow | null = null
let lastWorklogTime: number = 0

export function setTimerRunning(running: boolean): void {
  timerIsRunning = running
  if (running) {
    lastWorklogTime = Date.now()
  }
}

export function markWorklogAdded(): void {
  lastWorklogTime = Date.now()
}

function isWithinWorkHours(settings: ReturnType<typeof getSettings>): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = settings.workStartHour * 60 + settings.workStartMinute
  const endMinutes = settings.workEndHour * 60 + settings.workEndMinute
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

function isEndOfWorkday(settings: ReturnType<typeof getSettings>): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = settings.workEndHour * 60 + settings.workEndMinute
  // Within 5 minutes of end of work day
  return currentMinutes >= endMinutes && currentMinutes <= endMinutes + 5
}

function showAggressiveNotification(title: string, body: string): void {
  const notification = new Notification({
    title,
    body,
    urgency: 'critical',
    silent: false,
    timeoutType: 'never'
  })

  notification.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  notification.show()

  // Flash the taskbar
  mainWindow?.flashFrame(true)
  setTimeout(() => {
    mainWindow?.flashFrame(false)
  }, 5000)

  // Flash tray icon
  flashTrayWarning()
}

function checkAndNotify(): void {
  const settings = getSettings()
  if (!settings.notificationsEnabled) return
  if (!settings.jiraUrl || !settings.email || !settings.apiToken) return

  const withinHours = isWithinWorkHours(settings)
  const endOfDay = isEndOfWorkday(settings)

  if (withinHours && !timerIsRunning) {
    const minutesSinceActivity = (Date.now() - lastWorklogTime) / 1000 / 60
    if (minutesSinceActivity >= settings.reminderIntervalMinutes || lastWorklogTime === 0) {
      showAggressiveNotification(
        '⚠️ No estás cargando horas!',
        'Tenés que estar registrando tu tiempo en Jira. Abrí la app y arrancá el timer.'
      )
    }
  }

  if (endOfDay) {
    // Send end-of-day reminder
    mainWindow?.webContents.send('check-daily-hours')
  }
}

export function notifyInsufficientHours(logged: number, target: number): void {
  const remaining = target - logged
  showAggressiveNotification(
    '⏰ Fin del día - Faltan horas!',
    `Cargaste ${logged.toFixed(1)}h de ${target}h. Te faltan ${remaining.toFixed(1)} horas por cargar.`
  )
}

export function startNotificationScheduler(window: BrowserWindow): void {
  mainWindow = window
  const settings = getSettings()

  // Listen for timer state changes from renderer
  const { ipcMain } = require('electron')
  ipcMain.removeHandler('notification:timerState')
  ipcMain.on('notification:timerState', (_e: any, running: boolean) => {
    setTimerRunning(running)
  })

  ipcMain.on('notification:worklogAdded', () => {
    markWorklogAdded()
  })

  ipcMain.on('notification:dailyHoursCheck', (_e: any, loggedHours: number) => {
    if (loggedHours < settings.targetHoursPerDay) {
      notifyInsufficientHours(loggedHours, settings.targetHoursPerDay)
    }
  })

  // Check every minute
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
  }
  schedulerInterval = setInterval(checkAndNotify, 60 * 1000)

  // Also check immediately
  setTimeout(checkAndNotify, 5000)
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

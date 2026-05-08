import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { setupTray, updateTrayState } from './tray'
import { startNotificationScheduler, stopNotificationScheduler, isWithinWorkHours } from './notifications'
import { registerJiraHandlers } from './jira-api'
import { getSettings, saveSettings, getTimerState, saveTimerState } from './store'
import {
  setupMiniWidget,
  showRunningWidget,
  showIdleWidget,
  hideWidget,
  destroyWidget,
  updateWidget,
  registerWidgetIpc
} from './mini-widget'
import { setupAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null
let activeTimerIssueKey: string | null = null
let widgetSyncInterval: NodeJS.Timeout | null = null

declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}
app.isQuitting = false

function isMainWindowVisible(): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false
  return mainWindow.isVisible() && !mainWindow.isMinimized()
}

function syncWidgetVisibility(): void {
  if (isMainWindowVisible()) {
    hideWidget()
    return
  }
  if (activeTimerIssueKey) {
    showRunningWidget(activeTimerIssueKey)
    return
  }
  // No active timer.
  const settings = getSettings()
  const hasJiraSetup = !!(settings.jiraUrl && settings.email && settings.apiToken)
  if (hasJiraSetup && isWithinWorkHours(settings)) {
    showIdleWidget()
  } else {
    destroyWidget()
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 380,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    },
    show: false,
    frame: true,
    resizable: true,
    title: 'Jira Time Tracker'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
      syncWidgetVisibility()
    }
  })

  mainWindow.on('show', () => {
    hideWidget()
  })

  mainWindow.on('hide', () => {
    syncWidgetVisibility()
  })

  mainWindow.on('minimize', () => {
    mainWindow?.hide()
    syncWidgetVisibility()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  if (mainWindow) {
    setupTray(mainWindow)
    setupMiniWidget(mainWindow)
    registerWidgetIpc()
  }

  registerJiraHandlers()

  // Settings IPC
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_e, settings) => {
    saveSettings(settings)
    // Restart notification scheduler with new settings
    stopNotificationScheduler()
    startNotificationScheduler(mainWindow!)
    syncWidgetVisibility()
  })

  // Timer state IPC (for persistence across restarts)
  ipcMain.handle('timer:getState', () => getTimerState())
  ipcMain.handle('timer:saveState', (_e, state) => saveTimerState(state))

  // Timer running state (for tray + notifications + widget)
  ipcMain.on('timer:running', (_e, isRunning: boolean, issueKey?: string) => {
    updateTrayState(isRunning, issueKey)
    activeTimerIssueKey = isRunning ? (issueKey || null) : null
    syncWidgetVisibility()
  })

  // Renderer reports work-hours-relevant state changes (e.g. settings updates)
  ipcMain.on('widget:resync', () => {
    syncWidgetVisibility()
  })

  // Timer tick for mini-widget updates
  ipcMain.on('timer:tick', (_e, issueKey: string, formattedTime: string) => {
    updateWidget(issueKey, formattedTime)
  })

  // App control
  ipcMain.on('app:minimize-to-tray', () => {
    mainWindow?.hide()
  })

  ipcMain.on('app:quit', () => {
    app.isQuitting = true
    app.quit()
  })

  ipcMain.on('app:show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Start notification scheduler
  startNotificationScheduler(mainWindow!)

  // Setup auto-updater
  setupAutoUpdater(mainWindow!)

  // Periodic widget sync to handle work-hours boundary crossings.
  widgetSyncInterval = setInterval(syncWidgetVisibility, 60 * 1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (widgetSyncInterval) {
    clearInterval(widgetSyncInterval)
    widgetSyncInterval = null
  }
})

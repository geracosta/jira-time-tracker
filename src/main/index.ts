import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { setupTray, updateTrayState } from './tray'
import { startNotificationScheduler, stopNotificationScheduler } from './notifications'
import { registerJiraHandlers } from './jira-api'
import { getSettings, saveSettings, getTimerState, saveTimerState } from './store'
import { setupMiniWidget, showWidget, hideWidget, destroyWidget, updateWidget, registerWidgetIpc } from './mini-widget'
import { setupAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null
let activeTimerIssueKey: string | null = null

declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}
app.isQuitting = false

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
      sandbox: false
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
      // Show mini-widget if timer is active
      if (activeTimerIssueKey) {
        showWidget(activeTimerIssueKey)
      }
    }
  })

  mainWindow.on('show', () => {
    hideWidget()
  })

  mainWindow.on('minimize', () => {
    if (activeTimerIssueKey) {
      mainWindow?.hide()
      showWidget(activeTimerIssueKey)
    }
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
  })

  // Timer state IPC (for persistence across restarts)
  ipcMain.handle('timer:getState', () => getTimerState())
  ipcMain.handle('timer:saveState', (_e, state) => saveTimerState(state))

  // Timer running state (for tray + notifications + widget)
  ipcMain.on('timer:running', (_e, isRunning: boolean, issueKey?: string) => {
    updateTrayState(isRunning, issueKey)
    activeTimerIssueKey = isRunning ? (issueKey || null) : null
    if (!isRunning) {
      destroyWidget()
    }
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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})

import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, dialog } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setupAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Don't auto-download, let user decide
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Actualización disponible',
      message: `Hay una nueva versión disponible: v${info.version}`,
      detail: '¿Deseas descargarla ahora?',
      buttons: ['Descargar', 'Más tarde'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
        mainWindow?.webContents.send('updater:status', 'downloading')
      }
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('updater:status', 'up-to-date')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:status', 'ready')
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Actualización lista',
      message: 'La actualización se descargó. Se instalará al reiniciar la app.',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:status', 'error')
    console.error('Auto-updater error:', err.message)
  })

  // IPC handler for manual check
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { checking: true }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail on startup check (e.g., no internet)
    })
  }, 10000)
}

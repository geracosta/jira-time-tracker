import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

function createIcon(color: string): nativeImage {
  // Create a 16x16 icon with a colored circle
  const size = 16
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="8" cy="8" r="7" fill="${color}" stroke="#333" stroke-width="1"/>
      <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="white">T</text>
    </svg>
  `.trim()
  return nativeImage.createFromBuffer(
    Buffer.from(canvas),
    { width: size, height: size }
  )
}

function createDataUrlIcon(color: string): nativeImage {
  const size = 32
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="16" cy="16" r="14" fill="${color}"/><text x="16" y="22" text-anchor="middle" font-size="18" font-weight="bold" fill="white">J</text></svg>`
  const base64 = Buffer.from(svg).toString('base64')
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64}`)
}

const iconIdle = () => createDataUrlIcon('#666666')
const iconRunning = () => createDataUrlIcon('#22c55e')
const iconWarning = () => createDataUrlIcon('#ef4444')

export function setupTray(window: BrowserWindow): void {
  mainWindow = window
  tray = new Tray(iconIdle())
  tray.setToolTip('Jira Time Tracker - Sin timer activo')

  updateContextMenu(false)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

function updateContextMenu(isRunning: boolean, issueKey?: string): void {
  const statusLabel = isRunning
    ? `⏱ Timer: ${issueKey || 'Activo'}`
    : '⏸ Sin timer activo'

  const menu = Menu.buildFromTemplate([
    { label: statusLabel, enabled: false },
    { type: 'separator' },
    {
      label: 'Mostrar',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])
  tray?.setContextMenu(menu)
}

export function updateTrayState(isRunning: boolean, issueKey?: string): void {
  if (!tray) return

  if (isRunning) {
    tray.setImage(iconRunning())
    tray.setToolTip(`⏱ Timer activo: ${issueKey || ''}`)
  } else {
    tray.setImage(iconIdle())
    tray.setToolTip('Jira Time Tracker - Sin timer activo')
  }
  updateContextMenu(isRunning, issueKey)
}

export function flashTrayWarning(): void {
  if (!tray) return
  tray.setImage(iconWarning())
  // Flash back after 3 seconds
  setTimeout(() => {
    tray?.setImage(iconIdle())
  }, 3000)
}

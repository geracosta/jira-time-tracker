import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'

let widgetWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

const WIDGET_WIDTH = 320
const WIDGET_HEIGHT = 72

function getWidgetHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    overflow: hidden;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    user-select: none;
  }
  .widget {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(20, 20, 40, 0.95);
    border: 1px solid rgba(79, 143, 255, 0.3);
    border-radius: 12px;
    color: #e8e8f0;
    -webkit-app-region: drag;
    height: ${WIDGET_HEIGHT}px;
    backdrop-filter: blur(10px);
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
    50% { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .issue-key {
    font-weight: 700;
    font-size: 12px;
    color: #4f8fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .time {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #22c55e;
    letter-spacing: 1px;
  }
  .btn-stop {
    -webkit-app-region: no-drag;
    width: 36px; height: 36px;
    border-radius: 8px;
    border: none;
    background: #ef4444;
    color: white;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-stop:hover { background: #dc2626; }
  .btn-expand {
    -webkit-app-region: no-drag;
    width: 28px; height: 28px;
    border-radius: 6px;
    border: none;
    background: rgba(255,255,255,0.08);
    color: #8888aa;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .btn-expand:hover { background: rgba(255,255,255,0.15); color: #e8e8f0; }
</style>
</head>
<body>
<div class="widget">
  <div class="dot"></div>
  <div class="info">
    <div class="issue-key" id="issueKey">---</div>
    <div class="time" id="time">00:00:00</div>
  </div>
  <button class="btn-stop" id="btnStop" title="Detener y guardar">&#9632;</button>
  <button class="btn-expand" id="btnExpand" title="Abrir app">&#9723;</button>
</div>
<script>
  const { ipcRenderer } = require('electron')

  ipcRenderer.on('widget:update', (_e, data) => {
    document.getElementById('issueKey').textContent = data.issueKey || '---'
    document.getElementById('time').textContent = data.time || '00:00:00'
  })

  document.getElementById('btnStop').addEventListener('click', () => {
    ipcRenderer.send('widget:stop')
  })

  document.getElementById('btnExpand').addEventListener('click', () => {
    ipcRenderer.send('widget:expand')
  })
</script>
</body>
</html>`
}

export function setupMiniWidget(main: BrowserWindow): void {
  mainWindow = main
}

export function showWidget(issueKey: string): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.show()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenW } = display.workAreaSize

  widgetWindow = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    x: screenW - WIDGET_WIDTH - 20,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  widgetWindow.setAlwaysOnTop(true, 'floating')

  const html = getWidgetHtml()
  widgetWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  widgetWindow.on('closed', () => {
    widgetWindow = null
  })
}

export function hideWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.hide()
  }
}

export function destroyWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.close()
  }
  widgetWindow = null
}

export function updateWidget(issueKey: string, time: string): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('widget:update', { issueKey, time })
  }
}

export function isWidgetVisible(): boolean {
  return widgetWindow !== null && !widgetWindow.isDestroyed() && widgetWindow.isVisible()
}

export function registerWidgetIpc(): void {
  ipcMain.on('widget:stop', () => {
    // Forward stop to renderer
    mainWindow?.webContents.send('widget:request-stop')
    destroyWidget()
    mainWindow?.show()
    mainWindow?.focus()
  })

  ipcMain.on('widget:expand', () => {
    hideWidget()
    mainWindow?.show()
    mainWindow?.focus()
  })
}

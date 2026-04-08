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
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    overflow: hidden;
    background: transparent;
    font-family: 'Space Mono', monospace;
    user-select: none;
  }
  .widget {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(17, 17, 17, 0.96);
    border: 1px solid #333333;
    border-radius: 16px;
    color: #E8E8E8;
    -webkit-app-region: drag;
    height: ${WIDGET_HEIGHT}px;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4A9E5C;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,158,92,0.3); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(74,158,92,0); }
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .issue-key {
    font-weight: 700;
    font-size: 11px;
    color: #FFFFFF;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.04em;
  }
  .time {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #FFFFFF;
    letter-spacing: 2px;
  }
  .btn-stop {
    -webkit-app-region: no-drag;
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid #D71921;
    background: transparent;
    color: #D71921;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  }
  .btn-stop:hover { background: #D71921; color: #FFFFFF; }
  .btn-expand {
    -webkit-app-region: no-drag;
    width: 28px; height: 28px;
    border-radius: 999px;
    border: 1px solid #333333;
    background: transparent;
    color: #999999;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  }
  .btn-expand:hover { border-color: #999999; color: #FFFFFF; }
</style>
</head>
<body>
<div class="widget">
  <div class="dot"></div>
  <div class="info">
    <div class="issue-key" id="issueKey">---</div>
    <div class="time" id="time">00:00:00</div>
  </div>
  <button class="btn-stop" id="btnStop" title="Stop">STOP</button>
  <button class="btn-expand" id="btnExpand" title="Open app">&#8599;</button>
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

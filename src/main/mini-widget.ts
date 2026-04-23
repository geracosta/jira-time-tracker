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
  @property --border-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes spin-border {
    to { --border-angle: 360deg; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,158,92,0.3); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(74,158,92,0); }
  }
  @keyframes pulse-paused {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
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
    border: 2px solid transparent;
    border-radius: 16px;
    color: #E8E8E8;
    -webkit-app-region: drag;
    height: ${WIDGET_HEIGHT}px;
    background-clip: padding-box;
    position: relative;
    transition: border-color 0.3s;
  }
  .widget.running {
    border-color: #333333;
  }
  .widget.paused {
    border-color: transparent;
    background:
      conic-gradient(from var(--border-angle), #FF6B00 0deg, #FFB300 60deg, #FF6B00 120deg, transparent 160deg, transparent 200deg, #FF6B00 240deg, #FFB300 300deg, #FF6B00 360deg) border-box,
      rgba(17, 17, 17, 0.96) padding-box;
    animation: spin-border 1.8s linear infinite;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4A9E5C;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }
  .dot.paused {
    background: #FF6B00;
    animation: pulse-paused 1s ease-in-out infinite;
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
  .time.paused {
    color: #FF8C00;
  }
  .btn-toggle {
    -webkit-app-region: no-drag;
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid #D71921;
    background: transparent;
    color: #D71921;
    font-family: 'Space Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
    min-width: 36px;
  }
  .btn-toggle.running:hover { background: #D71921; color: #FFFFFF; }
  .btn-toggle.paused {
    border-color: #FF6B00;
    color: #FF6B00;
    animation: pulse-paused 1s ease-in-out infinite;
  }
  .btn-toggle.paused:hover { background: #FF6B00; color: #111111; animation: none; }
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
<div class="widget running" id="widget">
  <div class="dot" id="dot"></div>
  <div class="info">
    <div class="issue-key" id="issueKey">---</div>
    <div class="time" id="time">00:00:00</div>
  </div>
  <button class="btn-toggle running" id="btnToggle" title="Pause">&#9646;&#9646;</button>
  <button class="btn-expand" id="btnExpand" title="Open app">&#8599;</button>
</div>
<script>
  const { ipcRenderer } = require('electron')
  let isPaused = false

  ipcRenderer.on('widget:update', (_e, data) => {
    if (!isPaused) {
      document.getElementById('issueKey').textContent = data.issueKey || '---'
      document.getElementById('time').textContent = data.time || '00:00:00'
    }
  })

  ipcRenderer.on('widget:state-paused', (_e, frozenTime) => {
    isPaused = true
    document.getElementById('time').textContent = frozenTime
    document.getElementById('widget').className = 'widget paused'
    document.getElementById('dot').className = 'dot paused'
    document.getElementById('time').className = 'time paused'
    const btn = document.getElementById('btnToggle')
    btn.className = 'btn-toggle paused'
    btn.title = 'Reanudar'
    btn.innerHTML = '&#9654;'
  })

  ipcRenderer.on('widget:state-resumed', () => {
    isPaused = false
    document.getElementById('widget').className = 'widget running'
    document.getElementById('dot').className = 'dot'
    document.getElementById('time').className = 'time'
    const btn = document.getElementById('btnToggle')
    btn.className = 'btn-toggle running'
    btn.title = 'Pause'
    btn.innerHTML = '&#9646;&#9646;'
  })

  document.getElementById('btnToggle').addEventListener('click', () => {
    if (isPaused) {
      ipcRenderer.send('widget:play')
    } else {
      ipcRenderer.send('widget:pause')
    }
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

export function pauseWidget(frozenTime: string): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('widget:state-paused', frozenTime)
  }
}

export function resumeWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('widget:state-resumed')
  }
}

export function isWidgetVisible(): boolean {
  return widgetWindow !== null && !widgetWindow.isDestroyed() && widgetWindow.isVisible()
}

export function registerWidgetIpc(): void {
  ipcMain.on('widget:pause', () => {
    mainWindow?.webContents.send('widget:request-pause')
  })

  ipcMain.on('widget:play', () => {
    mainWindow?.webContents.send('widget:request-play')
  })

  ipcMain.on('widget:expand', () => {
    hideWidget()
    mainWindow?.show()
    mainWindow?.focus()
  })
}

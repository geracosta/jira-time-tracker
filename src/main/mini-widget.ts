import { BrowserWindow, ipcMain, screen } from 'electron'

let widgetWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null
let currentMode: 'running' | 'idle' = 'running'

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
  @keyframes border-spin {
    to { --border-angle: 360deg; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,158,92,0.3); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(74,158,92,0); }
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
    border: 1px solid #333333;
    border-radius: 16px;
    color: #E8E8E8;
    -webkit-app-region: drag;
    height: ${WIDGET_HEIGHT}px;
    position: relative;
    transition: border-color 0.4s;
  }
  .widget.idle {
    border-color: transparent;
    cursor: pointer;
  }
  .widget.idle::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 17px;
    padding: 1px;
    background: conic-gradient(
      from var(--border-angle),
      transparent 0deg,
      transparent 270deg,
      rgba(215, 25, 33, 0.35) 315deg,
      rgba(215, 25, 33, 0.85) 358deg,
      transparent 360deg
    );
    -webkit-mask:
      linear-gradient(#fff, #fff) content-box,
      linear-gradient(#fff, #fff);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: border-spin 4.5s linear infinite;
    pointer-events: none;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4A9E5C;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }
  .dot.idle {
    background: #444444;
    animation: none;
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
  .issue-key.idle {
    color: #999999;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .time {
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #FFFFFF;
    letter-spacing: 2px;
  }
  .time.idle {
    font-size: 11px;
    font-weight: 400;
    color: #777777;
    letter-spacing: 0.04em;
    text-transform: lowercase;
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
  .btn-stop.hidden { display: none; }
  .btn-play {
    -webkit-app-region: no-drag;
    width: 32px; height: 32px;
    border-radius: 999px;
    border: 1px solid #D71921;
    background: transparent;
    color: #D71921;
    font-size: 11px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding-left: 2px;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
    display: none;
  }
  .btn-play.visible { display: flex; }
  .btn-play:hover { background: #D71921; color: #FFFFFF; }
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
<div class="widget" id="widget">
  <div class="dot" id="dot"></div>
  <div class="info">
    <div class="issue-key" id="issueKey">---</div>
    <div class="time" id="time">00:00:00</div>
  </div>
  <button class="btn-play" id="btnPlay" title="Open app to start tracking">&#9654;</button>
  <button class="btn-stop" id="btnStop" title="Stop">STOP</button>
  <button class="btn-expand" id="btnExpand" title="Open app">&#8599;</button>
</div>
<script>
  const { ipcRenderer } = require('electron')

  ipcRenderer.on('widget:update', (_e, data) => {
    document.getElementById('issueKey').textContent = data.issueKey || '---'
    document.getElementById('time').textContent = data.time || '00:00:00'
  })

  ipcRenderer.on('widget:state', (_e, mode) => {
    const widget = document.getElementById('widget')
    const dot = document.getElementById('dot')
    const issueKey = document.getElementById('issueKey')
    const time = document.getElementById('time')
    const btnStop = document.getElementById('btnStop')
    const btnPlay = document.getElementById('btnPlay')
    if (mode === 'idle') {
      widget.classList.add('idle')
      dot.classList.add('idle')
      issueKey.classList.add('idle')
      time.classList.add('idle')
      issueKey.textContent = 'No active timer'
      time.textContent = 'click to start tracking'
      btnStop.classList.add('hidden')
      btnPlay.classList.add('visible')
    } else {
      widget.classList.remove('idle')
      dot.classList.remove('idle')
      issueKey.classList.remove('idle')
      time.classList.remove('idle')
      btnStop.classList.remove('hidden')
      btnPlay.classList.remove('visible')
    }
  })

  document.getElementById('btnStop').addEventListener('click', (e) => {
    e.stopPropagation()
    ipcRenderer.send('widget:stop')
  })

  document.getElementById('btnPlay').addEventListener('click', (e) => {
    e.stopPropagation()
    ipcRenderer.send('widget:expand')
  })

  document.getElementById('btnExpand').addEventListener('click', (e) => {
    e.stopPropagation()
    ipcRenderer.send('widget:expand')
  })

  document.getElementById('widget').addEventListener('click', () => {
    if (document.getElementById('widget').classList.contains('idle')) {
      ipcRenderer.send('widget:expand')
    }
  })
</script>
</body>
</html>`
}

export function setupMiniWidget(main: BrowserWindow): void {
  mainWindow = main
}

function ensureWidget(): void {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    if (!widgetWindow.isVisible()) widgetWindow.show()
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

function sendWhenReady(fn: () => void): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  if (widgetWindow.webContents.isLoading()) {
    widgetWindow.webContents.once('did-finish-load', fn)
  } else {
    fn()
  }
}

export function showRunningWidget(issueKey: string): void {
  ensureWidget()
  currentMode = 'running'
  sendWhenReady(() => {
    if (!widgetWindow || widgetWindow.isDestroyed()) return
    widgetWindow.webContents.send('widget:state', 'running')
    widgetWindow.webContents.send('widget:update', { issueKey, time: '00:00:00' })
  })
}

export function showIdleWidget(): void {
  ensureWidget()
  currentMode = 'idle'
  sendWhenReady(() => {
    if (!widgetWindow || widgetWindow.isDestroyed()) return
    widgetWindow.webContents.send('widget:state', 'idle')
  })
}

// Backwards-compatible: defaults to running mode.
export function showWidget(issueKey: string): void {
  showRunningWidget(issueKey)
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
  if (widgetWindow && !widgetWindow.isDestroyed() && currentMode === 'running') {
    widgetWindow.webContents.send('widget:update', { issueKey, time })
  }
}

export function isWidgetVisible(): boolean {
  return widgetWindow !== null && !widgetWindow.isDestroyed() && widgetWindow.isVisible()
}

export function getWidgetMode(): 'running' | 'idle' {
  return currentMode
}

export function registerWidgetIpc(): void {
  ipcMain.on('widget:stop', () => {
    // Forward stop to renderer; the renderer will log to Jira and clear timer state.
    // The main process will then decide whether to switch the widget to idle
    // (during work hours) or hide it (outside).
    mainWindow?.webContents.send('widget:request-stop')
  })

  ipcMain.on('widget:expand', () => {
    hideWidget()
    mainWindow?.show()
    mainWindow?.focus()
  })
}

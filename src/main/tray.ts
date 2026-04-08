import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { deflateSync } from 'zlib'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

// --- PNG icon generation (proper rasterized icons for Windows tray) ---

const crcTable: Uint32Array = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(size: number, rgba: Buffer): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA

  const rowLen = 1 + size * 4
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0 // filter: none
    rgba.copy(raw, y * rowLen + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function setPixel(
  buf: Buffer, size: number,
  x: number, y: number,
  r: number, g: number, b: number, a: number
): void {
  if (x < 0 || x >= size || y < 0 || y >= size) return
  const idx = (y * size + x) * 4
  if (a >= 255) {
    buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255
    return
  }
  // Alpha blend over existing
  const srcA = a / 255
  const dstA = buf[idx + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA > 0) {
    buf[idx]     = Math.round((r * srcA + buf[idx]     * dstA * (1 - srcA)) / outA)
    buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA)
    buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA)
  }
  buf[idx + 3] = Math.round(outA * 255)
}

function createIconImage(r: number, g: number, b: number): nativeImage {
  const size = 32
  const cx = 15.5, cy = 15.5, radius = 14
  const rgba = Buffer.alloc(size * size * 4)

  // Draw anti-aliased filled circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist <= radius - 0.7) {
        setPixel(rgba, size, x, y, r, g, b, 255)
      } else if (dist <= radius + 0.7) {
        const alpha = Math.round(Math.max(0, Math.min(1, (radius + 0.7 - dist) / 1.4)) * 255)
        setPixel(rgba, size, x, y, r, g, b, alpha)
      }
    }
  }

  // Draw "J" letter in white
  // Defined as a bitmap pattern for crisp rendering at 32x32
  const jPattern = [
    // Row, startX, endX (inclusive)
    // Top bar
    [8, 11, 21],
    [9, 11, 21],
    // Vertical stem
    [10, 15, 18], [11, 15, 18], [12, 15, 18], [13, 15, 18],
    [14, 15, 18], [15, 15, 18], [16, 15, 18], [17, 15, 18],
    [18, 15, 18], [19, 15, 18],
    // Bottom curve
    [20, 14, 18],
    [21, 12, 17],
    [22, 12, 16],
    [23, 13, 15],
  ]

  for (const [row, sx, ex] of jPattern) {
    for (let x = sx; x <= ex; x++) {
      setPixel(rgba, size, x, row, 255, 255, 255, 230)
    }
  }

  const png = encodePng(size, rgba)
  return nativeImage.createFromBuffer(png)
}

// Cache icons
let _iconIdle: nativeImage | null = null
let _iconRunning: nativeImage | null = null
let _iconWarning: nativeImage | null = null

function iconIdle(): nativeImage {
  if (!_iconIdle) _iconIdle = createIconImage(102, 102, 102)     // #666666
  return _iconIdle
}
function iconRunning(): nativeImage {
  if (!_iconRunning) _iconRunning = createIconImage(34, 197, 94) // #22c55e
  return _iconRunning
}
function iconWarning(): nativeImage {
  if (!_iconWarning) _iconWarning = createIconImage(239, 68, 68) // #ef4444
  return _iconWarning
}

// --- Tray setup ---

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
  setTimeout(() => {
    tray?.setImage(iconIdle())
  }, 3000)
}

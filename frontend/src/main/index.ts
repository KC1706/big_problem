import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join, resolve } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import { existsSync } from 'fs'

let sidecar: ChildProcess | null = null
let apiBase: string | null = null

/** E12: never assume a fixed port. Ask the OS for a free one. */
function findFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => res(port))
    })
  })
}

/**
 * Spawn the Python FastAPI sidecar on a free loopback port and remember its URL
 * for the renderer (IPC). Tolerant by design: any failure is logged and the app
 * still opens — F0's gate is purely visual and makes no API calls. Real wiring
 * is F5. (Dev paths; packaged binary path comes in F6.)
 */
async function startSidecar(): Promise<void> {
  if (process.env.DISABLE_SIDECAR === '1') return
  try {
    const port = await findFreePort()
    const backendDir = resolve(app.getAppPath(), '..', 'backend')
    const venvPython = resolve(app.getAppPath(), '..', '.venv', 'bin', 'python')
    if (!existsSync(backendDir) || !existsSync(venvPython)) {
      console.warn('[sidecar] backend or venv not found; skipping (F0 does not need it)')
      return
    }
    sidecar = spawn(
      venvPython,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port)],
      { cwd: backendDir, env: { ...process.env, PYTHONPATH: '.' }, stdio: 'pipe' },
    )
    sidecar.stdout?.on('data', (d) => console.log('[sidecar]', String(d).trim()))
    sidecar.stderr?.on('data', (d) => console.log('[sidecar]', String(d).trim()))
    sidecar.on('exit', (code) => console.log('[sidecar] exited', code))
    apiBase = `http://127.0.0.1:${port}`
    console.log('[sidecar] starting at', apiBase)
  } catch (err) {
    console.warn('[sidecar] failed to start (continuing):', err)
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#e4e6e7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

ipcMain.handle('get-api-base', () => apiBase)

app.whenReady().then(() => {
  void startSidecar()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (sidecar && !sidecar.killed) sidecar.kill()
})

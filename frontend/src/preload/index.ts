import { contextBridge, ipcRenderer } from 'electron'

// Minimal, typed bridge. Renderer reads the sidecar URL over IPC (never assumes
// a port — E12). More endpoints get added as the API client lands in F5.
contextBridge.exposeInMainWorld('bridgeApi', {
  getApiBase: (): Promise<string | null> => ipcRenderer.invoke('get-api-base'),
})

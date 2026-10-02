const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('anandaDesktop', {
  printHtml: (html) => ipcRenderer.invoke('ananda-native-print-html', { html }),
  openDataFolder: () => ipcRenderer.invoke('ananda-open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('ananda-open-backup-folder'),
  dataLocation: () => ipcRenderer.invoke('ananda-data-location'),
  autoBackupState: (stateJson) => ipcRenderer.invoke('ananda-auto-backup-state', stateJson),
  manualBackupState: (stateJson) => ipcRenderer.invoke('ananda-manual-backup-state', stateJson),
  onShortcut: (callback) => ipcRenderer.on('ananda-shortcut', (_event, action) => callback(action))
});

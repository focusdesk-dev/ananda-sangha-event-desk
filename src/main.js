const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Keep records beside the application so the complete folder can travel on a pen drive.
const dataFolder = path.join(path.dirname(app.getPath('exe')), 'Ananda Sangha Event Data');
app.setPath('userData', dataFolder);
app.setPath('sessionData', path.join(dataFolder, 'Session Data'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f3f7fa',
    icon: path.join(__dirname, 'ananda.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const APP_ID = 'org.anandasangha.gurgaon.eventdesk';
let mainWindow = null;

// Give Windows a stable application identity so the installed app stays on the taskbar.
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f3f7fa',
    icon: path.join(__dirname, 'logo-128.png'),
    autoHideMenuBar: true,
    show: false,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });

  // Explicitly keep a normal Windows taskbar entry when minimized/restored.
  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setSkipTaskbar(false);
    }
  });

  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

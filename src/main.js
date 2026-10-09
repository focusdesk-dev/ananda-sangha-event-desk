const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const APP_ID = 'org.anandasangha.gurgaon.eventdesk';
const APP_VERSION = '2.0.0-beta.1';
const ROOT_DIR = path.join(app.getPath('documents'), 'ANANDA SANGHA EVENT DESK');
const DATA_ROOT = path.join(ROOT_DIR, 'Data');
const SYSTEM_ROOT = path.join(ROOT_DIR, 'System');
const SESSION_ROOT = path.join(SYSTEM_ROOT, 'Session');
const BACKUP_ROOT = path.join(ROOT_DIR, 'Backup');
const AUTO_BACKUP_ROOT = path.join(BACKUP_ROOT, 'Automatic');
const MANUAL_BACKUP_ROOT = path.join(BACKUP_ROOT, 'Manual');
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const AUTO_BACKUP_KEEP = 20;

for (const dir of [ROOT_DIR, DATA_ROOT, SYSTEM_ROOT, SESSION_ROOT, BACKUP_ROOT, AUTO_BACKUP_ROOT, MANUAL_BACKUP_ROOT]) {
  fs.mkdirSync(dir, { recursive: true });
}

app.setPath('userData', DATA_ROOT);
app.setPath('sessionData', SESSION_ROOT);
app.setName('Ananda Sangha Event Desk');
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

let mainWindow = null;

function safeTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function listBackups(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(name => /^Ananda_.*_Backup_.*\.json$/i.test(name))
      .map(name => {
        const fullPath = path.join(dir, name);
        return { name, fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

function normalizeBackupPayload(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.events) || !Array.isArray(parsed.volunteers)) {
    throw new Error('The app data was not valid for backup.');
  }
  return JSON.stringify(parsed, null, 2);
}

function writeBackup(payload, mode) {
  const isAuto = mode === 'auto';
  const dir = isAuto ? AUTO_BACKUP_ROOT : MANUAL_BACKUP_ROOT;
  fs.mkdirSync(dir, { recursive: true });

  if (isAuto) {
    const latest = listBackups(dir)[0];
    if (latest && (Date.now() - latest.mtimeMs) < FIVE_DAYS_MS) {
      return { ok: true, created: false, path: latest.fullPath, nextDueMs: FIVE_DAYS_MS - (Date.now() - latest.mtimeMs) };
    }
  }

  const text = normalizeBackupPayload(payload);
  const prefix = isAuto ? 'Ananda_Auto_Backup_' : 'Ananda_Manual_Backup_';
  const filePath = path.join(dir, `${prefix}${safeTimestamp()}.json`);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, text, 'utf8');
  fs.renameSync(tempPath, filePath);

  if (isAuto) {
    const backups = listBackups(dir);
    backups.slice(AUTO_BACKUP_KEEP).forEach(item => {
      try { fs.unlinkSync(item.fullPath); } catch {}
    });
  }

  return { ok: true, created: true, path: filePath };
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

function sendShortcut(action) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('ananda-shortcut', action);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f3f7fa',
    icon: path.join(__dirname, 'ananda-icon.ico'),
    autoHideMenuBar: true,
    show: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!input || (input.type && !String(input.type).toLowerCase().includes('keydown'))) return;
    const key = String(input.key || '').toLowerCase();
    const code = String(input.code || '');
    const altSave = !!input.alt && !input.control && !input.meta && key === 's';
    const plus = !input.alt && !input.control && !input.meta && (
      input.key === '+' || code === 'NumpadAdd' || (code === 'Equal' && !!input.shift) || (input.key === '=' && !!input.shift)
    );
    if (altSave) {
      event.preventDefault();
      sendShortcut('save');
    } else if (plus) {
      event.preventDefault();
      sendShortcut('add');
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(`ANANDA SANGHA GURGAON Event Desk — Phase 2 ${APP_VERSION}`);
  });
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setSkipTaskbar(false);
  });
  mainWindow.on('restore', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('ananda-native-print-html', async (_event, payload) => {
  const html = payload && typeof payload.html === 'string' ? payload.html : '';
  if (!html) return { ok: false, error: 'Nothing to print.' };
  let printWindow = null;
  try {
    printWindow = new BrowserWindow({
      width: 820,
      height: 700,
      show: false,
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await printWindow.loadURL(dataUrl);
    const result = await new Promise((resolve) => {
      printWindow.webContents.print(
        { silent: false, printBackground: true },
        (success, failureReason) => resolve(success ? { ok: true } : { ok: false, error: failureReason || 'Printing was cancelled or failed.' })
      );
    });
    return result;
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.close();
  }
});

ipcMain.handle('ananda-open-data-folder', async () => {
  try {
    fs.mkdirSync(DATA_ROOT, { recursive: true });
    const error = await shell.openPath(DATA_ROOT);
    return error ? { ok: false, error } : { ok: true, path: DATA_ROOT };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('ananda-open-backup-folder', async () => {
  try {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const error = await shell.openPath(BACKUP_ROOT);
    return error ? { ok: false, error } : { ok: true, path: BACKUP_ROOT };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('ananda-data-location', async () => ({ ok: true, path: DATA_ROOT, root: ROOT_DIR, backup: BACKUP_ROOT }));
ipcMain.handle('ananda-auto-backup-state', async (_event, payload) => {
  try { return writeBackup(payload, 'auto'); }
  catch (error) { return { ok: false, error: error && error.message ? error.message : String(error) }; }
});
ipcMain.handle('ananda-manual-backup-state', async (_event, payload) => {
  try { return writeBackup(payload, 'manual'); }
  catch (error) { return { ok: false, error: error && error.message ? error.message : String(error) }; }
});


let attendancePhoneServer = null;
let attendancePhoneServerInfo = null;

function localIpv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const item of (list || [])) {
      if (item && item.family === 'IPv4' && !item.internal && item.address) return item.address;
    }
  }
  return '127.0.0.1';
}

function stopAttendancePhoneServer() {
  return new Promise(resolve => {
    if (!attendancePhoneServer) {
      attendancePhoneServerInfo = null;
      return resolve({ ok: true, stopped: false });
    }
    const srv = attendancePhoneServer;
    attendancePhoneServer = null;
    attendancePhoneServerInfo = null;
    srv.close(() => resolve({ ok: true, stopped: true }));
    setTimeout(() => resolve({ ok: true, stopped: true }), 800);
  });
}

function phoneUploadHtml() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ananda Attendance Upload</title><style>
  body{font-family:Arial,sans-serif;background:#f3f7fa;color:#123f7d;margin:0;padding:22px}
  .box{max-width:520px;margin:28px auto;background:white;border:1px solid #dce6ef;border-radius:16px;padding:22px;box-shadow:0 8px 28px rgba(16,45,94,.08)}
  h2{margin:0 0 8px}.muted{color:#65798e;font-size:14px;line-height:1.45}.btn{display:block;width:100%;margin-top:16px;border:0;border-radius:10px;background:#123f7d;color:white;padding:14px;font-weight:700;font-size:16px}
  input{width:100%;margin-top:14px}#status{margin-top:14px;font-weight:700}
  </style></head><body><div class="box"><h2>Ananda Class Attendance</h2><div class="muted">Take a photo of the completed attendance sheet or choose it from your phone. The QR on the sheet identifies the class, batch and date automatically.</div><input id="file" type="file" accept="image/*" capture="environment"><button id="send" class="btn">Upload Attendance Sheet</button><div id="status"></div></div><script>
  const f=document.getElementById('file'),s=document.getElementById('status');
  document.getElementById('send').onclick=()=>{const file=f.files&&f.files[0];if(!file){s.textContent='Choose or take a photo first.';return}const reader=new FileReader();reader.onload=async()=>{s.textContent='Uploading…';try{const res=await fetch('/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name||'attendance.jpg',dataUrl:reader.result})});const out=await res.json();s.textContent=out.ok?'Uploaded. You can return to the laptop.':(out.error||'Upload failed.')}catch(e){s.textContent='Upload failed. Keep the phone and laptop on the same Wi-Fi/hotspot.'}};reader.readAsDataURL(file)};</script></body></html>`;
}

ipcMain.handle('ananda-start-attendance-phone-server', async () => {
  if (attendancePhoneServer && attendancePhoneServerInfo) return attendancePhoneServerInfo;
  try {
    attendancePhoneServer = http.createServer((req, res) => {
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        const html = phoneUploadHtml();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(html);
      }
      if (req.method === 'POST' && req.url === '/upload') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 25 * 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            if (!payload.dataUrl || !/^data:image\//i.test(payload.dataUrl)) throw new Error('Please upload an image.');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ananda-attendance-phone-upload', {
                name: String(payload.name || 'attendance.jpg'),
                dataUrl: payload.dataUrl,
                receivedAt: new Date().toISOString()
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: error.message || String(error) }));
          }
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });
    await new Promise((resolve, reject) => {
      attendancePhoneServer.once('error', reject);
      attendancePhoneServer.listen(0, '0.0.0.0', resolve);
    });
    const address = attendancePhoneServer.address();
    const port = address && address.port;
    const ip = localIpv4();
    attendancePhoneServerInfo = { ok: true, url: `http://${ip}:${port}/`, ip, port };
    return attendancePhoneServerInfo;
  } catch (error) {
    attendancePhoneServer = null;
    attendancePhoneServerInfo = null;
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
});

ipcMain.handle('ananda-stop-attendance-phone-server', async () => stopAttendancePhoneServer());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { try { attendancePhoneServer?.close(); } catch {} });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

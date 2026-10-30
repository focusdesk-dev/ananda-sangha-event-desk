const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const APP_ID = 'org.anandasangha.gurgaon.eventdesk';
const APP_VERSION = '2.0.0-beta.5.34';
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

// BETA59 PRINT PREVIEW
let anandaPrintPreviewWindow=null;
let anandaPrintPreviewFile='';
// BETA523 TRUE PAGE BY PAGE PREVIEW
// BETA522 PREVIEW FAILSAFE
// BETA521 APPROVED LANDSCAPE PREVIEW
function anandaDecoratePrintPreview(source){
  const addon=`<style>.ananda-preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;position:fixed;z-index:999999;left:0;right:0;top:0;height:58px;padding:0 18px;background:#123f7d;color:#fff;font-family:Arial,sans-serif;box-shadow:0 2px 12px #0002}.ananda-preview-toolbar .group{display:flex;align-items:center;gap:8px}.ananda-preview-toolbar button{border:1px solid #d9e7f5;background:#fff;color:#123f7d;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.ananda-preview-toolbar button.primary{background:#1762c4;color:#fff;border-color:#1762c4}.ananda-preview-counter{min-width:70px;text-align:center;font-weight:700}@media screen{body{background:#e9eef4!important;padding:76px 24px 30px!important}.ananda-preview-page{display:none;position:relative;margin:0 auto 24px!important}.ananda-preview-page.ananda-preview-page-active{display:block}.sheet{display:block!important;background:#fff;margin:0!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22;transform-origin:top left}.sheet.ananda-preview-active{outline:2px solid #1762c4;outline-offset:2px}}@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.ananda-preview-page{display:block!important;width:auto!important;height:auto!important;margin:0!important;page-break-after:always}.ananda-preview-page:last-of-type{page-break-after:auto}.sheet{display:block!important;box-shadow:none!important;outline:none!important;transform:none!important;zoom:1!important;width:297mm!important;height:210mm!important;margin:0!important}}</style><div class='ananda-preview-toolbar'><div class='group'><strong>CLASS ATTENDANCE PRINT PREVIEW</strong></div><div class='group'><button id='anandaPrev'>Previous</button><span id='anandaCounter' class='ananda-preview-counter'></span><button id='anandaNext'>Next</button></div><div class='group'><button id='anandaSave'>Save PDF</button><button id='anandaPrint' class='primary'>Print</button><button id='anandaClose'>Close</button></div></div><script>(function(){const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter'),pages=[];let idx=0;function prepare(){sheets.forEach(s=>{const w=document.createElement('div');w.className='ananda-preview-page';s.parentNode.insertBefore(w,s);w.appendChild(s);pages.push(w)})}function fitCurrent(){const s=sheets[idx],w=pages[idx];if(!s||!w)return;s.style.transform='none';const bw=s.offsetWidth||1123,bh=s.offsetHeight||794,available=Math.max(360,window.innerWidth-48),scale=Math.min(1,available/Math.max(1,bw));s.style.transform='scale('+scale+')';s.style.transformOrigin='top left';w.style.width=(bw*scale)+'px';w.style.height=(bh*scale)+'px'}function show(scroll){pages.forEach((p,i)=>p.classList.toggle('ananda-preview-page-active',i===idx));sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;requestAnimationFrame(()=>{fitCurrent();if(scroll&&pages[idx])pages[idx].scrollIntoView({behavior:'smooth',block:'start'})})}prepare();show(false);window.addEventListener('resize',()=>requestAnimationFrame(fitCurrent));document.getElementById('anandaPrev').onclick=()=>{if(idx>0){idx--;show(true)}};document.getElementById('anandaNext').onclick=()=>{if(idx<sheets.length-1){idx++;show(true)}};document.getElementById('anandaPrint').onclick=()=>location.href='ananda-preview://print';document.getElementById('anandaSave').onclick=()=>location.href='ananda-preview://save';document.getElementById('anandaClose').onclick=()=>location.href='ananda-preview://close';show()})();</script>`;
  return /<\/body>/i.test(source)?source.replace(/<\/body>/i,addon+'</body>'):source+addon
}
ipcMain.handle('ananda-native-print-html',async(_event,payload)=>{
  const html=payload&&typeof payload.html==='string'?payload.html:'';if(!html)return{ok:false,error:'Nothing to preview.'};
  try{
    if(anandaPrintPreviewWindow&&!anandaPrintPreviewWindow.isDestroyed())anandaPrintPreviewWindow.close();
    // BETA515 PRINT PREVIEW DATA URL FIX
    // Do not depend on a temporary HTML file in Documents/OneDrive/System/Session.
    // Loading the decorated preview directly avoids ERR_FILE_NOT_FOUND when that
    // folder is unavailable, synchronised, cleaned, or not yet created.
    const previewHtml=anandaDecoratePrintPreview(html);
    const previewDataUrl='data:text/html;charset=utf-8,'+encodeURIComponent(previewHtml);
    const win=new BrowserWindow({width:1120,height:860,minWidth:900,minHeight:650,show:false,autoHideMenuBar:true,parent:mainWindow||undefined,icon:path.join(__dirname,'ananda-icon.ico'),webPreferences:{contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;
    win.webContents.on('will-navigate',async(event,url)=>{if(!String(url).startsWith('ananda-preview://'))return;event.preventDefault();const action=new URL(url).hostname;if(action==='close'){win.close();return}if(action==='print'){win.webContents.print({silent:false,printBackground:true,landscape:true},()=>{});return}if(action==='save'){try{const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});const result=await dialog.showSaveDialog(win,{title:'Save QR Attendance Sheet as PDF',defaultPath:path.join(app.getPath('documents'),'Ananda_QR_Attendance_'+safeTimestamp()+'.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});if(!result.canceled&&result.filePath)fs.writeFileSync(result.filePath,pdf)}catch{}}});
    win.on('closed',()=>{if(anandaPrintPreviewWindow===win)anandaPrintPreviewWindow=null});
    await win.loadURL(previewDataUrl);win.show();win.focus();return{ok:true,preview:true}
  }catch(error){return{ok:false,error:error&&error.message?error.message:String(error)}}
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


// BETA510 UNIFIED ATTENDANCE PHONE SERVER
let anandaAttendanceServer=null;
let anandaAttendanceServerInfo=null;
// BETA516 COMPACT PRINTED QR
const anandaAttendanceSheetMeta=new Map();
const anandaQrCrypto=require('crypto');
const anandaAiQrSecretPath=path.join(SYSTEM_ROOT,'ai-sheet-qr-secret.bin');
function anandaAiQrToken(sheetId,verify) {
  if(!fs.existsSync(anandaAiQrSecretPath)) {
    const tmp=anandaAiQrSecretPath+'.tmp';
    fs.writeFileSync(tmp,anandaQrCrypto.randomBytes(32),{mode:0o600});
    fs.renameSync(tmp,anandaAiQrSecretPath);
  }
  const key=fs.readFileSync(anandaAiQrSecretPath);
  return anandaQrCrypto.createHmac('sha256',key).update(String(sheetId)+'|'+String(verify)).digest('hex');
}

// BETA534: Short, human-camera-readable AI QRs.
// Each QR holds a sheet ID + a 128-bit HMAC, never the entire class metadata.
// Metadata is persisted so a previously printed sheet still works after restart.
const ANANDA_SHORT_QR_PATH=path.join(SYSTEM_ROOT,'attendance-qr-sheet-links.json');
function anandaShortQrRecords(){
  try {
    const p=JSON.parse(fs.readFileSync(ANANDA_SHORT_QR_PATH,'utf8'));
    return p&&typeof p==='object'&&!Array.isArray(p)?p:{};
  }catch{return{}}
}
function anandaRegisterShortQr(meta){
  const p=JSON.parse(String(meta?.payload||'{}'));
  const id=String(p.sheetId||'');
  if(!/^[A-Za-z0-9_-]{8,64}$/.test(id)||!p.verify||!p.batchId||!p.date||meta.mode!=='ai')
    throw new Error('Cannot register an incomplete signed AI attendance sheet.');
  const records=anandaShortQrRecords();
  records[id]={
    payload:String(meta.payload),sheetId:id,mode:'ai',
    course:String(meta.course||'').slice(0,120),batch:String(meta.batch||'').slice(0,120),
    date:String(meta.date||'').slice(0,80),sheet:Number(p.sheet||1),total:Number(p.totalSheets||1),
    createdAt:new Date().toISOString()
  };
  const keys=Object.keys(records);
  // Keep the latest 3,000 QR links on this computer.
  if(keys.length>3000)keys.sort((a,b)=>String(records[a]?.createdAt||'').localeCompare(String(records[b]?.createdAt||'')))
    .slice(0,keys.length-3000).forEach(x=>delete records[x]);
  fs.mkdirSync(SYSTEM_ROOT,{recursive:true});
  const tmp=ANANDA_SHORT_QR_PATH+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(records),'utf8');
  fs.renameSync(tmp,ANANDA_SHORT_QR_PATH);
  return id;
}
function anandaResolveShortQr(u){
  const id=u.searchParams.get('x')||'';
  const code=u.searchParams.get('k')||'';
  if(!/^[A-Za-z0-9_-]{8,64}$/.test(id)||!code)return null;
  const meta=anandaShortQrRecords()[id];
  if(!meta||meta.mode!=='ai'||String(meta.sheetId)!==id)return null;
  return anandaCheckQrSignature(u,meta)?meta:null;
}
function anandaCheckQrSignature(u,meta){
  if(!meta)return false;
  const aiMode=meta?.mode==='ai'||u.searchParams.get('m')==='ai';
  if(!aiMode)return true;
  try {
    const p=JSON.parse(meta.payload||'{}');
    const id=String(meta.sheetId||u.searchParams.get('x')||'');
    const verify=String(p.verify||u.searchParams.get('v')||'');
    const received=String(u.searchParams.get('k')||'');
    if(!id||!verify||![32,64].includes(received.length)||!/^[a-f0-9]+$/i.test(received))return false;
    const expected=anandaAiQrToken(id,verify).slice(0,received.length);
    return anandaQrCrypto.timingSafeEqual(Buffer.from(received.toLowerCase()),Buffer.from(expected));
  }catch{return false}
}
function anandaCompactAttendanceMeta(u){
  try{
    // QR with only Sheet ID and signature. Persistent mapping makes this
    // printable without API credits and valid across app restarts.
    if(u.searchParams.get('x')&&!u.searchParams.get('b'))return anandaResolveShortQr(u);
    const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'',sheetId=u.searchParams.get('x')||'',layout=u.searchParams.get('l')||'';
    if(!b||!/^\d{8}$/.test(d8)||!verify)return null;
    const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify,sheetId,layout].join('|');
    const remembered=anandaAttendanceSheetMeta.get(key);if(remembered)return remembered;
    const payload=JSON.stringify({v:layout==='A4L30V2'?5:(layout==='A4L40'?4:(layout==='A4L30'?3:(sheetId?2:1))),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});
    return{payload,date,sheet,total,sheetId,mode:u.searchParams.get('m')==='ai'?'ai':'offline'}
  }catch{return null}
}
function anandaAttendanceIp(){
  const nets=os.networkInterfaces(),candidates=[];
  for(const group of Object.values(nets))for(const n of group||[]){
    const ipv4=n&&(n.family==='IPv4'||n.family===4),a=String(n?.address||'');
    if(!ipv4||n.internal||!a||a==='0.0.0.0'||a==='127.0.0.1'||a.startsWith('169.254.'))continue;
    let priority=9;if(a.startsWith('192.168.'))priority=1;else if(a.startsWith('10.'))priority=2;else{const mt=/^172\.(\d+)\./.exec(a);if(mt&&Number(mt[1])>=16&&Number(mt[1])<=31)priority=3}candidates.push({a,priority})
  }
  candidates.sort((x,y)=>x.priority-y.priority);return candidates[0]?.a||''
}
function anandaB64UrlEncode(obj){return Buffer.from(JSON.stringify(obj),'utf8').toString('base64url')}
function anandaB64UrlDecode(text){try{return JSON.parse(Buffer.from(String(text||''),'base64url').toString('utf8'))}catch{return null}}
function anandaMobilePage(meta,encoded){
  // BETA520 A4L40 SHEET LINK
  // BETA519 LANDSCAPE SHEET LINK
  // BETA518 SHEET ID + PHONE CLOSE
  // BETA517 PHONE CLASS DATE
  // BETA511 APPROVED MOBILE LOGO
  let logoData='';try{logoData='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'logo-128.png')).toString('base64')}catch{}
  const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=!!(meta&&meta.payload),course=safe(meta?.course||''),batch=safe(meta?.batch||''),date=safe(meta?.date||'');
  const aiMode=meta?.mode==='ai';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ananda Attendance Sheet</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#0d3979;background:radial-gradient(circle at 50% 22%,rgba(255,226,81,.30) 0 14%,rgba(255,226,81,.10) 15% 27%,transparent 28%),radial-gradient(circle at 50% 45%,#fff 0 40%,#f3f8fd 72%,#e8f2fb 100%);overflow-x:hidden}.halo{position:fixed;left:50%;top:-18vw;width:130vw;height:130vw;transform:translateX(-50%);border-radius:50%;border:13vw solid rgba(255,211,36,.10);box-shadow:0 0 80px rgba(255,205,38,.12);pointer-events:none}.mountains{position:fixed;left:0;right:0;bottom:0;height:19vh;background:linear-gradient(155deg,transparent 0 28%,rgba(165,198,230,.16) 29% 47%,transparent 48%),linear-gradient(205deg,transparent 0 31%,rgba(106,158,208,.12) 32% 55%,transparent 56%);pointer-events:none}.wrap{position:relative;z-index:1;width:min(92vw,520px);margin:0 auto;padding:calc(24px + env(safe-area-inset-top)) 0 28px}.brand{text-align:center;margin:12px 0 22px}.logo{width:92px;height:92px;border-radius:50%;margin:0 auto 14px;box-shadow:0 0 28px rgba(255,204,35,.42);overflow:hidden}.logo img{width:100%;height:100%;display:block;object-fit:cover}.brand h1{margin:0;font-size:21px;letter-spacing:1.5px}.card{background:rgba(255,255,255,.90);border:1px solid rgba(203,221,238,.85);border-radius:24px;padding:22px;box-shadow:0 18px 50px rgba(20,61,112,.10);backdrop-filter:blur(8px)}h2{font-size:26px;margin:0 0 17px;text-align:center}.details{background:linear-gradient(135deg,#fff9e8,#f6fbff);border:1px solid #f0e3b6;border-radius:16px;padding:14px 16px;margin-bottom:18px;display:${has?'block':'none'}}.details b{display:block;font-size:16px;margin:4px 0}.details span{font-size:13px;color:#62778d}.btn{width:100%;min-height:58px;border-radius:14px;border:1px solid #b9cee3;background:#fff;color:#103f80;font-size:16px;font-weight:800;margin-top:12px}.btn.primary{border-color:#0d55a7;background:linear-gradient(135deg,#0e4a91,#0b63ba);color:#fff;box-shadow:0 8px 18px rgba(15,77,145,.16)}.or{display:flex;align-items:center;gap:10px;color:#687d92;font-size:13px;margin:14px 0 0}.or:before,.or:after{content:'';height:1px;background:#cbd9e6;flex:1}.hidden{display:none!important}.preview img{width:100%;max-height:52vh;object-fit:contain;border-radius:15px;border:1px solid #d9e5ef;background:#eef3f7}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.status{text-align:center;padding:34px 8px}.check{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;background:#e4f6e9;color:#168541;font-size:46px;font-weight:900}.spinner{width:54px;height:54px;border-radius:50%;border:6px solid #d6e4f1;border-top-color:#0d55a7;margin:15px auto;animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.bar{height:9px;border-radius:999px;background:#dce8f3;overflow:hidden;margin-top:20px}.bar:after{content:'';display:block;width:45%;height:100%;background:#0d55a7;border-radius:inherit;animation:load 1.2s ease-in-out infinite alternate}@keyframes load{to{transform:translateX(120%)}}small.note{display:block;text-align:center;color:#6a7f93;margin-top:12px;line-height:1.4}
  </style></head><body><div class="halo"></div><div class="mountains"></div><main class="wrap"><div class="brand"><div class="logo"><img src="${logoData}" alt="Ananda Sangha"></div><h1>ANANDA SANGHA</h1></div><section id="pick" class="card"><h2>${aiMode?"AI Attendance Sheet":"Attendance Sheet"}</h2><div class="details"><b>${course}${course&&batch?' · ':''}${batch}</b><span>${date}${meta?.sheet?' · Sheet '+safe(meta.sheet)+' of '+safe(meta.total||1):''}</span></div><p style="font-size:13px;text-align:center;color:#37618b">${aiMode?'AI analysis will start automatically on the laptop after upload. A volunteer must review the marks before saving.':'Take a clear full-page photo of the marked attendance sheet.'}</p><button id="take" class="btn primary">TAKE PHOTO</button><div class="or">or</div><button id="choose" class="btn">CHOOSE FROM PHOTOS</button><input id="camera" class="hidden" type="file" accept="image/*" capture="environment"><input id="gallery" class="hidden" type="file" accept="image/*"></section><section id="preview" class="card preview hidden"><h2>Preview Photo</h2><img id="photo"><label style="display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.4;margin-top:12px"><input type="checkbox" id="aiConsent" style="width:20px;height:20px;flex:none"><span>I have permission to send this attendance photo to the NGO computer${aiMode?' and OpenAI for AI analysis':''}. A volunteer will verify the result.</span></label><div class="row"><button id="retake" class="btn">RETAKE</button><button id="use" class="btn primary">USE PHOTO</button></div></section><section id="uploading" class="card status hidden"><div class="spinner"></div><h2>Uploading Attendance Sheet…</h2><div class="bar"></div><small class="note">Keep this phone and the laptop on the same Wi-Fi or hotspot.</small></section><section id="done" class="card status hidden"><div class="check">✓</div><h2>Photo Received</h2><p>${aiMode?'AI analysis has been requested on the NGO computer. The volunteer will check and save attendance.':'The photo has been received for review on the NGO computer.'}</p><div class="details" style="display:${has?'block':'none'}"><b>${course}${course&&batch?' · ':''}${batch}</b><span>${date}</span></div><button id="another" class="btn primary">UPLOAD ANOTHER SHEET</button><button id="close" class="btn">CLOSE</button></section></main><script>
  const a=${JSON.stringify(encoded||'')};let selected=null;const $=id=>document.getElementById(id),show=id=>['pick','preview','uploading','done'].forEach(x=>$(x).classList.toggle('hidden',x!==id));
  $('take').onclick=()=>$('camera').click();$('choose').onclick=()=>$('gallery').click();
  function selectedFile(f){if(!f)return;selected=f;$('photo').src=URL.createObjectURL(f);show('preview')}
  // BETA535: Resize large camera photos before IPC transfer to keep desktop responsive.
  async function anandaOptimiseUploadPhoto(f){
    let image=null,url='';
    try{
      if(typeof createImageBitmap==='function')image=await createImageBitmap(f);
      else{
        url=URL.createObjectURL(f);
        image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Cannot open the photo'));img.src=url});
      }
      const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
      const ratio=Math.min(1,2200/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const result=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Photo compression failed')),'image/jpeg',0.85));
      canvas.width=0;canvas.height=0;
      return result;
    }finally{image?.close?.();if(url)URL.revokeObjectURL(url)}
  }$('camera').onchange=e=>selectedFile(e.target.files?.[0]);$('gallery').onchange=e=>selectedFile(e.target.files?.[0]);$('retake').onclick=()=>{$('camera').value='';$('camera').click()};
  $('use').onclick=async()=>{if(!selected)return;if(!$('aiConsent').checked){alert('Please confirm permission before uploading the photo.');return;}show('uploading');try{const optimised=await anandaOptimiseUploadPhoto(selected);const fd=new FormData();fd.append('sheet',optimised,'attendance.jpg');const res=await fetch('/upload'+window.location.search,{method:'POST',body:fd});if(!res.ok)throw Error(await res.text());show('done')}catch(e){alert('Upload failed. Keep the phone and laptop on the same Wi-Fi or hotspot.');show('preview')}};
  $('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{try{window.open('','_self');window.close()}catch{}setTimeout(()=>{if(document.hidden)return;try{if(history.length>1){history.back();return}}catch{}try{location.replace('about:blank')}catch{}},250)};
  </script></body></html>`
}
function anandaMultipartFile(buf,contentType){
  const m=/boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType||'');if(!m)return null;const boundary=Buffer.from('--'+(m[1]||m[2]).trim());let pos=buf.indexOf(boundary);
  while(pos>=0){const headerStart=pos+boundary.length+2,headerEnd=buf.indexOf(Buffer.from('\r\n\r\n'),headerStart);if(headerEnd<0)break;const header=buf.slice(headerStart,headerEnd).toString('utf8'),fileMatch=/filename="([^"]*)"/i.exec(header),typeMatch=/Content-Type:\s*([^\r\n]+)/i.exec(header),dataStart=headerEnd+4,next=buf.indexOf(boundary,dataStart);if(fileMatch&&next>dataStart)return{name:fileMatch[1]||'attendance.jpg',mime:(typeMatch?.[1]||'image/jpeg').trim(),data:buf.slice(dataStart,next-2)};pos=buf.indexOf(boundary,pos+boundary.length)}return null
}
async function anandaEnsureAttendanceServer(){
  const ip=anandaAttendanceIp();if(!ip)return{ok:false,error:'Connect this laptop to Wi-Fi or to the phone hotspot first.'};
  if(anandaAttendanceServer&&anandaAttendanceServerInfo){anandaAttendanceServerInfo.ip=ip;anandaAttendanceServerInfo.baseUrl='http://'+ip+':'+anandaAttendanceServerInfo.port+'/';return anandaAttendanceServerInfo}
  try{
    anandaAttendanceServer=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://local/'),encoded=u.searchParams.get('a')||'';let meta=anandaB64UrlDecode(encoded);if(!meta)meta=anandaCompactAttendanceMeta(u);
      if(u.searchParams.has('k')&&!anandaCheckQrSignature(u,meta)){
        res.writeHead(403,{'Content-Type':'text/plain; charset=utf-8'});return res.end('This AI attendance QR is invalid or was printed by a different computer.');
      }
      if(req.method==='GET'){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('ananda-attendance-phone-status',{status:'connected',remoteAddress:req.socket?.remoteAddress||''});res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(anandaMobilePage(meta,encoded))}
      if(req.method==='POST'&&u.pathname==='/upload'){
        const aiMode=(meta?.mode==='ai'||u.searchParams.get('m')==='ai');
        if(aiMode){
          if(!anandaCheckQrSignature(u,meta)){
            res.writeHead(403,{'Content-Type':'text/plain'});return res.end('This AI attendance QR could not be verified.');
          }
          // Allow signed QR photo uploads before an API key is purchased.
          // The desktop queues the photo. No paid AI request is made without a key.
        }
        const chunks=[];let size=0,tooBig=false;req.on('data',c=>{size+=c.length;if(size>25*1024*1024){tooBig=true;req.destroy()}else chunks.push(c)});req.on('end',()=>{if(tooBig)return;const file=anandaMultipartFile(Buffer.concat(chunks),req.headers['content-type']);if(!file){res.writeHead(400);return res.end('No image received')}if(!/^image\/(jpeg|png|webp)$/i.test(file.mime) || !file.data.length){res.writeHead(415);return res.end('Only JPG, PNG and WebP attendance photos are supported.')}
        const dataUrl='data:'+file.mime+';base64,'+file.data.toString('base64');if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.webContents.send('ananda-attendance-phone-status',{status:'received'});mainWindow.webContents.send('ananda-attendance-phone-upload',{name:file.name,mime:file.mime,dataUrl,attendancePayload:meta?.payload||'',sheet:meta?.sheet||1,total:meta?.total||1,mode:aiMode?'ai':'offline',sheetId:meta?.sheetId||u.searchParams.get('x')||''})}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}))});return}
      res.writeHead(404);res.end('Not found')
    }catch(e){res.writeHead(500);res.end('Upload error')}});
    await new Promise((resolve,reject)=>{anandaAttendanceServer.once('error',reject);anandaAttendanceServer.listen(8787,resolve)}).catch(async()=>{await new Promise((resolve,reject)=>{anandaAttendanceServer.once('error',reject);anandaAttendanceServer.listen(0,resolve)})});
    const port=anandaAttendanceServer.address().port;anandaAttendanceServerInfo={ok:true,ip,port,baseUrl:'http://'+ip+':'+port+'/'};return anandaAttendanceServerInfo
  }catch(error){try{anandaAttendanceServer?.close()}catch{}anandaAttendanceServer=null;anandaAttendanceServerInfo=null;return{ok:false,error:error?.message||String(error)}}
}
ipcMain.handle('ananda-attendance-start-upload-server',async()=>{const s=await anandaEnsureAttendanceServer();return s.ok?{...s,url:s.baseUrl}:s});
ipcMain.handle('ananda-attendance-prepare-sheet-link',async(_event,meta)=>{
  const s=await anandaEnsureAttendanceServer();if(!s.ok)return s;
  try{
    const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||''),sheetId=String(p.sheetId||''),layout=String(p.layout||'');
    if(b&&/^\d{8}$/.test(d8)&&verify){
      const key=[b,d8,sheet,total,verify,sheetId,layout].join('|');anandaAttendanceSheetMeta.set(key,meta||{});
      const mode=meta?.mode==='ai'?'ai':'offline';
      // Printing a signed phone QR does not require a paid API key.
      // The key is required only when the desktop submits the photo for analysis.
      if(mode==='ai'&&!sheetId)return{ok:false,error:'AI attendance needs a valid Sheet ID.'};
      if(mode==='ai'){
        anandaRegisterShortQr(meta);
        // 128-bit HMAC is sufficient against forgery, 32 characters instead of 64.
        const tag=anandaAiQrToken(sheetId,verify).slice(0,32);
        const q=new URLSearchParams({x:sheetId,k:tag}).toString();
        return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?'+q};
      }
      const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify,...(sheetId?{x:sheetId}:{}),...(layout?{l:layout}:{})}).toString();
      return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?'+q}
    }
  }catch{}
  const encoded=anandaB64UrlEncode(meta||{});return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?a='+encodeURIComponent(encoded)}
});
ipcMain.handle('ananda-attendance-stop-upload-server',async()=>({ok:true,persistent:true}));


// BETA530: AI attendance integration. API credentials never enter web/localStorage
// or the packaged source. Windows safeStorage encrypts the per-machine key.
const { safeStorage } = require('electron');
const AI_CREDENTIAL_PATH = path.join(SYSTEM_ROOT, 'ai-api-key.bin');
function anandaReadAiKey() {
  try {
    if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(AI_CREDENTIAL_PATH)) return '';
    return safeStorage.decryptString(fs.readFileSync(AI_CREDENTIAL_PATH));
  } catch { return ''; }
}
ipcMain.handle('ananda-ai-status', async () => ({
  ok: true,
  configured: Boolean(anandaReadAiKey()),
  secureStorage: safeStorage.isEncryptionAvailable()
}));
ipcMain.handle('ananda-ai-set-key', async (_event, key) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Protected credential storage is unavailable on this PC.');
    const value = String(key || '').trim();
    if (!/^sk-[a-zA-Z0-9_-]{15,250}$/.test(value)) throw new Error('Enter a valid OpenAI API key (beginning sk-).');
    const encrypted = safeStorage.encryptString(value);
    fs.mkdirSync(SYSTEM_ROOT, { recursive: true });
    const tmp = AI_CREDENTIAL_PATH + '.tmp';
    fs.writeFileSync(tmp, encrypted, { mode: 0o600 });
    fs.renameSync(tmp, AI_CREDENTIAL_PATH);
    return { ok: true, configured: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Unable to save your API key.' };
  }
});

// Settings -> AI configuration: change is handled by ananda-ai-set-key, which
// overwrites the previous encrypted credential without touching NGO records.
ipcMain.handle('ananda-ai-remove-key', async () => {
  try {
    if (fs.existsSync(AI_CREDENTIAL_PATH)) fs.unlinkSync(AI_CREDENTIAL_PATH);
    return {ok:true,configured:false};
  } catch(err){return {ok:false,error:err?.message||'Could not remove the AI key.'};}
});
ipcMain.handle('ananda-ai-free-preflight', async () => {
  // Local dry-run only. No network request and no API credit consumption.
  try {
    const keyStorage = safeStorage.isEncryptionAvailable();
    const storage = fs.existsSync(SYSTEM_ROOT) && fs.statSync(SYSTEM_ROOT).isDirectory();
    const demoRows = [1,4,6,9,15,16,20,24,26,30], allowed = Array.from({length:30},(_,i)=>i+1);
    const detected = new Set(demoRows);
    const good = demoRows.every(x=>allowed.includes(x)) && detected.size===demoRows.length
       && allowed.filter(x=>!detected.has(x)).length===20;
    return {ok:keyStorage&&storage&&good,keyStorage,storage,offlineMappingTest:good,
      message:'This is a free local check. It does NOT contact OpenAI or prove photo-recognition accuracy.'};
  }catch(err){return{ok:false,error:err?.message||'Preflight failed.'};}
});
ipcMain.handle('ananda-ai-test-connection',async()=>{
  try {
    const key=anandaReadAiKey();
    if(!key)throw new Error('No API key is saved on this PC.');
    const response=await fetch('https://api.openai.com/v1/models/gpt-4.1',{
      headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)
    });
    if(!response.ok){
      let details='HTTP '+response.status;
      try{const b=await response.json();details=String(b?.error?.message||details).slice(0,300);}catch{}
      throw new Error(details);
    }
    return {ok:true,message:'API key authenticated and model endpoint reachable. No photo was analysed; image-processing accuracy is not tested.'};
  }catch(err){
    return {ok:false,error:err?.name==='TimeoutError'?'Connection timed out. Check internet access.':String(err?.message||err)};
  }
});
ipcMain.handle('ananda-ai-analyze-attendance', async (_event, body) => {
  try {
    const key = anandaReadAiKey();
    if (!key) throw new Error('Please set your OpenAI API key first.');
    const image = String(body?.imageDataUrl || '');
    const allowed = body?.printedNumbers;
    if (!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 12_000_000)
      throw new Error('Choose a PNG or JPEG attendance photo smaller than approximately 9 MB.');
    if (!Array.isArray(allowed) || !allowed.length || allowed.length > 30
        || allowed.some(n => !Number.isInteger(n) || n < 1 || n > 9999)
        || new Set(allowed).size !== allowed.length)
      throw new Error('The printed attendance row numbers are invalid.');
    const prompt = [
      'You are a cautious optical mark reader for a PRINTED CLASS ATTENDANCE FORM.',
      'Return ONLY numbers for rows containing clearly visible additional HANDWRITTEN black or dark blue pen strokes in the white ATTENDANCE column.',
      'Ignore names, QR codes, typed content, logos, colored borders, the printed attendance header, and the empty rectangular cell outlines.',
      'Read the visible printed row NUMBER beside each student. Do not predict or assume attendance.',
      'Use uncertain_rows if an ink mark may be present but cannot be distinguished reliably.',
      'Blank attendance cells must never be called Present. The software handles absences separately.',
      'The only valid row numbers on this sheet are: ' + allowed.join(', ') + '.',
      'Respond with present_rows and uncertain_rows arrays of distinct integers; never add a number not in the allowed set.',
      'The sheet may contain two columns, with right-column numbering continuing from the left.'
    ].join('\n');
    const request = {
      model: 'gpt-4.1',
      store: false,
      max_output_tokens: 350,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: image, detail: 'high' }
      ]}],
      text: {format:{type:'json_schema',name:'attendance_marks',strict:true,schema:{
        type:'object',additionalProperties:false,required:['present_rows','uncertain_rows'],
        properties:{present_rows:{type:'array',items:{type:'integer'}},uncertain_rows:{type:'array',items:{type:'integer'}}}
      }}}
    };
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {'Authorization': 'Bearer '+key,'Content-Type':'application/json'},
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(100000)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error('OpenAI API: '+String(json?.error?.message||('HTTP '+resp.status)).slice(0,300));
    const output = (json.output || []).filter(x => x.type === 'message')
      .flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
    if (!output) throw new Error('AI did not return usable attendance results.');
    const parsed = JSON.parse(output);
    if (!Array.isArray(parsed.present_rows) || !Array.isArray(parsed.uncertain_rows))
      throw new Error('AI returned an unexpected attendance format.');
    const valid = new Set(allowed);
    const p = parsed.present_rows, u = parsed.uncertain_rows;
    if ([...p,...u].some(x => !Number.isInteger(x)||!valid.has(x))
        || new Set(p).size !== p.length || new Set(u).size !== u.length
        || p.some(x=>u.includes(x)))
      throw new Error('AI returned inconsistent row numbers. No attendance was changed.');
    return {ok:true,presentRows:p,uncertainRows:u};
  } catch (err) {
    return {ok:false,error:err?.name === 'TimeoutError' ? 'AI request timed out. Try a smaller photo.' : String(err.message||err)};
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { try { anandaAttendanceServer?.close(); } catch {} });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
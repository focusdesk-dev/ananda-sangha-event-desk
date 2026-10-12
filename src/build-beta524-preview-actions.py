from pathlib import Path
import json

mp=Path('src/main.js')
m=mp.read_text(encoding='utf-8')
if 'BETA524 PREVIEW ACTION BRIDGE' in m:
    print('Beta 5.24 preview actions already applied')
    raise SystemExit(0)
if 'BETA523 TRUE PAGE BY PAGE PREVIEW' not in m:
    raise SystemExit('Beta 5.23 page-by-page preview patch missing')

# Replace fragile custom-scheme navigation button actions with a direct,
# isolated preload IPC bridge.
repls = {
"document.getElementById('anandaPrint').onclick=()=>location.href='ananda-preview://print';":
"document.getElementById('anandaPrint').onclick=async()=>{const r=await window.anandaPreview?.print();if(r&&r.ok===false)alert(r.error||'Print failed')};",
"document.getElementById('anandaSave').onclick=()=>location.href='ananda-preview://save';":
"document.getElementById('anandaSave').onclick=async()=>{const r=await window.anandaPreview?.savePdf();if(r&&r.ok===false)alert(r.error||'Save PDF failed')};",
"document.getElementById('anandaClose').onclick=()=>location.href='ananda-preview://close';":
"document.getElementById('anandaClose').onclick=()=>window.anandaPreview?.close();",
"webPreferences:{contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;":
"webPreferences:{preload:path.join(__dirname,'preview-preload.js'),contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;"
}
for old,new in repls.items():
    if old not in m:
        raise SystemExit('Expected preview block missing: '+old[:70])
    m=m.replace(old,new,1)

needle="ipcMain.handle('ananda-native-print-html',async(_event,payload)=>{"
if needle not in m:
    raise SystemExit('Preview IPC insertion point missing')

handler=r"""
// BETA524 PREVIEW ACTION BRIDGE
ipcMain.handle('ananda-preview-action',async(event,action)=>{
  const win=BrowserWindow.fromWebContents(event.sender);
  if(!win||win.isDestroyed())return{ok:false,error:'Preview window is not available.'};
  try{
    if(action==='close'){win.close();return{ok:true}}
    if(action==='print'){
      return await new Promise(resolve=>{
        win.webContents.print({silent:false,printBackground:true,landscape:true},(success,failureReason)=>{
          resolve(success?{ok:true}:{ok:false,error:failureReason||'Printing was cancelled or failed.'})
        })
      })
    }
    if(action==='save'){
      const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});
      const result=await dialog.showSaveDialog(win,{
        title:'Save Class Attendance Sheet as PDF',
        defaultPath:path.join(app.getPath('documents'),'Ananda_Class_Attendance_'+safeTimestamp()+'.pdf'),
        filters:[{name:'PDF',extensions:['pdf']}]
      });
      if(result.canceled||!result.filePath)return{ok:false,canceled:true,error:'Save cancelled.'};
      fs.writeFileSync(result.filePath,pdf);
      return{ok:true,filePath:result.filePath}
    }
    return{ok:false,error:'Unknown preview action.'}
  }catch(error){
    return{ok:false,error:error&&error.message?error.message:String(error)}
  }
});
"""
m=m.replace(needle,handler+"\n"+needle,1)
mp.write_text(m,encoding='utf-8')

# Dedicated, minimal preview bridge.
pp=Path('src/preview-preload.js')
pp.write_text("""const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('anandaPreview', {
  print: () => ipcRenderer.invoke('ananda-preview-action', 'print'),
  savePdf: () => ipcRenderer.invoke('ananda-preview-action', 'save'),
  close: () => ipcRenderer.invoke('ananda-preview-action', 'close')
});
""",encoding='utf-8')

# Ensure preview preload is packaged into app.asar.
pkgp=Path('src/package.json')
pkg=json.loads(pkgp.read_text(encoding='utf-8'))
files=pkg.setdefault('build',{}).setdefault('files',[])
if 'preview-preload.js' not in files:
    files.append('preview-preload.js')
pkgp.write_text(json.dumps(pkg,indent=2)+'\n',encoding='utf-8')

print('BETA 5.24 PREVIEW ACTION BRIDGE APPLIED')

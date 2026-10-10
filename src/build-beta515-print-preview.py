from pathlib import Path

p=Path('src/main.js')
m=p.read_text(encoding='utf-8')

if 'BETA515 PRINT PREVIEW DATA URL FIX' in m:
    print('Beta 5.15 preview fix already applied')
    raise SystemExit(0)

old1="""    anandaPrintPreviewFile=path.join(SESSION_ROOT,'attendance-print-preview.html');fs.writeFileSync(anandaPrintPreviewFile,anandaDecoratePrintPreview(html),'utf8');
    const win=new BrowserWindow({width:1120,height:860,minWidth:900,minHeight:650,show:false,autoHideMenuBar:true,parent:mainWindow||undefined,icon:path.join(__dirname,'ananda-icon.ico'),webPreferences:{contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;"""
new1="""    // BETA515 PRINT PREVIEW DATA URL FIX
    // Do not depend on a temporary HTML file in Documents/OneDrive/System/Session.
    // Loading the decorated preview directly avoids ERR_FILE_NOT_FOUND when that
    // folder is unavailable, synchronised, cleaned, or not yet created.
    const previewHtml=anandaDecoratePrintPreview(html);
    const previewDataUrl='data:text/html;charset=utf-8,'+encodeURIComponent(previewHtml);
    const win=new BrowserWindow({width:1120,height:860,minWidth:900,minHeight:650,show:false,autoHideMenuBar:true,parent:mainWindow||undefined,icon:path.join(__dirname,'ananda-icon.ico'),webPreferences:{contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;"""

old2="""    win.on('closed',()=>{if(anandaPrintPreviewWindow===win)anandaPrintPreviewWindow=null;try{if(anandaPrintPreviewFile&&fs.existsSync(anandaPrintPreviewFile))fs.unlinkSync(anandaPrintPreviewFile)}catch{}});
    await win.loadFile(anandaPrintPreviewFile);win.show();win.focus();return{ok:true,preview:true}"""
new2="""    win.on('closed',()=>{if(anandaPrintPreviewWindow===win)anandaPrintPreviewWindow=null});
    await win.loadURL(previewDataUrl);win.show();win.focus();return{ok:true,preview:true}"""

if old1 not in m:
    raise SystemExit('Preview temp-file creation block not found')
if old2 not in m:
    raise SystemExit('Preview temp-file load block not found')

m=m.replace(old1,new1,1).replace(old2,new2,1)
p.write_text(m,encoding='utf-8')
print('BETA 5.15 PRINT PREVIEW DATA URL FIX APPLIED')

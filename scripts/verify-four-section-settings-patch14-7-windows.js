'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 let p;
 for(let i=0;i<110;i++){
  try{const a=await(await fetch('http://127.0.0.1:9223/json/list')).json();
   p=a.find(x=>x.type==='page'&&/Ananda|index\.html/i.test((x.title||'')+' '+(x.url||'')));
   if(p?.webSocketDebuggerUrl)break;
  }catch{}await pause(230);
 }
 assert(p?.webSocketDebuggerUrl,'Packaged Ananda Windows window unavailable');
 const ws=new WebSocket(p.webSocketDebuggerUrl);
 await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
 const callbacks=new Map();let seq=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),f=callbacks.get(m.id);if(f){callbacks.delete(m.id);f(m)}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq,t=setTimeout(()=>{callbacks.delete(id);reject(Error('Timeout: '+method))},38000);
  callbacks.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result?.exceptionDetails)));else resolve(m.result)});
  ws.send(JSON.stringify({id,method,params}));
 });
 const js=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
 const fn=async f=>js('('+f.toString()+')()');
 try{
  const report=await fn(function(){
   const sidebar=document.querySelector('aside')?.outerHTML;
   const logo=document.querySelector('aside .brand-logo img')?.getAttribute('src');
   document.querySelector('aside [data-page="settings"]')?.click();
   const root=document.getElementById('settings'),home=document.getElementById('v147SettingsHome');
   const direct=[...home.querySelectorAll(':scope > details.v147-setting')];
   const ids=direct.map(x=>x.id),nav=[...document.querySelectorAll('aside nav .nav-btn')].map(b=>b.getAttribute('data-page'));
   const before={version:window.anandaSettingsRamsVersion,
     settingsActive:root.classList.contains('active'),ids,nav,
     labels:direct.map(x=>x.querySelector('summary .v147-setting-title strong')?.textContent),
     allClosed:direct.every(x=>!x.open),
     noAdvanced:!root.textContent.toLowerCase().includes('advanced settings'),
     footer:root.querySelector('footer.v147-settings-footer')?.textContent,
     sidebarSame:sidebar===document.querySelector('aside')?.outerHTML,
     sidebarLogo:logo,
     originalGridRemoved:!root.querySelector(':scope > .grid.two'),
     securityExists:!!root.querySelector('#v147SecurityContent #v52PasswordSettingsForm'),
     securityHandler:typeof document.getElementById('v52PasswordSettingsForm')?.onsubmit==='function',
     minAttendanceControl:!!root.querySelector('#v147ProgressionContent #p2v546Minimum'),
     progressionHandler:typeof document.getElementById('p2v546ProgressionForm')?.onsubmit==='function',
     aiKeyInput:!!root.querySelector('#v147AiContent #p2v532NewKey'),
     apiKeySave:typeof document.getElementById('p2v532ReplaceKey')?.onclick==='function',
     aiUsageInSection:!!root.querySelector('#v147AiContent #p2v537ApiUsage'),
     dataBackup:!!root.querySelector('#v147DataContent #v123BackupSettings'),
     dataRestore:!!root.querySelector('#v147DataContent #v123RestoreSettings'),
     dataFolder:!!root.querySelector('#v147DataContent #v123DataLocation'),
     dataImport:!!root.querySelector('#v147ImportToggle #v87ImportTemplates'),
     resetInDanger:!!root.querySelector('#v147DangerZone #v123ResetSettings'),
     resetButtonSingle:document.querySelectorAll('#v123ResetSettings').length===1,
     resetProtected:typeof document.getElementById('v123ResetSettings')?.onclick==='function'&&
        typeof document.getElementById('v87MasterResetForm')?.onsubmit==='function'&&
        !!document.getElementById('v87ResetPassword'),
     resetInitiallyHidden:!root.querySelector('#v147DangerZone').open,
     uiRendered:parseInt(getComputedStyle(home).width)>400
   };
   direct[0].open=true;
   const securityOpen=direct[0].open;
   direct[1].open=true;
   const queuedSecondOpen=direct[1].open;
   // toggle is asynchronous in Chromium. Additional tests will inspect after await.
   return {...before,securityOpen,queuedSecondOpen};
  });
  await pause(300);
  const accordion=await fn(function(){
    const details=[...document.querySelectorAll('#v147SettingsHome > details.v147-setting')];
    const opened=details.filter(d=>d.open).map(d=>d.id);
    const data=document.getElementById('v147Data');
    data.open=true;
    document.getElementById('v147DangerZone').open=true;
    document.getElementById('v147ImportToggle').open=true;
    const reset=document.getElementById('v123ResetSettings');
    return {opened,dataOpen:data.open,
      dangerVisible:document.getElementById('v147DangerZone').open&&
        getComputedStyle(reset).display!=='none',
      importVisible:document.getElementById('v147ImportToggle').open,
      resetLabel:reset.textContent.trim(),
      resetElementRetained:reset.id==='v123ResetSettings'};
  });
  await pause(350);
  const after=await fn(function(){
   const d=[...document.querySelectorAll('#v147SettingsHome >details.v147-setting')];
   return {openIds:d.filter(x=>x.open).map(x=>x.id),
     sidebarNames:[...document.querySelectorAll('aside nav .nav-btn')].map(b=>b.textContent.trim()),
     dangerWarning:document.querySelector('#v147DangerZone .v147-danger-inner')?.textContent,
     versionFooterLast:document.querySelector('#v147SettingsHome')?.lastElementChild?.classList.contains('v147-settings-footer')};
  });
  console.log(JSON.stringify({report,accordion,after},null,2));
  assert.equal(report.version,'14.7');
  assert.equal(report.settingsActive,true);
  assert.deepEqual(report.ids,['v147Security','v147Progression','v147Ai','v147Data']);
  assert.deepEqual(report.labels,['SECURITY','COURSE PROGRESSION','AI ATTENDANCE','DATA & BACKUP']);
  assert.equal(report.allClosed,true,'Four landing options must be collapsed by default');
  assert.equal(report.noAdvanced,true,'Advanced Settings must be absent');
  assert.equal(report.sidebarSame,true,'Approved frozen sidebar must remain unchanged');
  assert.equal(report.originalGridRemoved,true,'Old Settings grid must not remain duplicated');
  assert.match(report.footer,/ANANDA SANGHA EVENT DESK/);
  for(const name of ['securityExists','securityHandler','minAttendanceControl','progressionHandler','aiKeyInput','apiKeySave',
   'aiUsageInSection','dataBackup','dataRestore','dataFolder','dataImport','resetInDanger','resetButtonSingle',
   'resetProtected','resetInitiallyHidden','uiRendered'])assert.equal(report[name],true,name+' missing');
  assert.equal(report.securityOpen,true);
  assert.equal(report.queuedSecondOpen,true);
  assert.deepEqual(accordion.opened,['v147Progression'],'Only one Settings section may be open');
  assert.equal(accordion.dangerVisible,true);
  assert.equal(accordion.importVisible,true);
  assert.equal(accordion.resetElementRetained,true);
  assert.match(after.dangerWarning,/administrator password/i);
  assert.match(after.dangerWarning,/cannot be undone/i);
  assert.equal(after.versionFooterLast,true);
  assert.deepEqual(after.openIds,['v147Data']);
  // Capture the compact four-card home for approval; no settings mutation.
  await fn(function(){
    [...document.querySelectorAll('#v147SettingsHome>details.v147-setting')].forEach(x=>x.open=false);
  });
  await pause(260);
  const shot=await call('Page.captureScreenshot',{format:'png'});
  fs.mkdirSync('settings14-7-verification',{recursive:true});
  fs.writeFileSync('settings14-7-verification/settings-four-section-landing.png',Buffer.from(shot.data,'base64'));
  console.log('PASS real Windows app: four Settings sections, no Advanced, dangerous reset inside protected Data, sidebar unchanged');
 }finally{ws.close()}
}
main().catch(err=>{console.error(err.stack||String(err));process.exitCode=1});

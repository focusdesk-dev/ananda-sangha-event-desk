// Integration test: signed QR phone page + HTTP photo upload + desktop event
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),vm=require('vm');
const src=fs.readFileSync('main.js','utf8'),start=src.indexOf('let anandaAttendanceServer=null;'),end=src.indexOf("ipcMain.handle('ananda-attendance-start-upload-server'",start);
assert(start>=0&&end>start);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ananda-qr-ai-')),events=[];
const ctx={fs,path,http,Buffer,URL,URLSearchParams,require,__dirname:process.cwd(),SYSTEM_ROOT:root,
 mainWindow:{isDestroyed:()=>false,webContents:{send:(topic,data)=>events.push({topic,data})}},
 os:{networkInterfaces:()=>({mock:[{family:'IPv4',internal:false,address:'192.168.10.20'}]})},anandaReadAiKey:()=> 'sk-mock-test'};
const exported="\nglobalThis.testQr={ensure:anandaEnsureAttendanceServer,token:anandaAiQrToken,meta:anandaAttendanceSheetMeta,registerShort:anandaRegisterShortQr,resolveShort:anandaResolveShortQr,close:()=>new Promise(resolve=>{if(anandaAttendanceServer)anandaAttendanceServer.close(resolve);else resolve()})};";
vm.runInNewContext(src.slice(start,end)+exported,ctx);
(async()=>{
const batch='batch-mock-1',date='2026-10-14',d8='20261014',sheetId='ASMOCK1234',verify='abcd1234',layout='A4L30V2';
const payload=JSON.stringify({v:5,kind:'ANANDA_ATTENDANCE',batchId:batch,date,sheet:1,totalSheets:2,sheetId,layout,verify});
const sheetMeta={payload,sheetId,mode:'ai',course:'Level 1',batch:'Batch 1',date:'14 Oct 2026',sheet:1,total:2};
ctx.testQr.meta.set([batch,d8,1,2,verify,sheetId,layout].join('|'),sheetMeta);
const addr=await ctx.testQr.ensure();assert(addr.ok,JSON.stringify(addr));
const base='http://127.0.0.1:'+addr.port;
const q=new URLSearchParams({b:batch,d:d8,s:'1',t:'2',v:verify,x:sheetId,l:layout,m:'ai',k:ctx.testQr.token(sheetId,verify)});
const get=await fetch(base+'/?'+q);assert.strictEqual(get.status,200);
const html=await get.text();assert(html.includes('AI Attendance Sheet'));assert(html.includes('capture="environment"'));assert(html.includes('id="aiConsent"'));
const fd=new FormData();fd.append('sheet',new Blob([Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3])],{type:'image/jpeg'}),'attendance.jpg');
const bad=new URLSearchParams(q);bad.set('k','bad-token');
const denied=await fetch(base+'/upload?'+bad,{method:'POST',body:fd});assert.strictEqual(denied.status,403);
const fd2=new FormData();fd2.append('sheet',new Blob([Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3])],{type:'image/jpeg'}),'attendance.jpg');
const accept=await fetch(base+'/upload?'+q,{method:'POST',body:fd2});assert.strictEqual(accept.status,200);assert((await accept.json()).ok);
const ai=events.filter(e=>e.topic==='ananda-attendance-phone-upload');assert.strictEqual(ai.length,1);
assert.strictEqual(ai[0].data.mode,'ai');assert.strictEqual(ai[0].data.sheetId,sheetId);assert.strictEqual(ai[0].data.attendancePayload,payload);
assert(ai[0].data.dataUrl.startsWith('data:image/jpeg;base64,'));
// BETA534 compact QR with persisted sheet registration: must remain verifiable
// after the registration data is no longer in the in-memory legacy map.
const shortId='AS-SHORT-QR-TEST';
const shortPayload=JSON.stringify({v:5,kind:'ANANDA_ATTENDANCE',batchId:batch,date,sheet:1,totalSheets:2,sheetId:shortId,layout,verify});
const shortMeta={payload:shortPayload,sheetId:shortId,mode:'ai',course:'Level 1',batch:'Batch 1',date:'14 Oct 2026',sheet:1,total:2};
ctx.testQr.registerShort(shortMeta);
const shortCode=ctx.testQr.token(shortId,verify).slice(0,32);
const shortParams=new URLSearchParams({x:shortId,k:shortCode});
const shortURL=base+'/?'+shortParams;
assert(shortURL.length<110,'Compact QR should be short enough for reliable phone scanning');
assert(fs.existsSync(path.join(root,'attendance-qr-sheet-links.json')),'QR metadata must persist on disk');
ctx.testQr.meta.clear(); // Test after the old in-memory registration is gone.
const shortGet=await fetch(shortURL);assert.strictEqual(shortGet.status,200);
const shortHtml=await shortGet.text();assert(shortHtml.includes('AI Attendance Sheet')&&shortHtml.includes('TAKE PHOTO'));
const wrongShort=new URLSearchParams(shortParams);wrongShort.set('k','0'.repeat(32));
const wrongGet=await fetch(base+'/?'+wrongShort);assert.strictEqual(wrongGet.status,403);
const shortUpload=new FormData();shortUpload.append('sheet',new Blob([Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3])],{type:'image/jpeg'}),'attendance.jpg');
const shortPosted=await fetch(base+'/upload?'+shortParams,{method:'POST',body:shortUpload});
assert.strictEqual(shortPosted.status,200);assert((await shortPosted.json()).ok);
const sent=events.filter(e=>e.topic==='ananda-attendance-phone-upload');
assert.strictEqual(sent.length,2);assert.strictEqual(sent[1].data.attendancePayload,shortPayload);
assert.strictEqual(sent[1].data.sheetId,shortId);
console.log('PASS: long and compact signed QR -> phone camera page -> upload -> exact student sheet; 32-char signature, persisted registration, invalid GET/POST rejected.');
})().then(async()=>{await ctx.testQr.close();fs.rmSync(root,{recursive:true,force:true});},async err=>{console.error(err);await ctx.testQr.close();fs.rmSync(root,{recursive:true,force:true});process.exitCode=1;});

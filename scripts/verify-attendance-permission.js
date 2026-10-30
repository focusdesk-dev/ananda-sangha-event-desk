'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const main=fs.readFileSync('main.js','utf8'),html=fs.readFileSync('index.html','utf8'),preload=fs.readFileSync('preload.js','utf8');
const start=main.indexOf('// Attendance-processing permission is device-local');
const end=main.indexOf('// BETA530: AI attendance integration.',start);
const processStart=main.indexOf("ipcMain.handle('ananda-ai-analyze-attendance'");
const processEnd=main.indexOf('app.whenReady().then(',processStart);
assert(start>0&&end>start&&processStart>0&&processEnd>processStart);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ananda-permission-'));
const password='correct-batch-password',salt='abcdefghijklmnop';
const hash=crypto.pbkdf2Sync(password,Buffer.from(salt),150000,32,'sha256').toString('hex');
let verifier=JSON.stringify({salt:Buffer.from(salt).toString('hex').slice(0,32),hash:''});
const validSalt='ab'.repeat(16),validHash=crypto.pbkdf2Sync(password,Buffer.from(validSalt),150000,32,'sha256').toString('hex');
verifier=JSON.stringify({salt:validSalt,hash:validHash});
const callbacks=new Map();let requests=0;
const context={
  fs,path,SYSTEM_ROOT:temp,nodeCrypto:crypto,Buffer,Date,console,
  ipcMain:{handle:(k,fn)=>{callbacks.set(k,fn)}},
  mainWindow:{isDestroyed:()=>false,webContents:{executeJavaScript:async()=>verifier}},
  anandaReadAiKey:()=> 'test-key',
  fetch:async()=>{requests++;return{ok:true,json:async()=>({
    usage:{input_tokens:1105,output_tokens:42},
    output:[{type:'message',content:[{type:'output_text',text:'{"present_rows":[2],"uncertain_rows":[3]}'}]}]
  })}},
  AbortSignal
};
vm.runInNewContext(main.slice(start,end)+main.slice(processStart,processEnd),context,{timeout:1000});
const call=(name,body)=>callbacks.get(name)(null,body);
(async()=>{
  const input={imageDataUrl:'data:image/jpeg;base64,AA==',printedNumbers:[1,2,3]};
  let p=await call('ananda-attendance-permission-status');
  assert.strictEqual(p.allowed,false,'Default must deny processing');
  let out=await call('ananda-ai-analyze-attendance',input);
  assert.strictEqual(out.ok,false);
  assert.match(out.error,/not authorised/);assert.strictEqual(requests,0,'Missing permission cannot send an image');
  // Administrator must exist and password must match existing actual verifier.
  verifier='null';
  out=await call('ananda-attendance-permission-set',{administrator:'Admin A',password,allowed:true});
  assert.strictEqual(out.ok,false);assert.strictEqual((await call('ananda-attendance-permission-status')).allowed,false);
  verifier=JSON.stringify({salt:validSalt,hash:validHash});
  out=await call('ananda-attendance-permission-set',{administrator:'Admin A',password:'wrong',allowed:true});
  assert.strictEqual(out.ok,false);
  out=await call('ananda-attendance-permission-set',{administrator:'',password,allowed:true});
  assert.strictEqual(out.ok,false);
  out=await call('ananda-attendance-permission-set',{administrator:'Admin A',password,allowed:true});
  assert.strictEqual(out.ok,true);assert.strictEqual(out.allowed,true);
  assert.strictEqual(out.administrator,'Admin A');assert.strictEqual(out.permissionVersion,1);
  assert(out.updatedAt);assert.strictEqual(out.revision,1);
  p=await call('ananda-attendance-permission-status');assert.strictEqual(p.allowed,true);
  out=await call('ananda-ai-analyze-attendance',input);
  assert.strictEqual(out.ok,true);assert.strictEqual(requests,1);
  assert.deepStrictEqual([...out.presentRows],[2]);assert.deepStrictEqual([...out.uncertainRows],[3]);
  const usage=await call('ananda-ai-usage');
  assert.strictEqual(usage.requests,1);assert.strictEqual(usage.inputTokens,1105);
  assert.strictEqual(usage.outputTokens,42);assert(usage.estimatedUsd>0);
  // Simulated process restart: reload handlers using the same System directory.
  const restarted=new Map();
  const restartedCtx={...context,ipcMain:{handle:(k,fn)=>restarted.set(k,fn)}};
  vm.runInNewContext(main.slice(start,end),restartedCtx);
  const restartedStatus=await restarted.get('ananda-attendance-permission-status')();
  assert.strictEqual(restartedStatus.allowed,true,'Grant must survive restart');
  assert.strictEqual((await restarted.get('ananda-ai-usage')()).requests,1,'Usage must survive restart');
  out=await call('ananda-attendance-permission-set',{administrator:'Admin B',password,allowed:false});
  assert.strictEqual(out.ok,true);assert.strictEqual(out.allowed,false);assert.strictEqual(out.revision,2);
  assert.strictEqual(out.administrator,'Admin B');
  assert.strictEqual((await restarted.get('ananda-attendance-permission-status')()).allowed,false);
  out=await call('ananda-ai-analyze-attendance',input);
  assert.strictEqual(out.ok,false);assert.strictEqual(requests,1,'Revocation must stop paid processing');
  // Volunteer controls cannot grant permission.
  assert(!html.includes('id="p2v530Consent"'),'No volunteer permission checkbox');
  assert(!html.includes('anandaAIPhotoPermission'),'Old volunteer localStorage permission removed');
  assert(html.includes('id="p2v537PermissionCard"'),'Admin settings card missing');
  assert(html.includes('p2v537PermissionReady()'),'Permission checked in renderer before processing');
  assert(html.includes('p2v537ProcessedFingerprints.has(seenKey)'),'Repeated photos must not be analysed again');
  assert(html.includes('p2v537ProcessedFingerprints.add(seenKey)'),'Only successful photos become deduplicated');
  assert(html.includes('p2v537RecognisedEnrollments'),'Recognised must be separate from saved and manually selected');
  assert(html.includes("p2v536Confirmed?'Attendance saved'"),'Saved status must be distinct from processing');
  assert(html.includes('id="p2v530Status"'),'One volunteer processing status required');
  assert(preload.includes('setAttendancePermission'),'Admin permission bridge missing');
  assert(preload.includes('attendanceApiUsage'),'Usage bridge missing');
  assert(main.includes("store: false"),'No server-side storage of attendance response');
  assert(main.includes('anandaMobilePage(')&&main.includes('id="aiConsent"'),'Phone consent remains');
  console.log('PASS: missing/granted/revoked admin permission, password verification, main-process API guard, restart persistence, tracked usage, deduplication and volunteer UI scope.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));

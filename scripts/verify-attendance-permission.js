'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert');
const main=fs.readFileSync('main.js','utf8'),html=fs.readFileSync('index.html','utf8'),
  preload=fs.readFileSync('preload.js','utf8');
const start=main.indexOf('// AI processing needs a configured API key');
const end=main.indexOf('// BETA530: AI attendance integration.',start);
const procStart=main.indexOf("ipcMain.handle('ananda-ai-analyze-attendance'");
const procEnd=main.indexOf('app.whenReady().then(',procStart);
assert(start>0&&end>start&&procStart>0&&procEnd>procStart,'AI billing and processing handlers required');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ananda-ai-no-extra-permission-'));
const callbacks=new Map();
let key='',requests=0;
const context={fs,path,SYSTEM_ROOT:dir,Buffer,Date,console,
 ipcMain:{handle:(name,fn)=>callbacks.set(name,fn)},
 anandaReadAiKey:()=>key,
 fetch:async()=>{requests++;return{ok:true,json:async()=>({
   usage:{input_tokens:1000,output_tokens:100},
   output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({
     present_rows:[2],uncertain_rows:[3]
   })}]}]
 })}},
 AbortSignal};
vm.runInNewContext(main.slice(start,end)+main.slice(procStart,procEnd),context,{timeout:1000});
const run=(name,body)=>callbacks.get(name)(null,body);
(async()=>{
 assert(!callbacks.has('ananda-attendance-permission-status'),'Old status route must be gone');
 assert(!callbacks.has('ananda-attendance-permission-set'),'Old permission toggle must be gone');
 assert(!main.includes('anandaAttendancePermission()'),'No hidden permission check');
 assert(!preload.includes('setAttendancePermission'),'No obsolete IPC permission bridge');
 assert(!html.includes('id="p2v537PermissionCard"'),'No grant/revoke form in Settings');
 assert(!html.includes('p2v537PermissionReady()'),'No hidden renderer permission gate');
 assert(html.includes('id="p2v537ApiUsage"'),'API usage summary still available');
 assert(main.includes('id="aiConsent"'),'Phone photo consent retained');
 const input={imageDataUrl:'data:image/jpeg;base64,AA==',printedNumbers:[1,2,3]};
 let out=await run('ananda-ai-analyze-attendance',input);
 assert.strictEqual(out.ok,false,'Missing API key must prevent processing');
 assert.match(out.error,/not configured|administrator|Settings/i);
 assert.strictEqual(requests,0,'Missing key must not use paid API');
 key='sk-test-provided-on-device';
 out=await run('ananda-ai-analyze-attendance',input);
 assert.strictEqual(out.ok,true,'Configured key enables processing without another permission step');
 assert.deepStrictEqual([...out.presentRows],[2]);
 assert.deepStrictEqual([...out.uncertainRows],[3]);
 assert.strictEqual(requests,1);
 const usage=await run('ananda-ai-usage');
 assert.strictEqual(usage.requests,1);
 assert.strictEqual(usage.inputTokens,1000);
 assert.strictEqual(usage.outputTokens,100);
 assert(usage.estimatedUsd>0);
 const restart=new Map();
 vm.runInNewContext(main.slice(start,end),{...context,ipcMain:{handle:(n,fn)=>restart.set(n,fn)}},{timeout:1000});
 assert.strictEqual((await restart.get('ananda-ai-usage')()).requests,1,'Usage remains after restart');
 assert(html.includes('p2v537ProcessedFingerprints.has(seenKey)'),'AI repeated-photo detection retained');
 assert(html.includes('p2v537ProcessedFingerprints.add(seenKey)'),'Fingerprint after successful scan');
 assert(main.includes('store: false'),'Remote response storage stays disabled');
 console.log('PASS: no extra admin permission; API key required; photo upload consent; paid API gated by key; usage persists; duplicate-photo protection intact');
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));

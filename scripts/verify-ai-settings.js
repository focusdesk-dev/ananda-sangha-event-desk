'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
(async()=>{
  const html=fs.readFileSync('index.html','utf8');
  const main=fs.readFileSync('main.js','utf8');
  const preload=fs.readFileSync('preload.js','utf8');
  for(const name of ['main.js','preload.js'])new vm.Script(fs.readFileSync(name,'utf8'),{filename:name});
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi))if(m[1].trim())new vm.Script(m[1]);
  for(const id of ['p2v532AiSettings','p2v532NewKey','p2v532ReplaceKey','p2v532RemoveKey','p2v532FreeTest','p2v532ConnectionTest','p2v532KeyStatus']){
    assert(html.includes('id="'+id+'"'),'Missing Settings control: '+id);
  }
  assert(html.includes("p2v532RefreshKeyStatus()"));
  for(const name of ['removeAiKey','testAiConnection','freeAiPreflight','setAiKey','aiStatus'])assert(preload.includes(name));
  const mem=new Map(),handlers=new Map();
  const vfs={
    existsSync:p=>mem.has(p)||p==='/test/system',
    statSync:p=>({isDirectory:()=>p==='/test/system'}),
    readFileSync:p=>mem.get(p),
    writeFileSync:(p,b)=>mem.set(p,Buffer.from(b)),
    renameSync:(oldName,newName)=>{mem.set(newName,mem.get(oldName));mem.delete(oldName)},
    unlinkSync:p=>mem.delete(p),
    mkdirSync:()=>{}
  };
  const safeStorage={
    isEncryptionAvailable:()=>true,
    encryptString:value=>Buffer.from(Buffer.from(value).reverse().toString('base64')),
    decryptString:b=>Buffer.from(b.toString(),'base64').reverse().toString()
  };
  const routes=[];
  let response={ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({present_rows:[1,4,9],uncertain_rows:[7]})}]}]})};
  const ctx={ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},safeStorage,fs:vfs,path,SYSTEM_ROOT:'/test/system',Buffer,URLSearchParams,
    anandaAttendancePermission:()=>({allowed:true}),anandaRecordApiUsage:()=>{},
    AbortSignal,fetch:async(url,opts)=>{routes.push({url,opts});return response;}};
  const a=main.indexOf('const AI_CREDENTIAL_PATH'),b=main.indexOf('app.whenReady().then',a);
  assert(a>=0&&b>a,'Could not isolate AI desktop handlers');
  vm.runInNewContext(main.slice(a,b),ctx,{timeout:1000});
  const handler=name=>{assert(handlers.has(name),'Missing '+name);return handlers.get(name)};
  let status=await handler('ananda-ai-status')();
  assert(!status.configured&&status.secureStorage);
  const before=await handler('ananda-ai-free-preflight')();
  assert(before.ok&&before.offlineMappingTest&&before.keyStorage);
  assert.strictEqual(routes.length,0,'Free preflight must not call or bill OpenAI');
  const key='sk-'+'N'.repeat(40);
  let saved=await handler('ananda-ai-set-key')(null,key);assert(saved.ok);
  const credpath=path.join('/test/system','ai-api-key.bin');
  assert(mem.has(credpath)&&!mem.get(credpath).equals(Buffer.from(key)),'Key must be encrypted');
  const second='sk-'+'B'.repeat(40);
  saved=await handler('ananda-ai-set-key')(null,second);
  assert(saved.ok&&safeStorage.decryptString(mem.get(credpath))===second&&!mem.get(credpath).toString().includes(key));
  const imageDataUrl='data:image/jpeg;base64,'+Buffer.from('fake photo').toString('base64');
  const allowed=Array.from({length:30},(_,i)=>i+1);
  let result=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl,printedNumbers:allowed});
  assert(result.ok&&JSON.stringify(Array.from(result.presentRows))===JSON.stringify([1,4,9]));
  assert(Array.from(result.uncertainRows).join(',')==='7');
  const request=JSON.parse(routes.at(-1).opts.body);
  assert.strictEqual(request.store,false);
  assert(request.input[0].content.find(x=>x.type==='input_image'));
  assert(routes.at(-1).opts.headers.Authorization==='Bearer '+second);
  response={ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({present_rows:[99],uncertain_rows:[]})}]}]})};
  result=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl,printedNumbers:allowed});
  assert(!result.ok&&/inconsistent/.test(result.error),'Never accept unprinted student numbers');
  response={ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({present_rows:[1],uncertain_rows:[1]})}]}]})};
  result=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl,printedNumbers:allowed});
  assert(!result.ok,'Uncertain and Present cannot overlap');
  response={ok:false,status:401,json:async()=>({error:{message:'Incorrect API key'}})};
  result=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl,printedNumbers:allowed});
  assert(!result.ok&&/Incorrect API key/.test(result.error),'Authentication failures must show');
  let bad=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl:'not an image',printedNumbers:allowed});
  assert(!bad.ok);
  const gone=await handler('ananda-ai-remove-key')();
  assert(gone.ok&&!mem.has(credpath),'Remove must delete stored key');
  status=await handler('ananda-ai-status')();assert(!status.configured);
  result=await handler('ananda-ai-analyze-attendance')(null,{imageDataUrl,printedNumbers:allowed});
  assert(!result.ok&&/not configured/i.test(result.error),'No-key cannot submit image');
  console.log('PASS: Settings controls, encrypted key rotation/removal, no-credit preflight, mocked vision results, invalid numbers, overlap, auth errors, no-key rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});

'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8'),preload=fs.readFileSync('preload.js','utf8'),main=fs.readFileSync('main.js','utf8');
const start=html.indexOf('    // v5.40: Manual uploads see the compact');
const end=html.indexOf('    async function p2v530Analyse()',start);
assert(start>0&&end>start,'Page 2 compact QR recovery module missing');
const fragment=html.slice(start,end);
const payload=id=>JSON.stringify({v:5,kind:'ANANDA_ATTENDANCE',layout:'A4L30V2',
 batchId:'B1',date:'2026-11-05',sheet:id==='SECOND'?2:1,totalSheets:2,sheetId:id,verify:'signed'});
const signed='http://192.168.1.4:8787/?x=SECOND&k=123456789abcdef0123456789abcdef0';
const ctx={URL,window:{anandaDesktop:{resolveAiSheetLink:async raw=>{
 if(raw===signed)return{ok:true,payload:payload('SECOND'),sheet:2,totalSheets:2};
 return{ok:false,error:'QR signature is invalid'};
}}},p2v58ParsePayload:raw=>{try{const p=JSON.parse(raw);return p.v===5?p:null}catch{return null}}};
vm.runInNewContext(fragment+';globalThis.resolve=p2v540ResolveQr;',ctx);
(async()=>{
 const result=await ctx.resolve(signed);
 assert(result&&result.sheet===2&&result.sheetId==='SECOND','Manual upload must resolve page 2 from short QR');
 assert.strictEqual((await ctx.resolve(payload('FIRST'))).sheet,1,'Full signed payload keeps original page');
 await assert.rejects(()=>ctx.resolve(signed.replace(/k=.*/, 'k=00000000000000000000000000000000')),
 /signature/i,'Forged sheet QR must be rejected');
 assert.strictEqual(await ctx.resolve('not-a-qr'),null,'An unreadable QR cannot assume page 1');
 assert(preload.includes("resolveAiSheetLink: url => ipcRenderer.invoke('ananda-ai-resolve-sheet-link', url)"));
 assert(main.includes("ipcMain.handle('ananda-ai-resolve-sheet-link'"));
 assert(html.includes('if(seen&&String(seen.sheetId)!==String(data.sheetId))'),'Photo and phone sheet ID must match when both available');
 assert(html.includes('sheetNumber:Number(data.sheet),totalSheets:Number(data.totalSheets)'),'AI should know page number');
 assert(html.includes('String(pi*30+i+1).padStart(2,\'0\')'),'Page 2 should print absolute numbers 31-37');
 assert(html.includes('No attendance was changed.'),'Invalid scans should not write attendance');
 console.log('PASS: manual signed page-2 short QR resolution, signature rejection, no page-1 fallback, printed 31-37 numbering, and mismatched photo safeguard');
})().catch(error=>{console.error(error);process.exitCode=1});

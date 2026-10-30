'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('    // Correction 3: one volunteer status.');
const end=html.indexOf('    async function p2v537RefreshAdminSettings(){',start);
assert(start>0&&end>start);
const element={innerHTML:'',style:{}};
const ctx={
  p2v530SetStatus(){},
  $:id=>id==='p2v530Status'?element:null,
  p2v536ScannedSheets:new Set([1,2]),
  p2v536ExpectedPages:2,
  p2v537RecognisedEnrollments:new Set(['P01','P05']),
  p2v536Confirmed:false,
  p2v537LastError:false,
  p2v537LastMessage:'',
  p2v518CurrentRowsBase:()=>Array.from({length:40},(_,i)=>({en:{id:'P'+String(i+1).padStart(2,'0')}})),
  p2v536Draft:{P01:true,P05:true,P10:true},
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  crypto:crypto.webcrypto,
  Uint8Array,Blob
};
vm.runInNewContext(html.slice(start,end)+'\n;globalThis.inspectStatus=p2v537RefreshStatus;globalThis.fingerprint=p2v537PhotoFingerprint;',ctx);
ctx.inspectStatus();
assert(element.innerHTML.includes('Attendance processed'),'Processing title');
assert(element.innerHTML.includes('2 of 2 photos received'),'One photo counter');
assert(element.innerHTML.includes('2 students recognised'),'Manual P10 must not count as AI recognition');
ctx.p2v530SetStatus('Review unclear marks at row(s): 33. Remaining students stay unmarked.',true);
assert(element.innerHTML.includes('Attention needed'),'Unrecognised ink should warn');
assert(element.innerHTML.includes('row(s): 33'),'Uncertain rows shown');
ctx.p2v530SetStatus('',false);
assert(element.innerHTML.includes('Attendance processed'),'Warning can clear');
ctx.p2v536Confirmed=true;ctx.inspectStatus();
assert(element.innerHTML.includes('Attendance saved'),'Saved must be separately shown after final confirmation');
const first=new Blob([Buffer.from('same uploaded photograph')]),second=new Blob([Buffer.from('another image')]);
(async()=>{
 const a=await ctx.fingerprint(first),b=await ctx.fingerprint(first),c=await ctx.fingerprint(second);
 assert.strictEqual(a,b);assert.notStrictEqual(a,c);
 const proc=html.indexOf('async function p2v530Analyse()');
 const dupe=html.indexOf('p2v537ProcessedFingerprints.has(seenKey)',proc);
 const external=html.indexOf('api.analyzeAiAttendance({imageDataUrl:img,printedNumbers:numbers})',proc);
 const commit=html.indexOf('p2v537ProcessedFingerprints.add(seenKey)',proc);
 assert(proc>0&&dupe>proc&&external>dupe&&commit>external,'Dedup should happen before API call, register only after success');
 assert(html.includes("p2v536Draft[r.en.id]=recognised?true:null"),'Unrecognised mark remains unmarked');
 assert(html.includes("p2v536Confirmed=true"),'Save confirmation distinct');
 assert(html.includes("p2v536Confirmed=false"),'Scan does not imply saved');
 assert(html.includes("p2v536RenderFullRoster();"),'Manual corrections preserved');
 const statusMatches=(html.match(/id="p2v530Status"/g)||[]).length;
 assert.strictEqual(statusMatches,1,'Only one processing status element');
 assert(!html.includes('id="p2v530Consent"'),'Volunteer authorisation removed');
 assert(html.includes('id="p2v531Print"'),'Printing stays');
 assert(html.includes('p2v535PrepareAiImage'),'QR photo engine stays');
 console.log('PASS: consolidated 2/2 processing status, 2 AI-only recognitions, unclear marks, independent saved status, duplicate image fingerprint, manual attendance and printing preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});

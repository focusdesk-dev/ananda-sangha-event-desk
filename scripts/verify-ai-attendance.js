const fs=require('fs'), assert=require('assert'), vm=require('vm'), path=require('path');
const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('main.js','utf8'),preload=fs.readFileSync('preload.js','utf8');
for (const name of ['main.js','preload.js']) new vm.Script(fs.readFileSync(name,'utf8'),{filename:name});
let inlineScripts=0;
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi))if(m[1].trim()){new vm.Script(m[1]);inlineScripts++;}
const order=['p2v58Manual','p2v58Print','p2v58Upload','p2v530AI'].map(x=>html.indexOf('id="'+x+'"'));
assert(order.every(x=>x>0)&&order.every((p,i)=>i===0||p>order[i-1]),'AI Attendance must remain fourth button');
const requiredUi=['p2v531Print','p2v531ReviewInside','p2v530Consent','p2v530Status','p2v530Key','p2v530SaveKey','p2v530Panel','p2v530Analyze'];
for(const id of requiredUi)assert(html.includes('id="'+id+'"'),'Missing AI workflow control: '+id);
assert(html.includes("p2v58PrintSheet(true)"),'Print AI button must generate AI QR');
assert(html.includes("mode:aiMode?'ai':'offline'"),'Printed QR must identify AI mode');
assert(html.includes('const det=p2v521Detect(prep,mapped.out.length,slots);'),'Offline reader remains available');
assert(html.includes('p2v531HandlePhone(payload)'), 'Phone auto-route must be wired');
assert(html.includes("if(payload.mode!=='ai')"), 'Offline and AI phone uploads must be separated');
assert(html.includes("await p2v530Analyse()"), 'AI must automatically run after phone upload');
assert(html.includes('p2v536MergeAiSheet(data,mapped.out,numbers,present)'),'AI must merge recognized marks into the complete class list');
assert(html.includes('p2v531LastConfirmedSheetId'), 'Second page must not overwrite unsaved review');
assert(html.includes('p2v531MoveReview'), 'AI Attendance must contain the review list');
assert(html.includes('p2v528MarkedRemainingAbsent'), 'Absent button confirmation rule must be retained');
assert(preload.includes('analyzeAiAttendance'), 'Desktop AI bridge missing');
assert(main.includes('safeStorage.encryptString(value)'), 'Encrypt API credential');
assert(main.includes("store: false"),'Do not store API responses');
assert(main.includes("https://api.openai.com/v1/responses"),'Paid API connection missing');
assert(main.includes("anandaAiQrToken(sheetId,verify)"),'QR signing missing');
assert(main.includes("timingSafeEqual"),'QR verification missing');
assert(main.includes("mode:aiMode?'ai':'offline'"),'Phone upload mode missing');
const a=main.indexOf('function anandaMobilePage('),b=main.indexOf('function anandaMultipartFile(',a);
assert(a>=0&&b>a,'Cannot isolate phone upload HTML');
const phone=vm.runInNewContext(main.slice(a,b)+'\nanandaMobilePage({mode:"ai",course:"Level 1",batch:"Batch 1",date:"14 Oct 2026",payload:"valid",sheet:1,total:2},"");',{
 fs:{readFileSync:()=>Buffer.from([137,80,78,71])},path,__dirname:'/tmp'
});
for(const required of ['AI Attendance Sheet','TAKE PHOTO','capture="environment"','Preview Photo','id="aiConsent"','USE PHOTO',"window.location.search",'AI analysis'])assert(phone.includes(required),'Phone flow missing '+required);
const cc=main.slice(main.indexOf('const anandaQrCrypto='),main.indexOf('function anandaCompactAttendanceMeta('));
const store=new Map(),virtualFs={
 existsSync:p=>store.has(p),readFileSync:p=>store.get(p),
 writeFileSync:(p,data)=>store.set(p,Buffer.from(data)),
 renameSync:(a,b)=>{store.set(b,store.get(a));store.delete(a);}
};
const qrCtx={require,fs:virtualFs,path,SYSTEM_ROOT:'/settings'};
vm.runInNewContext(cc+';globalThis.testQrToken=anandaAiQrToken',qrCtx);
const t1=qrCtx.testQrToken('SHEET-A','verify-a'),t2=qrCtx.testQrToken('SHEET-A','verify-a'),t3=qrCtx.testQrToken('SHEET-B','verify-a');
assert.strictEqual(t1,t2,'QR must work after reopening');
assert.notStrictEqual(t1,t3,'Different sheets must have different auth tokens');
assert.strictEqual(t1.length,64,'QR token should be SHA256 HMAC');
console.log('PASS: '+inlineScripts+' inline scripts parse, AI is fourth option, QR signed per sheet, camera+consent page, automatic photo-to-AI routing, review-only save flow.');

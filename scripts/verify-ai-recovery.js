'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('    function p2v535RefreshQueuedPhoto(){');
const after=html.indexOf('    const p2v531ClassRoot=',start);
const handler=html.indexOf('    async function p2v531HandlePhone(payload){',after);
const end=html.indexOf('    // Rebind once:',handler);
assert(start>0&&after>start&&handler>after&&end>handler);
const source=html.slice(start,after)+'\n'+html.slice(handler,end)+
'\n;globalThis.fire=p2v531HandlePhone;globalThis.getPending=()=>p2v531PendingPhone;globalThis.getSession=()=>p2v524ScanSession;';
function harness(opts={}){
 const statuses=[],ui={p2v535RetryQueued:{style:{display:'none'},disabled:false,textContent:'',addEventListener(event,fn){this.click=fn}},
 p2v530Panel:{classList:{contains:()=>false}},p2v511Review:{classList:{add:()=>{}}}};
 let analysed=0,legacy=0,shown=0;
 const c={p2v531PendingPhone:null,p2v530AiBusy:!!opts.busy,
   p2v524ScanSession:opts.session===undefined?{snapshot:{sheetId:'PREVIOUS-UNSAVED'}}:opts.session,
   p2v531LastConfirmedSheetId:'',p2v531Active:true,p2v528AwaitingPhoto:false,
   p2v528MarkedRemainingAbsent:false,p2v58Draft:{},
   consent:opts.consent!==false,window:{confirm:()=>true,anandaDesktop:{aiStatus:async()=>({configured:true})}},
   $:id=>ui[id]||null,p2v537PermissionReady:async()=>c.consent,
   p2v530SetStatus:s=>statuses.push(String(s)),p2v530OldPhoneHandler:async()=>{legacy++},
   p2v531MoveReview:()=>{},switchPage:()=>{},p2v536KeepUnifiedPanel:()=>{shown++},
   p2v524ClearSession:()=>{c.p2v524ScanSession=null},p2v530SetPhoto:()=>{},
   p2v530Analyse:async()=>{analysed++},fetch:async()=>({blob:async()=>({})}),
   setTimeout:(fn)=>{Promise.resolve().then(fn)},console
 };
 vm.runInNewContext(source,c,{timeout:1000});
 return{c,ui,statuses,analysed:()=>analysed,legacy:()=>legacy,shown:()=>shown};
}
(async()=>{
 const photo={dataUrl:'data:image/jpeg;base64,AA==',mode:'ai',sheetId:'NEW-SHEET',name:'test.jpg'};
 const a=harness();
 await a.c.fire(photo);
 assert.strictEqual(a.analysed(),1,'New sheet must process without saving previous sheet');
 assert.strictEqual(a.c.getPending(),null,'No false blocked review');
 assert.strictEqual(a.shown(),1,'Unified page should be shown');
 const b=harness();await b.c.fire({...photo,mode:'offline'});
 assert.strictEqual(b.analysed(),0);
 assert.strictEqual(b.legacy(),0,'Ordinary QR must never start AI in unified flow');
 assert(b.statuses.some(x=>/standard QR/.test(x)));
 const c=harness({consent:false,session:null});await c.c.fire(photo);
 assert.strictEqual(c.analysed(),0);assert(c.c.getPending());
 c.c.consent=true;c.ui.p2v535RetryQueued.click();
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.strictEqual(c.analysed(),1,'Queued photo can be retried after consent');
 const d=harness({busy:true,session:null});
 await d.c.fire(photo);
 assert.strictEqual(d.analysed(),0);assert(d.c.getPending());
 console.log('PASS: previous unsaved sheet does not block next sheet; non-AI QR isolation; consent retry; busy queue');
})().catch(e=>{console.error(e);process.exitCode=1});
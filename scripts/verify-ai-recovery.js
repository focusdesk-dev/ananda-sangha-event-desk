'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('    function p2v535RefreshQueuedPhoto(){');
const after=html.indexOf('    const p2v531ClassRoot=',start);
const handler=html.indexOf('    async function p2v531HandlePhone(payload){',after);
const end=html.indexOf('    // Rebind once:',handler);
assert(start>0 && after>start && handler>after && end>handler,'Beta 5.35 recovery functions missing');
assert(html.includes('id="p2v535RetryQueued"'),'Queue retry button is missing');

const source=html.slice(start,after)+'\n'+html.slice(handler,end)+
  '\n;globalThis.fire=p2v531HandlePhone;globalThis.getPending=()=>p2v531PendingPhone;'+
  'globalThis.getSession=()=>p2v524ScanSession;globalThis.setConsent=(v)=>{consent=v};';
function harness(){
  let analysis=0,legacy=0,confirmations=0;
  const statuses=[];
  const ui={
    p2v535RetryQueued:{style:{display:'none'},disabled:false,textContent:'',
      addEventListener(event,fn){assert.strictEqual(event,'click');this.click=fn;}},
    p2v530Panel:{classList:{contains:()=>false}},
    p2v511Review:{classList:{add:()=>{}}}
  };
  const context={
    p2v531PendingPhone:null,p2v530AiBusy:false,
    p2v524ScanSession:{snapshot:{sheetId:'UNSAVED-OLD'}},
    p2v531LastConfirmedSheetId:'',p2v531Active:true,
    p2v528AwaitingPhoto:false,p2v528MarkedRemainingAbsent:false,p2v58Draft:{},
    consent:true,window:{confirm:()=>{confirmations++;return true},
      anandaDesktop:{aiStatus:async()=>({configured:true})}},
    $:id=>ui[id]||null,
    p2v531Consent:()=>context.consent,
    p2v530SetStatus:msg=>statuses.push(String(msg)),
    p2v530OldPhoneHandler:async()=>{legacy++},
    p2v531MoveReview:()=>{},
    switchPage:()=>{},
    p2v531ShowPanel:()=>{},
    p2v524ClearSession:()=>{context.p2v524ScanSession=null},
    p2v530SetPhoto:()=>{},
    p2v530Analyse:async()=>{analysis++},
    fetch:async()=>({blob:async()=>({})}),
    console
  };
  vm.runInNewContext(source,context,{timeout:1000});
  return{context,ui,statuses,analyses:()=>analysis,legacy:()=>legacy,confirmations:()=>confirmations};
}
const photo={dataUrl:'data:image/jpeg;base64,AA==',mode:'ai',sheetId:'NEW-SHEET',name:'phone.jpg'};
(async()=>{
  const t=harness();
  await t.context.fire(photo);
  assert.strictEqual(t.analyses(),0,'A prior unsaved review must block auto-analysis');
  assert.strictEqual(t.context.getPending().sheetId,'NEW-SHEET','The arriving photo must be queued');
  assert.strictEqual(t.ui.p2v535RetryQueued.style.display,'inline-flex');
  assert(/DISCARD UNSAVED/.test(t.ui.p2v535RetryQueued.textContent));
  assert(t.statuses.some(s=>/UNSAVED review/.test(s)));
  t.context.window.confirm=()=>false;
  t.ui.p2v535RetryQueued.click();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert(t.context.getPending(),'Declining discard must preserve the queued photo');
  assert(t.context.getSession(),'Declining discard must preserve the old review');
  assert.strictEqual(t.analyses(),0);
  t.context.window.confirm=()=>true;
  t.ui.p2v535RetryQueued.click();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.strictEqual(t.context.getSession(),null,'Explicit discard must clear only the old session');
  assert.strictEqual(t.context.getPending(),null);
  assert.strictEqual(t.analyses(),1,'Explicit retry must begin AI analysis');
  assert.strictEqual(t.ui.p2v535RetryQueued.style.display,'none');
  
  const t2=harness();
  await t2.context.fire({...photo,mode:'offline'});
  assert.strictEqual(t2.analyses(),0,'Non-AI QR must not trigger AI');
  assert.strictEqual(t2.legacy(),0,'Non-AI QR must not create legacy scan while in AI mode');
  assert(t2.statuses.some(s=>/standard QR upload/.test(s)));

  const t3=harness();
  t3.context.p2v524ScanSession=null;
  t3.context.consent=false;
  await t3.context.fire(photo);
  assert.strictEqual(t3.analyses(),0);
  assert(t3.context.getPending(),'No-consent photo must be queued');
  t3.context.consent=true;
  t3.ui.p2v535RetryQueued.click();
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.strictEqual(t3.analyses(),1,'Photo must be retryable after consent is enabled');
  console.log('PASS: queued AI photo recovery, cancel safeguard, explicit discard, non-AI QR isolation, and consent retry');
})().catch(err=>{console.error(err);process.exitCode=1});

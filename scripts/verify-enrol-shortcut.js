'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('index.html','utf8'),preload=fs.readFileSync('preload.js','utf8');
const marker='  // Correction 2: Class Batch "+" always opens the EXISTING enrolment form,';
const start=html.indexOf(marker),end=html.indexOf('  // PHASE2 BETA5 FIX1',start);
assert(start>0&&end>start);
let activeBatch='BATCH-A',page='classWorkspace',modal=false,clicks=[],handler;
const button={disabled:false,click(){clicks.push(activeBatch)}};
const target={closest:()=>null,isContentEditable:false};
const document={activeElement:target,addEventListener:(type,fn,capture)=>{if(type==='keydown'&&capture)handler=fn},querySelector:sel=>sel==='.modal-backdrop.open'&&modal?{}:null};
const context={document,get page(){return page},$:id=>id==='p2EnrollStudent'?button:null,p2ActiveBatch:()=>activeBatch?{id:activeBatch}:null};
vm.runInNewContext(html.slice(start,end),context,{timeout:1000});
assert.strictEqual(typeof handler,'function');
function send({key='+',code='Equal',shiftKey=true,focus=target,ctrlKey=false,altKey=false,metaKey=false,defaultPrevented=false}={}){
 let prevented=0,stopped=0;const ev={key,code,shiftKey,target:focus,ctrlKey,altKey,metaKey,defaultPrevented,
   isComposing:false,preventDefault(){prevented++},stopImmediatePropagation(){stopped++}};
 handler(ev);return{prevented,stopped};
}
assert.equal(send().prevented,1,'Shift + = opens enrollment');
assert.equal(send({key:'+',code:'NumpadAdd',shiftKey:false}).prevented,1,'Numpad + opens enrollment');
assert.deepStrictEqual(clicks,['BATCH-A','BATCH-A']);
let ignored=0;
for(const tag of ['input','textarea','select','[contenteditable]','[role="textbox"]']){
 const f={closest:sel=>sel.includes(tag)?{}:null};
 const n=clicks.length;if(send({focus:f}).prevented===0&&clicks.length===n)ignored++;
}
assert.equal(ignored,5,'typing controls ignored');
modal=true;assert.equal(send().prevented,0);modal=false;
activeBatch='BATCH-B';send();assert.equal(clicks.at(-1),'BATCH-B','navigation updates active batch');
page='classes';assert.equal(send().prevented,0,'not active on other pages');page='classWorkspace';
activeBatch='';assert.equal(send().prevented,0,'without batch no shortcut');activeBatch='BATCH-A';
assert.equal(send({ctrlKey:true}).prevented,0,'Ctrl + is not an enrolment shortcut');
button.click();assert.equal(clicks.at(-1),'BATCH-A','mouse uses same existing enrolment button');
assert(html.includes('id="p2EnrollStudent" class="btn small" type="button">Enrol student</button>'));
assert(!html.includes('id="p2EnrollStudent" class="btn small" type="button">+ Enrol Student</button>'));
const ps=preload.indexOf('function handleAddShortcut()'),pe=preload.indexOf('function submitFormWithPreferredButton(',ps);
assert(ps>0&&pe>ps);
let ipcButton=0,ipcModal=false,typing=false;
const ipcCtx={document:{activeElement:{matches:()=>typing},
 querySelector:()=>ipcModal?{}:null},isTypingTarget:()=>typing,activePage:()=>({id:'classWorkspace'}),
 clickById:id=>{if(id==='p2EnrollStudent'){ipcButton++;return true}return false}};
vm.runInNewContext(preload.slice(ps,pe)+';globalThis.callAdd=handleAddShortcut;',ipcCtx);
ipcCtx.callAdd();assert.equal(ipcButton,1,'Windows main-process + routes to enrolment');
typing=true;ipcCtx.callAdd();assert.equal(ipcButton,1);typing=false;
ipcModal=true;ipcCtx.callAdd();assert.equal(ipcButton,1,'Windows + blocked when modal already open');
assert(preload.includes("if (pageId === 'classWorkspace')"));
console.log('PASS: Shift+=, Numpad+, mouse, typing safeguards, modal safeguard, current batch navigation, Windows IPC routing; existing form reused.');

'use strict';
const assert=require('node:assert/strict'),port=Number(process.env.ANANDA_DEVTOOLS_PORT||9225),mode=process.argv[2];
async function run(){
 let target;
 for(let i=0;i<40;i++){try{const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  target=pages.find(x=>x.type==='page'&&/index\.html|ananda/i.test((x.url||'')+' '+(x.title||'')));
  if(target?.webSocketDebuggerUrl)break;}catch{}
  await new Promise(r=>setTimeout(r,1000));}
 if(!target)throw Error('Installed app not running');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
 const expression=mode==='seed'
  ?"(function(){const btn=document.getElementById('p2AddStudent'),f=document.getElementById('p2StudentForm');if(!btn||!f)throw Error('Student Master form missing');btn.click();const n=document.getElementById('p2StudentName'),m=document.getElementById('p2StudentMobile');n.value='Upgrade test student';m.value='9876500001';f.requestSubmit();const d=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');return {ok:!!d.students?.some(s=>s.name==='Upgrade test student'&&s.mobile==='9876500001'),count:d.students?.length||0};})()"
  :"(function(){const d=JSON.parse(localStorage.getItem('annualEventRegistration.v1')||'{}');return {ok:!!d.students?.some(s=>s.name==='Upgrade test student'&&s.mobile==='9876500001'),version:document.title,count:d.students?.length||0};})()";
 const value=await new Promise((resolve,reject)=>{
  const t=setTimeout(()=>reject(Error('Probe timeout')),30000);
  ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id!==1)return;clearTimeout(t);
    if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));
    else resolve(m.result.result.value);});
  ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,returnByValue:true}}));
 });
 ws.close();
 assert.equal(value?.ok,true,'Upgrade lost an existing student from offline data');
 if(mode==='verify')assert.ok(String(value.version).includes('5.55'),'Installed title is stale: '+value.version);
 console.log('PASS installed app '+mode+': '+JSON.stringify(value));
}
run().catch(e=>{console.error('FAIL installed upgrade: '+e.message);process.exitCode=1});

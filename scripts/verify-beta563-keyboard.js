'use strict';
const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
  let target;
  for(let i=0;i<35;i++){
    try{
      const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      target=pages.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));
      if(target?.webSocketDebuggerUrl)break;
    }catch{}
    await delay(350);
  }
  assert.ok(target?.webSocketDebuggerUrl,'Packaged Windows app unavailable');
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  const callbacks=new Map();let serial=0;
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(String(event.data)),cb=callbacks.get(msg.id);
    if(cb){callbacks.delete(msg.id);cb(msg)}
  });
  const send=(method,params={})=>new Promise((ok,bad)=>{
    const id=++serial;
    const timer=setTimeout(()=>{callbacks.delete(id);bad(Error('CDP timeout '+method))},25000);
    callbacks.set(id,msg=>{
      clearTimeout(timer);
      if(msg.error||msg.result?.exceptionDetails)bad(Error(JSON.stringify(msg.error||msg.result.exceptionDetails)));
      else ok(msg.result);
    });
    ws.send(JSON.stringify({id,method,params}));
  });
  const run=async code=>{
    const r=await send('Runtime.evaluate',{expression:code,awaitPromise:true,returnByValue:true});
    return r.result.value;
  };
  try{
    await send('Page.enable');
    assert.equal(await run(`(()=>{
      const navigate=document.querySelector('.go[data-go="studentProgress"]');
      if(!navigate)throw Error('Student Progress navigation missing');
      navigate.click();return true;
    })()`),true,'navigate to Student Progress');
    await delay(350);
    assert.equal(await run(`(()=>{
      const tab=document.getElementById('p2v520Followups');
      if(!tab)throw Error('Student Wise tab missing');
      tab.click();
      const input=document.getElementById('p2v526Search');
      if(!input)throw Error('Student Wise search field missing');
      input.focus();
      return document.activeElement===input;
    })()`),true,'search focus');
    for(const character of 'Urvash'){
      await send('Input.insertText',{text:character});
      assert.equal(await run(`document.activeElement?.id==='p2v526Search'`),true,'Search must retain focus after '+character);
    }
    assert.equal(await run(`document.getElementById('p2v526Search')?.value`),'Urvash','typing must accumulate');
    assert.equal(await run(`document.querySelectorAll('#p2v526Search').length`),1,'Search must not be replaced');
    console.log('PASS packaged Windows physical-like typing in Student Wise: focus retained across every keystroke');
  }finally{ws.close()}
}
main().catch(e=>{console.error('FAIL Student Wise typing '+e.stack);process.exitCode=1});

'use strict';
(function verifyV577Desktop(){
  'use strict';
  const assert=require('node:assert/strict'),fs=require('node:fs');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function test(){
    let page;const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
    for(let n=0;n<45;n++){
      try{
        const all=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
        page=all.find(p=>p.type==='page'&&/index.html|Ananda/i.test((p.title||'')+' '+(p.url||'')));
        if(page?.webSocketDebuggerUrl)break;
      }catch{}
      await sleep(350);
    }
    assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows app not available for Permanent Records test');
    const ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
    let serial=0;const pending=new Map();
    ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});
    const call=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++serial,t=setTimeout(()=>{pending.delete(id);reject(Error('DevTools timeout '+method))},23000);
      pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)reject(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else resolve(m.result)});
      ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expr=>(await call('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true})).result.value;
    try{
      const initial=await evaluate(`(()=>{
        const nav=document.querySelector('aside');
        const baseline={width:Math.round(nav.getBoundingClientRect().width),background:getComputedStyle(nav).backgroundImage,
          menu:[...nav.querySelectorAll('nav button')].map(x=>x.textContent.trim())};
        document.querySelector('aside .nav-btn[data-page="classes"]').click();
        const approvedClasses=[...document.querySelectorAll('#classes .p2-home-card')].map(b=>({
          id:b.id||b.dataset.go,icon:!!b.querySelector('.p2v570-tile-icon svg'),
          layout:getComputedStyle(b).flexDirection
        }));
        document.querySelector('aside .nav-btn[data-page="permanentRecords"]').click();
        const sec=document.getElementById('permanentRecords'),grid=sec.querySelector('.p2-master-grid');
        const cards=[...grid.querySelectorAll('button[data-go]')].map(b=>{
          const icon=b.querySelector('.v577-icon'),svg=icon?.querySelector('svg'),label=b.querySelector('strong');
          return {id:b.dataset.go,title:label?.textContent.trim(),box:{x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height},
            iconY:icon?.getBoundingClientRect().top,labelY:label?.getBoundingClientRect().top,
            iconSvg:!!svg,svgPaths:svg?.querySelectorAll('path').length||0,
            iconBg:icon?getComputedStyle(icon).backgroundColor:'',flex:getComputedStyle(b).flexDirection,
            arrow:!!b.querySelector('.v577-chevron'),clickable:typeof b.onclick==='function',
            border:getComputedStyle(b).borderTopWidth
          };
        });
        const lock=document.getElementById('v51SecurityButton'),back=document.getElementById('backButton'),h=getComputedStyle(document.querySelector('.topbar'));
        const after={width:Math.round(nav.getBoundingClientRect().width),background:getComputedStyle(nav).backgroundImage,
          menu:[...nav.querySelectorAll('nav button')].map(x=>x.textContent.trim())};
        return {baseline,after,cards,columns:getComputedStyle(grid).gridTemplateColumns,display:getComputedStyle(grid).display,
          w:window.innerWidth,permanentActive:sec.classList.contains('active'),
          subtitle:document.getElementById('pageSubtitle')?.textContent,
          goldLine:{thickness:h.borderBottomWidth,color:h.borderBottomColor},
          lock:{shown:getComputedStyle(lock).display,caption:lock.textContent,clickable:typeof lock.onclick==='function'},
          back:{shown:getComputedStyle(back).display,clickable:typeof back.onclick==='function'},
          classes:approvedClasses
        };
      })()`);
      assert.deepEqual(initial.baseline,initial.after,'Frozen sidebar changed in 5.77');
      assert.equal(initial.permanentActive,true,'Permanent Records did not open');
      assert.equal(initial.cards.length,10,'Ten permanent master buttons are required');
      assert.equal(initial.display,'grid','Master layout is not a button grid');
      const expected=['attendeeMaster','volunteers','vips','students','acharyas','kriyabans','kriya2Master','kriya3Master','kriya4Master','sttMaster'];
      assert.deepEqual(initial.cards.map(c=>c.id),expected,'Approved master order changed');
      assert.ok(initial.cards.every(c=>c.iconSvg&&c.arrow&&c.flex==='column'&&c.border==='1px'&&c.clickable),
        'Cards missing icon, arrow, vertical alignment or existing navigation: '+JSON.stringify(initial.cards));
      assert.ok(initial.cards.every(c=>c.labelY>c.iconY),'Icon must be above label, not alongside it');
      assert.ok(initial.cards.every(c=>c.iconBg==='rgb(255, 242, 198)'),'Yellow icon circles missing');
      assert.ok(initial.cards.slice(5,9).every(c=>c.svgPaths>=6),'Kriya lotus needs distinctly drawn petals');
      if(initial.w>1040){
        assert.ok(initial.cards.slice(0,5).every(c=>Math.abs(c.box.y-initial.cards[0].box.y)<3),'First five cards must form one row');
        assert.ok(initial.cards.slice(5).every(c=>Math.abs(c.box.y-initial.cards[5].box.y)<3),'Second five cards must form one row');
        assert.ok(initial.cards[5].box.y>initial.cards[0].box.y+130,'Second row must sit below first');
      }
      assert.equal(initial.goldLine.thickness,'4px','Header yellow line missing');
      assert.equal(initial.goldLine.color,'rgb(255, 195, 41)','Header yellow line not using approved accent');
      assert.ok(initial.subtitle.toLowerCase().includes('master lists for events'),'Approved header description missing');
      assert.notEqual(initial.lock.shown,'none','Master Lock must be visible in Permanent Records');
      assert.equal(initial.lock.clickable,true,'Existing password lock handler not preserved');
      assert.ok(/MASTER LOCK|LOCK MASTER LISTS/.test(initial.lock.caption),'Master Lock label incorrect');
      assert.notEqual(initial.back.shown,'none','Existing Back control missing');
      assert.equal(initial.back.clickable,true);
      assert.equal(initial.classes.length,6,'Classes cards altered or missing');
      assert.ok(initial.classes.every(x=>x.icon),'Approved Classes icons were modified');
      const navTest=await evaluate(`(()=>{
        const btn=document.querySelector('#permanentRecords button[data-go="attendeeMaster"]');
        btn.click();
        const modal=document.getElementById('v51SecurityModal');
        const protectedMode=modal?.classList.contains('open');
        const page=document.getElementById('attendeeMaster')?.classList.contains('active');
        if(protectedMode)document.getElementById('v51SecurityCancel')?.click();
        return {protectedMode,opened:page,stillHasOriginalButton:!!btn.onclick};
      })()`);
      assert.ok(navTest.protectedMode||navTest.opened,'Original attendee master button fails to open or ask for password');
      assert.equal(navTest.stillHasOriginalButton,true);
      await evaluate(`document.querySelector('aside .nav-btn[data-page="permanentRecords"]').click()`);
      fs.mkdirSync('verification',{recursive:true});
      const screenshot=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
      if(screenshot?.data)fs.writeFileSync('verification/beta577-approved-permanent-master-cards.png',Buffer.from(screenshot.data,'base64'));
      console.log('PASS beta 5.77 Windows: ten icon-above-title buttons in 5×2 grid, detailed lotus petals, master lock, old master navigation, untouched Classes and frozen sidebar');
    }finally{ws.close()}
  }
  test().catch(e=>{console.error('FAIL beta 5.77 master button visual/navigation test',e.stack||e);process.exitCode=1});
})();

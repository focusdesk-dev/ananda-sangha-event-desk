'use strict';
(function verify576Desktop(){
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function runTests(){
  const port=Number(process.env.ANANDA_DEVTOOLS_PORT||9223);
  let page;
  for(let i=0;i<45;i++){
    try{
      const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      page=pages.find(x=>x.type==='page'&&/index.html|Ananda/i.test((x.title||'')+' '+(x.url||'')));
      if(page?.webSocketDebuggerUrl)break;
    }catch{}
    await sleep(350);
  }
  assert.ok(page?.webSocketDebuggerUrl,'Packaged Windows application is unavailable');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let seq=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data)),fn=pending.get(m.id);if(fn){pending.delete(m.id);fn(m)}});
  const call=(method,params={})=>new Promise((ok,bad)=>{
    const id=++seq,t=setTimeout(()=>{pending.delete(id);bad(Error('DevTools timeout: '+method))},22000);
    pending.set(id,m=>{clearTimeout(t);if(m.error||m.result?.exceptionDetails)bad(Error(JSON.stringify(m.error||m.result.exceptionDetails)));else ok(m.result)});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evalJS=async js=>(await call('Runtime.evaluate',{expression:js,awaitPromise:true,returnByValue:true})).result.value;
  try{
    const checked=await evalJS(`(()=>{
      const sidebar=document.querySelector('aside');
      const before={background:getComputedStyle(sidebar).backgroundImage,width:Math.round(sidebar.getBoundingClientRect().width),labels:[...sidebar.querySelectorAll('nav button')].map(b=>b.textContent.trim())};
      const nav=id=>document.querySelector('aside .nav-btn[data-page="'+id+'"]')?.click();
      const header=()=>{const b=getComputedStyle(document.querySelector('.topbar'));return {width:b.borderBottomWidth,color:b.borderBottomColor,style:b.borderBottomStyle};};
      const snapshots={};
      nav('classes');
      const tile=document.getElementById('p2ClassesAttendance');
      const icon=()=>({svg:tile?.querySelector('.p2v570-tile-icon svg')?.outerHTML||'',count:tile?.querySelectorAll('.p2v570-tile-icon').length});
      const first=icon();
      let transitions=[];
      for(let i=0;i<6;i++){
        tile.click();
        const opened=icon();
        nav('classes');
        const returned=icon();
        transitions.push({openedIcon:!!opened.svg,returnedIcon:!!returned.svg,sameIcon:returned.svg===first.svg,iconCount:returned.count});
      }
      document.querySelector('#classes .p2-home-card[data-go="studentProgress"]')?.click();
      snapshots.progress={active:document.getElementById('studentProgress')?.classList.contains('active'),header:header(),panels:document.querySelectorAll('#studentProgress .p2v520-main').length};
      nav('classes');
      document.getElementById('p2ClassesReports')?.click();
      snapshots.reports={active:document.getElementById('classReportsHub')?.classList.contains('active'),header:header(),table:!!document.getElementById('v574Tbody')};
      nav('classes');
      document.getElementById('p2v548ManageCourseNames')?.click();
      const courseCard=document.querySelector('#courseMaster>.card');
      snapshots.courses={active:document.getElementById('courseMaster')?.classList.contains('active'),header:header(),
         pseudo:getComputedStyle(courseCard,'::before').content,display:getComputedStyle(courseCard,'::before').display,
         duplicatedDescriptions:document.querySelectorAll('#p2CourseList .p2-course-row p').length};
      nav('permanentRecords');
      const directory=document.querySelector('#permanentRecords .p2-master-grid');
      const buttons=[...directory.querySelectorAll('button[data-go]')];
      snapshots.permanent={active:document.getElementById('permanentRecords')?.classList.contains('active'),header:header(),
        buttons:buttons.map(x=>({id:x.dataset.go,label:x.querySelector('strong')?.textContent.trim(),width:Math.round(x.getBoundingClientRect().width),
          borderBottom:getComputedStyle(x).borderBottomStyle,background:getComputedStyle(x).backgroundColor})),
        columns:getComputedStyle(directory).display,
        directoryWidth:Math.round(directory.getBoundingClientRect().width),
        descriptionHidden:buttons.every(x=>!x.querySelector('small')||getComputedStyle(x.querySelector('small')).display==='none'),
        iconsHidden:buttons.every(x=>getComputedStyle(x.querySelector('.action-no')).display==='none'),
        eventBannerHidden:getComputedStyle(document.querySelector('#permanentRecords #eventBanner')).display==='none',
        countLineHidden:getComputedStyle(document.querySelector('#permanentRecords>.rams-meta')).display==='none'
      };
      const after={background:getComputedStyle(sidebar).backgroundImage,width:Math.round(sidebar.getBoundingClientRect().width),labels:[...sidebar.querySelectorAll('nav button')].map(b=>b.textContent.trim())};
      return {before,after,first,transitions,snapshots};
    })()`);
    assert.deepEqual(checked.after,checked.before,'Frozen left blue taskbar changed');
    assert.ok(checked.first.svg.includes('<svg'),JSON.stringify(checked.first));
    assert.ok(checked.transitions.every(x=>x.openedIcon&&x.returnedIcon&&x.sameIcon&&x.iconCount===1),'Attendance icon disappears after opening/returning: '+JSON.stringify(checked.transitions));
    for(const [id,item]of Object.entries(checked.snapshots)){
      assert.equal(item.active,true,id+' page did not open');
      const h=item.header;
      assert.equal(h.width,'4px',id+' has no standard yellow header line');
      assert.equal(h.color,'rgb(255, 195, 41)',id+' yellow header accent is inconsistent');
      assert.equal(h.style,'solid',id+' yellow header accent not solid');
    }
    assert.equal(checked.snapshots.courses.duplicatedDescriptions,0,'Course metadata repeated on list');
    assert.ok(['none','normal'].includes(checked.snapshots.courses.pseudo)||checked.snapshots.courses.display==='none','Course card has unwanted yellow strip');
    assert.equal(checked.snapshots.permanent.buttons.length,10,'Permanent records must show ten master rows');
    assert.equal(checked.snapshots.permanent.columns,'block','Permanent records are still a card grid');
    assert.ok(checked.snapshots.permanent.buttons.every(x=>x.width>checked.snapshots.permanent.directoryWidth*0.9),'Master items not full-width rows');
    assert.equal(checked.snapshots.permanent.descriptionHidden,true,'Duplicate master descriptions still visible');
    assert.equal(checked.snapshots.permanent.iconsHidden,true,'Decorative master list numbers still visible');
    assert.equal(checked.snapshots.permanent.eventBannerHidden,true,'Duplicate permanent-records heading/banner still visible');
    assert.equal(checked.snapshots.permanent.countLineHidden,true,'Redundant count strip still visible');
    assert.deepEqual(checked.snapshots.permanent.buttons.map(x=>x.label),[
      'ATTENDEES','VOLUNTEERS','VIPS','STUDENTS','ACHARYAS','KRIYABANS','KRIYA 2','KRIYA 3','KRIYA 4','STT'
    ]);
    fs.mkdirSync('verification',{recursive:true});
    const shot=await call('Page.captureScreenshot',{format:'png',fromSurface:true});
    if(shot?.data)fs.writeFileSync('verification/beta576-permanent-records.png',Buffer.from(shot.data,'base64'));
    console.log('PASS 5.76 Windows: one full-width gold header on Student Progress / Class Reports / Course Master / Permanent Records; 10 compact rows; six Attendance icon cycles; exact frozen sidebar',JSON.stringify({transitions:checked.transitions,headers:Object.fromEntries(Object.entries(checked.snapshots).map(([k,x])=>[k,x.header])),rows:checked.snapshots.permanent.buttons.map(x=>x.label)}));
  }finally{ws.close()}
}
runTests().catch(e=>{console.error('FAIL 5.76 visual/navigation regression',e.stack||e);process.exitCode=1});
})();

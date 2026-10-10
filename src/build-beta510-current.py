from pathlib import Path
import json,re

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA58 ATTENDANCE QR' not in html:
    raise SystemExit('Beta 5.8 attendance marker not found')
if 'PHASE2 BETA510 CURRENT APPROVED' in html:
    print('Beta 5.10 already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''
  // PHASE2 BETA510 CURRENT APPROVED
  // Approved 10 Oct flow: simplified attendance, year folders, two-step events,
  // one-QR phone upload, clean sidebar, class-only reports and visible absent state.

  (function p2v510Sidebar(){
    const nav=document.querySelector('aside nav');if(!nav)return;
    const dashboard=nav.querySelector('[data-page="dashboard"]');if(dashboard)dashboard.remove();
    const order=[['classes','01'],['events','02'],['permanentRecords','03'],['phase2Reports','04'],['settings','05']];
    order.forEach(([id,no])=>{const b=nav.querySelector(`[data-page="${id}"]`);if(b){const s=b.querySelector('span');if(s)s.textContent=no}});
    const brand=document.querySelector('aside .brand');if(brand){brand.style.cursor='pointer';brand.tabIndex=0;brand.setAttribute('role','button');brand.setAttribute('aria-label','Go to dashboard');brand.onclick=()=>switchPage('dashboard');brand.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();switchPage('dashboard')}}}
  })();

  let p2v510EventView='landing';
  let p2v510EventYear='';
  const p2v510EditEventBase=editEvent;
  function p2v510EventYears(ev){return [...new Set(eventDates(ev).map(d=>String(d||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))];}
  function p2v510EnsureEventLanding(){
    const page=$('events');if(!page||$('p2v510EventLanding'))return;
    const grid=page.querySelector('.grid.two');if(!grid)return;grid.id='p2v510EventOriginal';
    const landing=document.createElement('div');landing.id='p2v510EventLanding';landing.className='p2v510-event-landing';
    landing.innerHTML=`<div class="p2-home-grid"><button id="p2v510CreateEvent" class="p2-home-card" type="button"><span class="no">01</span><div><strong>Create Event</strong><br><small>Create a new annual or multi-day event.</small></div></button><button id="p2v510OpenEvent" class="p2-home-card" type="button"><span class="no">02</span><div><strong>Open Event</strong><br><small>Open or edit an event already created.</small></div></button></div>`;
    page.insertBefore(landing,grid);
    $('p2v510CreateEvent').onclick=()=>{resetEventForm();p2v510EventView='create';p2v510RenderEventView()};
    $('p2v510OpenEvent').onclick=()=>{p2v510EventView='open';p2v510EventYear='';p2v510RenderEventView()};
  }
  function p2v510RenderEventView(){
    p2v510EnsureEventLanding();const page=$('events'),landing=$('p2v510EventLanding'),grid=$('p2v510EventOriginal');if(!page||!landing||!grid)return;
    const form=$('eventForm'),listCard=$('eventList')?.closest('.card');
    landing.style.display=p2v510EventView==='landing'?'block':'none';grid.style.display=p2v510EventView==='landing'?'none':'grid';
    if(form)form.style.display=(p2v510EventView==='create'||p2v510EventView==='edit')?'block':'none';
    if(listCard)listCard.style.display=p2v510EventView==='open'?'block':'none';
    if(p2v510EventView==='open'&&listCard){grid.style.gridTemplateColumns='1fr';listCard.style.width='100%'}else grid.style.gridTemplateColumns='1fr';
  }
  editEvent=function(id){p2v510EditEventBase(id);p2v510EventView='edit';p2v510RenderEventView()};
  renderEvents=function(){
    p2v510EnsureEventLanding();$('orgName').value='ANANDA SANGHA GURGAON';
    const host=$('eventList');if(!host){return}
    const years=[...new Set(state.events.flatMap(p2v510EventYears))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    if(!p2v510EventYear){
      host.innerHTML=years.length?`<div class="p2v510-year-grid">${years.map(y=>{const count=state.events.filter(e=>p2v510EventYears(e).includes(y)).length;return `<button type="button" class="p2v510-year-card" data-year="${esc(y)}"><span>YEAR</span><strong>${esc(y)}</strong><small>${count} event${count===1?'':'s'} · Double-click to view</small></button>`}).join('')}</div>`:'<div class="empty">No annual event has been created.</div>';
      host.querySelectorAll('.p2v510-year-card').forEach(card=>{card.ondblclick=()=>{p2v510EventYear=card.dataset.year;renderEvents()};card.onkeydown=e=>{if(e.key==='Enter'){p2v510EventYear=card.dataset.year;renderEvents()}}});
      return
    }
    const events=state.events.filter(e=>p2v510EventYears(e).includes(p2v510EventYear)).slice().sort((a,b)=>String(eventDates(b)[0]||'').localeCompare(String(eventDates(a)[0]||'')));
    host.innerHTML=`<div class="p2v510-year-open-head"><div><span>YEAR · ${esc(p2v510EventYear)}</span><h3>${esc(p2v510EventYear)} Events</h3><p>${events.length} event${events.length===1?'':'s'}</p></div><button id="p2v510BackEventYears" class="btn secondary small" type="button">← Back to Years</button></div><div class="p2v510-event-list">${events.map(e=>`<div class="p2v510-event-row"><div><div class="name">${esc(e.name)}</div><div class="sub">${eventDateText(e)} · ${esc(e.venue||'No venue')}</div></div><div class="actions"><button class="btn secondary small event-open" data-id="${e.id}">Open Event</button><button class="btn ghost small event-edit" data-id="${e.id}">Edit Settings</button></div></div>`).join('')}</div>`;
    $('p2v510BackEventYears').onclick=()=>{p2v510EventYear='';renderEvents()};
    host.querySelectorAll('.event-open').forEach(b=>b.onclick=()=>{state.activeEventId=b.dataset.id;save();switchPage('eventWorkspace')});
    host.querySelectorAll('.event-edit').forEach(b=>b.onclick=()=>editEvent(b.dataset.id))
  };

  let p2v510ClassYear='';
  p2RenderClasses=function(){
    if(!$('p2ClassList'))return;if(typeof p2v55SyncBatchStatuses==='function')p2v55SyncBatchStatuses();
    const cf=$('p2CourseFilter'),keep=cf?.value||'all';
    if(cf){cf.innerHTML='<option value="all">All Courses</option>'+state.courseTypes.filter(c=>c.active!==false).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');cf.value=[...cf.options].some(o=>o.value===keep)?keep:'all'}
    const course=cf?.value||'all',records=state.classBatches.filter(b=>course==='all'||String(b.courseId)===course),grouped={};records.forEach(b=>{const y=String(p2BatchYear(b)||'Unknown');(grouped[y]||(grouped[y]=[])).push(b)});
    const years=Object.keys(grouped).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})),host=$('p2ClassList');
    if(!p2v510ClassYear||!grouped[p2v510ClassYear]){
      p2v510ClassYear='';host.innerHTML=years.length?`<div class="p2v510-year-grid">${years.map(y=>{const list=grouped[y],active=list.filter(p2v56ChatActive).length;return `<button type="button" class="p2v510-year-card p2v510-class-year" data-year="${esc(y)}"><span>YEAR</span><strong>${esc(y)}</strong><small>${list.length} class${list.length===1?'':'es'} · ${active} active/upcoming</small></button>`}).join('')}</div>`:'<div class="p2-empty">No classes available.</div>';
      host.querySelectorAll('.p2v510-class-year').forEach(card=>card.onclick=()=>{p2v510ClassYear=card.dataset.year;p2RenderClasses()});return
    }
    const list=grouped[p2v510ClassYear],active=list.filter(p2v56ChatActive).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||''))),inactive=list.filter(b=>!p2v56ChatActive(b)).sort((a,b)=>String(b.start||'').localeCompare(String(a.start||'')));
    host.innerHTML=`<div class="p2v510-year-open-head"><div><span>YEAR · ${esc(p2v510ClassYear)}</span><h3>${esc(p2v510ClassYear)} Classes</h3><p>${active.length} Active / Upcoming · ${inactive.length} Inactive / Completed</p></div><button id="p2v510BackClassYears" class="btn secondary small" type="button">← Back to Years</button></div><div class="p2v56-chat-section-title">Active &amp; Upcoming</div>${active.length?`<div class="p2v56-chat-class-list">${active.map(p2v56ChatClassCard).join('')}</div>`:'<div class="p2-empty">No active or upcoming classes.</div>'}<div class="p2v56-chat-section-title muted">Inactive &amp; Completed</div>${inactive.length?`<div class="p2v56-chat-class-list">${inactive.map(p2v56ChatClassCard).join('')}</div>`:'<div class="p2-empty">No inactive or completed classes.</div>'}`;
    $('p2v510BackClassYears').onclick=()=>{p2v510ClassYear='';p2RenderClasses()};
    host.querySelectorAll('.p2v56-chat-class').forEach(card=>{card.onclick=e=>{if(e.target.closest('button'))return;p2v56ChatSelectedClass=card.dataset.id;host.querySelectorAll('.p2v56-chat-class').forEach(x=>x.classList.toggle('selected',x===card))};card.ondblclick=e=>{if(!e.target.closest('button'))p2v56ChatOpenBatch(card.dataset.id)};card.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();p2v56ChatOpenBatch(card.dataset.id)}}});
    host.querySelectorAll('.p2v56-chat-edit').forEach(x=>x.onclick=e=>{e.stopPropagation();p2OpenBatch(x.dataset.id)})
  };
  if($('p2ClassBatches'))$('p2ClassBatches').onclick=()=>{p2v510ClassYear='';p2RenderClasses();$('p2BatchListCard')?.scrollIntoView({behavior:'smooth'})};

  function p2v510AttendanceSaved(){return p2v58CurrentRows().some(({en})=>en.attendance&&Object.prototype.hasOwnProperty.call(en.attendance,p2v58Date))}
  function p2v510AttendanceNotice(){
    let n=$('p2v510AttendanceNotice');const actions=$('p2v58Manual')?.closest('.p2v58-actions');if(!actions)return;
    if(!n){n=document.createElement('div');n.id='p2v510AttendanceNotice';n.className='p2v510-att-saved';actions.insertAdjacentElement('afterend',n)}
    const saved=p2v510AttendanceSaved();n.classList.toggle('hidden',!saved);n.innerHTML=saved?'<b>✓ Attendance already saved</b> — editing enabled.':'';
    if($('p2v58Confirm'))$('p2v58Confirm').textContent=saved?'UPDATE ATTENDANCE':'CONFIRM ATTENDANCE'
  }
  p2v58RenderRoster=function(){
    const host=$('p2v58Roster');if(!host)return;const rows=p2v58CurrentRows(),half=Math.ceil(rows.length/2),left=rows.slice(0,half),right=rows.slice(half);
    const rowHtml=(r,i)=>{const v=p2v58Draft[r.en.id],cls=v===true?' present':v===false?' absent':' pending';return `<label class="p2v58-row${cls}" data-search="${esc(((r.p.name||'')+' '+(r.p.mobile||'')).toLowerCase())}"><span class="p2v58-no">${String(i+1).padStart(2,'0')}</span><span class="p2v58-name">${esc(r.p.name||'Unnamed')}</span><input class="p2v58-check" type="checkbox" data-en="${r.en.id}" ${v===true?'checked':''}><span class="p2v58-box"></span></label>`};
    host.innerHTML=rows.length?`<div class="p2v58-namebar">NAME</div><div class="p2v58-two"><div>${left.map((r,i)=>rowHtml(r,i)).join('')}</div><div>${right.map((r,i)=>rowHtml(r,i+half)).join('')}</div></div>`:'<div class="p2-empty">No students are enrolled in this batch.</div>';
    host.querySelectorAll('.p2v58-check').forEach(x=>x.onchange=()=>{p2v58Draft[x.dataset.en]=x.checked?true:null;p2v58RenderRoster()});p2v58ApplySearch();p2v58UpdateTotals();p2v510AttendanceNotice()
  };
  p2v58UpdateTotals=function(){const rows=p2v58CurrentRows(),present=rows.filter(r=>p2v58Draft[r.en.id]===true).length,absent=rows.filter(r=>p2v58Draft[r.en.id]===false).length,pending=Math.max(0,rows.length-present-absent),x=$('p2v58Totals');if(x)x.innerHTML=`<span>Total: <b>${rows.length}</b></span><span class="green">Present: <b>${present}</b></span><span class="red">Absent: <b>${absent}</b></span><span class="pending">Unmarked: <b>${pending}</b></span>`};
  p2v58SaveAttendance=function(){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}const rows=p2v58CurrentRows(),pending=rows.filter(r=>p2v58Draft[r.en.id]!==true&&p2v58Draft[r.en.id]!==false).length;if(pending){toast('Mark remaining absent before confirming attendance.');return}
    const wasSaved=p2v510AttendanceSaved();rows.forEach(({en})=>{en.attendance=en.attendance||{};en.attendance[p2v58Date]=p2v58Draft[en.id]===true});save();toast(wasSaved?'Attendance updated everywhere':'Attendance confirmed everywhere');p2v510AttendanceNotice()
  };
  function p2v510WireAttendance(){
    if($('p2v58Clear'))$('p2v58Clear').onclick=()=>{p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster()};
    if($('p2v58All')){$('p2v58All').textContent='MARK REMAINING ABSENT';$('p2v58All').onclick=()=>{p2v58CurrentRows().forEach(r=>{if(p2v58Draft[r.en.id]!==true&&p2v58Draft[r.en.id]!==false)p2v58Draft[r.en.id]=false});p2v58RenderRoster()}};
    if($('p2v58Confirm'))$('p2v58Confirm').onclick=()=>p2v58SaveAttendance();
    p2v510AttendanceNotice()
  }
  p2v510WireAttendance();

  const p2v510ParsePayloadBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    const direct=p2v510ParsePayloadBase(raw);if(direct)return direct;
    try{const u=new URL(String(raw));const a=u.searchParams.get('a');if(!a)return null;const pad='='.repeat((4-a.length%4)%4),json=atob(a.replace(/-/g,'+').replace(/_/g,'/')+pad),meta=JSON.parse(decodeURIComponent(escape(json)));return p2v510ParsePayloadBase(meta.payload||'')}catch{return null}
  };
  p2v58PrintSheet=async function(){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}const rows=p2v58CurrentRows();if(!rows.length){toast('No students enrolled in this batch');return}
    const chunks=[];for(let i=0;i<rows.length;i+=40)chunks.push(rows.slice(i,i+40));const logo=await p2v58LogoData(),session=p2v58SessionNo(b,p2v58Date),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const payload=p2v58Payload(b,p2v58Date,pi+1,chunks.length),meta={payload,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),sheet:pi+1,total:chunks.length},link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),qrText=link?.ok&&link.url?link.url:payload,qr=await p2v58MakeQr(qrText,120),chunk=chunks[pi],left=chunk.slice(0,20),right=chunk.slice(20,40);
      const list=(arr,offset)=>arr.map((r,i)=>`<div class="att-row"><span class="num">${String(pi*40+offset+i+1).padStart(2,'0')}</span><span class="mark"></span><span class="nm">${esc(r.p.name||'Unnamed')}</span></div>`).join('');
      pages.push(`<section class="sheet"><header><div class="brand">${logo?`<img src="${logo}">`:''}<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="${qr}"><small>SCAN TO UPLOAD · ${pi+1}/${chunks.length}</small></div></header><div class="meta"><div><b>${esc(p2CourseName(b).toUpperCase())} · ${esc(String(b.name).toUpperCase())}</b><small>SESSION ${session}</small></div><div class="date"><b>${esc(fmt(p2v58Date))}</b></div></div><div class="namehead">NAME</div><div class="cols"><div>${list(left,0)}</div><div>${list(right,20)}</div></div><div class="sheetno">Sheet ${pi+1} of ${chunks.length}</div></section>`)
    }
    const printHtml=`<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#062b72}.sheet{position:relative;min-height:277mm;border:1px solid #d9e5f1;padding:6mm;page-break-after:always}.sheet:last-child{page-break-after:auto}header{display:grid;grid-template-columns:1fr 1.4fr 1fr;align-items:center;border-bottom:1px solid #cbd9e8;padding-bottom:4mm}.brand{display:flex;align-items:center;gap:8px;font-size:15px}.brand img{width:28px;height:28px;border-radius:50%}h1{font-size:16px;text-align:center;margin:0}.qr{text-align:right}.qr img{width:26mm;height:26mm;display:block;margin-left:auto}.qr small{display:block;text-align:center;width:34mm;margin-left:auto;font-size:6px}.meta{display:grid;grid-template-columns:1fr 1.2fr;gap:4mm;margin:3mm 0}.meta>div{background:#f3f8fc;border:1px solid #dce7f1;border-radius:6px;padding:3mm 4mm}.meta small{display:block;margin-top:2px;font-size:9px}.date{display:flex;align-items:center}.namehead{background:#144d94;color:white;text-align:center;font-weight:700;border-radius:4px;padding:2.2mm;margin-bottom:1.5mm}.cols{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.att-row{height:11.7mm;display:grid;grid-template-columns:10mm 12mm 1fr;align-items:center;padding:0 3mm;font-size:12px}.att-row:nth-child(odd){background:#f3f8fc}.num{font-size:9px}.mark{height:8mm}.nm{font-weight:700}.sheetno{position:absolute;right:7mm;bottom:4mm;font-size:8px;color:#71849a}</style></head><body>${pages.join('')}</body></html>`;
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };

  const p2v510DataUrlBase=p2v58HandleDataUrl;
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    if(attendancePayload){const ok=await p2v58ApplyQrRaw(attendancePayload,name);if(ok)return}
    return p2v510DataUrlBase(dataUrl,name)
  };
  p2v58PhoneListenerBound=false;
  p2v58BindPhoneListener=function(){
    if(p2v58PhoneListenerBound||!window.anandaAttendanceBridge?.onPhoneUpload)return;p2v58PhoneListenerBound=true;
    window.anandaAttendanceBridge.onPhoneUpload(payload=>{if(payload?.dataUrl){switchPage('classAttendanceHub');$('p2v58UploadPanel')?.classList.remove('hidden');p2v58HandleDataUrl(payload.dataUrl,payload.name||'Phone photo',payload.attendancePayload||'')}})
  };
  p2v58BindPhoneListener();

  const p2v510BackBase=$('backButton').onclick;
  $('backButton').onclick=()=>{if(page==='events'&&p2v510EventView!=='landing'){p2v510EventView='landing';p2v510EventYear='';p2v510RenderEventView();renderEvents();return}p2v510BackBase?.()};

  const p2v510SwitchBase=switchPage;
  switchPage=function(id){const previous=page;if(id==='events'&&previous!=='events'){p2v510EventView='landing';p2v510EventYear=''}const r=p2v510SwitchBase.apply(this,arguments);if(id==='events'){p2v510EnsureEventLanding();p2v510RenderEventView();renderEvents()}if(id==='classes'){p2v510ClassYear='';p2RenderClasses()}if(id==='classAttendanceHub'){p2v510WireAttendance();p2v58RenderRoster()}return r};

  (function p2v510Style(){
    const st=document.createElement('style');st.id='p2v510Style';st.textContent=`
      #classAttendanceHub .p2v58-title-row{display:none!important}
      #classAttendanceHub .p2v58-filters{grid-template-columns:repeat(3,1fr)!important}
      #classAttendanceHub .p2v58-date-only{display:none!important}
      #classAttendanceHub .p2v58-actions{grid-template-columns:repeat(3,1fr)!important}
      #p2v58Edit,#p2v58Save{display:none!important}
      .p2v510-att-saved{margin:10px 0 12px;padding:11px 14px;border-radius:9px;background:#edf9f1;border:1px solid #cbead5;color:#16723f;font-size:12px}.p2v510-att-saved.hidden{display:none!important}
      .p2v58-row.absent{background:#fff3f3!important}.p2v58-row.absent .p2v58-name{color:#9f2929}.p2v58-row.absent .p2v58-box{background:#e33434!important;border-color:#e33434!important}.p2v58-row.absent .p2v58-box:after{content:'×'!important;position:absolute;color:#fff;font-size:15px;font-weight:900;left:2px;top:-4px}
      .p2v58-row.pending .p2v58-box{background:#fff!important;border-color:#7891ad!important}.p2v58-row.pending .p2v58-box:after{content:''!important}
      .p2v510-year-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.p2v510-year-card{min-height:125px;border:1px solid #d8e4ee;border-radius:14px;background:#fff;text-align:left;padding:18px;cursor:pointer;color:#123f7d}.p2v510-year-card:hover{background:#f7fbff;border-color:#a9c6e5}.p2v510-year-card span{display:block;font-size:10px;font-weight:900;color:#178267}.p2v510-year-card strong{display:block;font-size:24px;margin:10px 0 6px}.p2v510-year-card small{color:#657b90}.p2v510-year-open-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.p2v510-year-open-head span{font-size:10px;font-weight:900;color:#178267}.p2v510-year-open-head h3{margin:5px 0;color:#123f7d}.p2v510-year-open-head p{margin:0;color:#657b90;font-size:12px}
      .p2v510-event-landing{margin-top:4px}.p2v510-event-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid var(--line)}.p2v510-event-row:last-child{border-bottom:0}
      #events #p2v510EventOriginal{grid-template-columns:1fr!important}#events #eventForm{max-width:none}
      aside .brand:focus{outline:2px solid #f2bf2d;outline-offset:5px;border-radius:8px}
      @media(max-width:900px){.p2v510-year-grid{grid-template-columns:1fr}#classAttendanceHub .p2v58-filters,#classAttendanceHub .p2v58-actions{grid-template-columns:1fr!important}}
    `;document.head.appendChild(st)
  })();
  p2v510EnsureEventLanding();p2v510RenderEventView();
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')

main=Path('src/main.js')
m=main.read_text(encoding='utf-8')
start=m.find('let attendancePhoneServer = null;')
end=m.find('app.whenReady().then(() => {',start)
if start<0 or end<0:
    raise SystemExit('Attendance server block not found')
server=r'''// BETA510 UNIFIED ATTENDANCE PHONE SERVER
let anandaAttendanceServer=null;
let anandaAttendanceServerInfo=null;
function anandaAttendanceIp(){
  const nets=os.networkInterfaces(),candidates=[];
  for(const group of Object.values(nets))for(const n of group||[]){
    const ipv4=n&&(n.family==='IPv4'||n.family===4),a=String(n?.address||'');
    if(!ipv4||n.internal||!a||a==='0.0.0.0'||a==='127.0.0.1'||a.startsWith('169.254.'))continue;
    let priority=9;if(a.startsWith('192.168.'))priority=1;else if(a.startsWith('10.'))priority=2;else{const mt=/^172\.(\d+)\./.exec(a);if(mt&&Number(mt[1])>=16&&Number(mt[1])<=31)priority=3}candidates.push({a,priority})
  }
  candidates.sort((x,y)=>x.priority-y.priority);return candidates[0]?.a||''
}
function anandaB64UrlEncode(obj){return Buffer.from(JSON.stringify(obj),'utf8').toString('base64url')}
function anandaB64UrlDecode(text){try{return JSON.parse(Buffer.from(String(text||''),'base64url').toString('utf8'))}catch{return null}}
function anandaMobilePage(meta,encoded){
  const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=!!(meta&&meta.payload),course=safe(meta?.course||''),batch=safe(meta?.batch||''),date=safe(meta?.date||'');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ananda Attendance Sheet</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#0d3979;background:radial-gradient(circle at 50% 22%,rgba(255,226,81,.30) 0 14%,rgba(255,226,81,.10) 15% 27%,transparent 28%),radial-gradient(circle at 50% 45%,#fff 0 40%,#f3f8fd 72%,#e8f2fb 100%);overflow-x:hidden}.halo{position:fixed;left:50%;top:-18vw;width:130vw;height:130vw;transform:translateX(-50%);border-radius:50%;border:13vw solid rgba(255,211,36,.10);box-shadow:0 0 80px rgba(255,205,38,.12);pointer-events:none}.mountains{position:fixed;left:0;right:0;bottom:0;height:19vh;background:linear-gradient(155deg,transparent 0 28%,rgba(165,198,230,.16) 29% 47%,transparent 48%),linear-gradient(205deg,transparent 0 31%,rgba(106,158,208,.12) 32% 55%,transparent 56%);pointer-events:none}.wrap{position:relative;z-index:1;width:min(92vw,520px);margin:0 auto;padding:calc(24px + env(safe-area-inset-top)) 0 28px}.brand{text-align:center;margin:12px 0 22px}.logo{width:86px;height:86px;border-radius:50%;margin:0 auto 14px;background:radial-gradient(circle,#153e8a 0 55%,#08296e 56%);border:13px solid #ffd735;box-shadow:0 0 25px rgba(255,204,35,.45),inset 0 0 15px rgba(54,139,255,.7);display:grid;place-items:center}.star{color:white;font-size:28px;line-height:1;text-shadow:0 0 10px #fff}.brand h1{margin:0;font-size:21px;letter-spacing:1.5px}.card{background:rgba(255,255,255,.90);border:1px solid rgba(203,221,238,.85);border-radius:24px;padding:22px;box-shadow:0 18px 50px rgba(20,61,112,.10);backdrop-filter:blur(8px)}h2{font-size:26px;margin:0 0 17px;text-align:center}.details{background:linear-gradient(135deg,#fff9e8,#f6fbff);border:1px solid #f0e3b6;border-radius:16px;padding:14px 16px;margin-bottom:18px;display:${has?'block':'none'}}.details b{display:block;font-size:16px;margin:4px 0}.details span{font-size:13px;color:#62778d}.btn{width:100%;min-height:58px;border-radius:14px;border:1px solid #b9cee3;background:#fff;color:#103f80;font-size:16px;font-weight:800;margin-top:12px}.btn.primary{border-color:#0d55a7;background:linear-gradient(135deg,#0e4a91,#0b63ba);color:#fff;box-shadow:0 8px 18px rgba(15,77,145,.16)}.or{display:flex;align-items:center;gap:10px;color:#687d92;font-size:13px;margin:14px 0 0}.or:before,.or:after{content:'';height:1px;background:#cbd9e6;flex:1}.hidden{display:none!important}.preview img{width:100%;max-height:52vh;object-fit:contain;border-radius:15px;border:1px solid #d9e5ef;background:#eef3f7}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.status{text-align:center;padding:34px 8px}.check{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;background:#e4f6e9;color:#168541;font-size:46px;font-weight:900}.spinner{width:54px;height:54px;border-radius:50%;border:6px solid #d6e4f1;border-top-color:#0d55a7;margin:15px auto;animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.bar{height:9px;border-radius:999px;background:#dce8f3;overflow:hidden;margin-top:20px}.bar:after{content:'';display:block;width:45%;height:100%;background:#0d55a7;border-radius:inherit;animation:load 1.2s ease-in-out infinite alternate}@keyframes load{to{transform:translateX(120%)}}small.note{display:block;text-align:center;color:#6a7f93;margin-top:12px;line-height:1.4}
  </style></head><body><div class="halo"></div><div class="mountains"></div><main class="wrap"><div class="brand"><div class="logo"><span class="star">★</span></div><h1>ANANDA SANGHA</h1></div><section id="pick" class="card"><h2>Attendance Sheet</h2><div class="details"><b>${course}${course&&batch?' · ':''}${batch}</b><span>${date}${meta?.sheet?' · Sheet '+safe(meta.sheet)+' of '+safe(meta.total||1):''}</span></div><button id="take" class="btn primary">TAKE PHOTO</button><div class="or">or</div><button id="choose" class="btn">CHOOSE FROM PHOTOS</button><input id="camera" class="hidden" type="file" accept="image/*" capture="environment"><input id="gallery" class="hidden" type="file" accept="image/*"></section><section id="preview" class="card preview hidden"><h2>Preview Photo</h2><img id="photo"><div class="row"><button id="retake" class="btn">RETAKE</button><button id="use" class="btn primary">USE PHOTO</button></div></section><section id="uploading" class="card status hidden"><div class="spinner"></div><h2>Uploading Attendance Sheet…</h2><div class="bar"></div><small class="note">Keep this phone and the laptop on the same Wi-Fi or hotspot.</small></section><section id="done" class="card status hidden"><div class="check">✓</div><h2>Uploaded Successfully</h2><p>Attendance sheet has been sent to Ananda Event Desk.</p><div class="details" style="display:${has?'block':'none'}"><b>${course}${course&&batch?' · ':''}${batch}</b><span>${date}</span></div><button id="another" class="btn primary">UPLOAD ANOTHER SHEET</button><button id="close" class="btn">CLOSE</button></section></main><script>
  const a=${JSON.stringify(encoded||'')};let selected=null;const $=id=>document.getElementById(id),show=id=>['pick','preview','uploading','done'].forEach(x=>$(x).classList.toggle('hidden',x!==id));
  $('take').onclick=()=>$('camera').click();$('choose').onclick=()=>$('gallery').click();
  function selectedFile(f){if(!f)return;selected=f;$('photo').src=URL.createObjectURL(f);show('preview')}$('camera').onchange=e=>selectedFile(e.target.files?.[0]);$('gallery').onchange=e=>selectedFile(e.target.files?.[0]);$('retake').onclick=()=>{$('camera').value='';$('camera').click()};
  $('use').onclick=async()=>{if(!selected)return;show('uploading');try{const fd=new FormData();fd.append('sheet',selected,selected.name||'attendance.jpg');const res=await fetch('/upload?a='+encodeURIComponent(a),{method:'POST',body:fd});if(!res.ok)throw Error(await res.text());show('done')}catch(e){alert('Upload failed. Keep the phone and laptop on the same Wi-Fi or hotspot.');show('preview')}};
  $('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{document.body.innerHTML='<div style="font-family:Arial;text-align:center;padding:55px;color:#123f7d"><h2>Attendance sheet uploaded.</h2><p>You can close this page.</p></div>'};
  </script></body></html>`
}
function anandaMultipartFile(buf,contentType){
  const m=/boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType||'');if(!m)return null;const boundary=Buffer.from('--'+(m[1]||m[2]).trim());let pos=buf.indexOf(boundary);
  while(pos>=0){const headerStart=pos+boundary.length+2,headerEnd=buf.indexOf(Buffer.from('\r\n\r\n'),headerStart);if(headerEnd<0)break;const header=buf.slice(headerStart,headerEnd).toString('utf8'),fileMatch=/filename="([^"]*)"/i.exec(header),typeMatch=/Content-Type:\s*([^\r\n]+)/i.exec(header),dataStart=headerEnd+4,next=buf.indexOf(boundary,dataStart);if(fileMatch&&next>dataStart)return{name:fileMatch[1]||'attendance.jpg',mime:(typeMatch?.[1]||'image/jpeg').trim(),data:buf.slice(dataStart,next-2)};pos=buf.indexOf(boundary,pos+boundary.length)}return null
}
async function anandaEnsureAttendanceServer(){
  const ip=anandaAttendanceIp();if(!ip)return{ok:false,error:'Connect this laptop to Wi-Fi or to the phone hotspot first.'};
  if(anandaAttendanceServer&&anandaAttendanceServerInfo){anandaAttendanceServerInfo.ip=ip;anandaAttendanceServerInfo.baseUrl='http://'+ip+':'+anandaAttendanceServerInfo.port+'/';return anandaAttendanceServerInfo}
  try{
    anandaAttendanceServer=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://local/'),encoded=u.searchParams.get('a')||'',meta=anandaB64UrlDecode(encoded);
      if(req.method==='GET'){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('ananda-attendance-phone-status',{status:'connected',remoteAddress:req.socket?.remoteAddress||''});res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(anandaMobilePage(meta,encoded))}
      if(req.method==='POST'&&u.pathname==='/upload'){const chunks=[];let size=0,tooBig=false;req.on('data',c=>{size+=c.length;if(size>25*1024*1024){tooBig=true;req.destroy()}else chunks.push(c)});req.on('end',()=>{if(tooBig)return;const file=anandaMultipartFile(Buffer.concat(chunks),req.headers['content-type']);if(!file){res.writeHead(400);return res.end('No image received')}const dataUrl='data:'+file.mime+';base64,'+file.data.toString('base64');if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.webContents.send('ananda-attendance-phone-status',{status:'received'});mainWindow.webContents.send('ananda-attendance-phone-upload',{name:file.name,mime:file.mime,dataUrl,attendancePayload:meta?.payload||'',sheet:meta?.sheet||1,total:meta?.total||1})}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}))});return}
      res.writeHead(404);res.end('Not found')
    }catch(e){res.writeHead(500);res.end('Upload error')}});
    await new Promise((resolve,reject)=>{anandaAttendanceServer.once('error',reject);anandaAttendanceServer.listen(8787,resolve)}).catch(async()=>{await new Promise((resolve,reject)=>{anandaAttendanceServer.once('error',reject);anandaAttendanceServer.listen(0,resolve)})});
    const port=anandaAttendanceServer.address().port;anandaAttendanceServerInfo={ok:true,ip,port,baseUrl:'http://'+ip+':'+port+'/'};return anandaAttendanceServerInfo
  }catch(error){try{anandaAttendanceServer?.close()}catch{}anandaAttendanceServer=null;anandaAttendanceServerInfo=null;return{ok:false,error:error?.message||String(error)}}
}
ipcMain.handle('ananda-attendance-start-upload-server',async()=>{const s=await anandaEnsureAttendanceServer();return s.ok?{...s,url:s.baseUrl}:s});
ipcMain.handle('ananda-attendance-prepare-sheet-link',async(_event,meta)=>{const s=await anandaEnsureAttendanceServer();if(!s.ok)return s;const encoded=anandaB64UrlEncode(meta||{});return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?a='+encodeURIComponent(encoded)}});
ipcMain.handle('ananda-attendance-stop-upload-server',async()=>({ok:true,persistent:true}));

'''
m=m[:start]+server+m[end:]
m=re.sub(r"const APP_VERSION = '[^']+';","const APP_VERSION = '2.0.0-beta.5.10';",m,count=1)
m=m.replace("app.on('before-quit', () => { try { attendancePhoneServer?.close(); } catch {} });","app.on('before-quit', () => { try { anandaAttendanceServer?.close(); } catch {} });")
main.write_text(m,encoding='utf-8')

pre=Path('src/preload.js')
s=pre.read_text(encoding='utf-8')
needle="  startPhoneUpload: () => ipcRenderer.invoke('ananda-attendance-start-upload-server'),"
if needle in s and 'prepareSheetLink' not in s:
    s=s.replace(needle,needle+"\n  prepareSheetLink: (meta) => ipcRenderer.invoke('ananda-attendance-prepare-sheet-link', meta),",1)
pre.write_text(s,encoding='utf-8')

pkgp=Path('src/package.json')
pkg=json.loads(pkgp.read_text(encoding='utf-8'))
pkg['version']='2.0.0-beta.5.10'
nsis=pkg.setdefault('build',{}).setdefault('nsis',{})
nsis['allowToChangeInstallationDirectory']=True
nsis['installerSidebar']='installer-sidebar.bmp'
nsis['uninstallerSidebar']='installer-sidebar.bmp'
nsis['installerHeader']='installer-header.bmp'
pkgp.write_text(json.dumps(pkg,indent=2)+'\n',encoding='utf-8')

print('BETA 5.10 CURRENT APPROVED PATCH APPLIED')

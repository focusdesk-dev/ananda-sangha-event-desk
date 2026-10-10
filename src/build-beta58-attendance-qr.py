from pathlib import Path
import json

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA57 REFINE' not in html:
    raise SystemExit('Beta 5.7 marker not found')
if 'PHASE2 BETA58 ATTENDANCE QR' in html:
    print('Beta 5.8 attendance QR patch already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

# Load QR libraries before the application inline scripts.
qr_tags='    <script src="qrcode-client.js"></script>\n    <script src="jsqr-client.js"></script>\n'
if 'qrcode-client.js' not in html:
    head_end=html.find('</head>')
    if head_end < 0:
        raise SystemExit('No </head> found for QR libraries')
    html=html[:head_end]+qr_tags+html[head_end:]

patch=r'''  // PHASE2 BETA58 ATTENDANCE QR — dedicated attendance page + offline QR workflow.
  let p2v58Course='';
  let p2v58Batch='';
  let p2v58Date='';
  let p2v58Draft={};
  let p2v58UploadLocked=false;
  let p2v58LastUploadName='';
  let p2v58PhoneUrl='';
  let p2v58PhoneQr='';
  let p2v58PhoneListenerBound=false;

  function p2v58Hash(text){
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0')
  }
  function p2v58Dates(b){return typeof p2v5ValidDates==='function'?p2v5ValidDates(b):[...new Set((b?.sessionDates||[]).filter(Boolean))].sort()}
  function p2v58Payload(b,date,sheet,totalSheets){
    const core=[String(b.id),String(date),String(sheet),String(totalSheets)].join('|');
    return JSON.stringify({v:1,kind:'ANANDA_ATTENDANCE',batchId:String(b.id),date:String(date),sheet:Number(sheet),totalSheets:Number(totalSheets),sessionId:String(b.id)+':'+String(date),verify:p2v58Hash(core)})
  }
  function p2v58ParsePayload(raw){
    try{
      const o=JSON.parse(raw);
      if(!o||o.kind!=='ANANDA_ATTENDANCE'||Number(o.v)!==1)return null;
      const core=[String(o.batchId),String(o.date),String(o.sheet),String(o.totalSheets)].join('|');
      if(String(o.verify)!==p2v58Hash(core))return null;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||'')))return null;
      return o
    }catch{return null}
  }
  function p2v58Batches(){
    return state.classBatches.slice().sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')))
  }
  function p2v58CourseKey(b){return String(b.courseId||p2CourseName(b)||'')}
  function p2v58CourseOptions(){
    return [...new Map(p2v58Batches().map(b=>[p2v58CourseKey(b),{id:p2v58CourseKey(b),name:p2CourseName(b)}])).values()].sort((a,b)=>a.name.localeCompare(b.name))
  }
  function p2v58FilteredBatches(){
    const all=p2v58Batches();return p2v58Course?all.filter(b=>p2v58CourseKey(b)===p2v58Course):all
  }
  function p2v58CurrentBatch(){return state.classBatches.find(b=>b.id===p2v58Batch)||null}
  function p2v58CurrentRows(){
    const b=p2v58CurrentBatch();if(!b)return[];
    return state.classEnrollments.filter(e=>e.batchId===b.id).map(en=>({en,p:p2v5Person(en)})).sort((a,z)=>(a.p.name||'').localeCompare(z.p.name||'',undefined,{sensitivity:'base',numeric:true}))
  }
  function p2v58EnsureSelection(){
    const all=p2v58Batches();
    if(!all.length){p2v58Course='';p2v58Batch='';p2v58Date='';return}
    let b=state.classBatches.find(x=>x.id===p2v58Batch)||state.classBatches.find(x=>x.id===state.activeClassBatchId)||all[0];
    if(!p2v58Course)p2v58Course=p2v58CourseKey(b);
    let pool=all.filter(x=>p2v58CourseKey(x)===p2v58Course);
    if(!pool.some(x=>x.id===b.id))b=pool[0]||all[0];
    p2v58Batch=b.id;
    const dates=p2v58Dates(b);
    if(!dates.includes(p2v58Date))p2v58Date=dates[0]||b.start||'';
  }
  function p2v58SessionNo(b,date){const i=p2v58Dates(b).indexOf(date);return i>=0?i+1:1}
  function p2v58AttendanceValue(en,date){return en.attendance&&Object.prototype.hasOwnProperty.call(en.attendance,date)?en.attendance[date]===true:null}
  function p2v58ResetDraft(){
    p2v58Draft={};p2v58CurrentRows().forEach(({en})=>p2v58Draft[en.id]=p2v58AttendanceValue(en,p2v58Date))
  }
  function p2v58Counts(){const rows=p2v58CurrentRows(),present=rows.filter(r=>p2v58Draft[r.en.id]===true).length,absent=rows.filter(r=>p2v58Draft[r.en.id]===false).length;return{total:rows.length,present,absent,pending:Math.max(0,rows.length-present-absent)}}
  function p2v58LockSelectors(lock){
    p2v58UploadLocked=!!lock;
    ['p2v58Course','p2v58Batch','p2v58Date'].forEach(id=>{const x=$(id);if(x)x.disabled=p2v58UploadLocked});
    const note=$('p2v58QrDetected');if(note)note.classList.toggle('hidden',!p2v58UploadLocked)
  }

  function p2v58PrepareClassesHome(){
    const grid=$('classes')?.querySelector('.p2-home-grid');if(!grid)return;
    let attendance=$('p2ClassesAttendance');
    const student=grid.querySelector('[data-go="studentProgress"]');
    const reports=$('p2ClassesReports');
    if(!attendance){
      attendance=document.createElement('button');
      attendance.type='button';attendance.id='p2ClassesAttendance';attendance.className='p2-home-card';
      attendance.innerHTML='<span class="no">03</span><div><strong>Attendance</strong><br><small>Manual attendance, print QR attendance sheet, scan/upload attendance sheet.</small></div>';
      if(student)grid.insertBefore(attendance,student);else if(reports)grid.insertBefore(attendance,reports);else grid.appendChild(attendance)
    }else{
      attendance.innerHTML='<span class="no">03</span><div><strong>Attendance</strong><br><small>Manual attendance, print QR attendance sheet, scan/upload attendance sheet.</small></div>'
    }
    if(student){const n=student.querySelector('.no');if(n)n.textContent='04';const strong=student.querySelector('strong');if(strong)strong.textContent='Student Progress';const sm=student.querySelector('small');if(sm)sm.textContent='Search a student and view class history, progress and next-stage follow-up.'}
    if(reports){const n=reports.querySelector('.no');if(n)n.textContent='05';reports.onclick=()=>p2v59OpenClassReports()}
    attendance.onclick=()=>switchPage('classAttendanceHub')
  }

  function p2v59EnsureClassReportsPage(){
    if($('classReportsHub'))return;
    const sec=document.createElement('section');sec.id='classReportsHub';sec.className='page';
    sec.innerHTML=`<div class='p2v59-class-reports'><div class='p2v59-class-report-title'><div><h2>CLASS REPORTS</h2><p>CLASS BATCHES, ATTENDANCE, COMPLETION, PROGRESSION AND ANNUAL CLASS SUMMARY</p></div><button id='p2v59ClassReportsBack' class='btn secondary' type='button'>← BACK</button></div><div id='p2v59ClassReportsPanel'></div></div>`;
    const base=$('classAttendanceHub')||$('phase2Reports')||$('classes');base.insertAdjacentElement('afterend',sec);
    $('p2v59ClassReportsBack').onclick=()=>switchPage('classes')
  }
  function p2v59CleanClassReportLabels(){
    const panel=$('p2v59ClassReportsPanel');if(!panel)return;
    panel.querySelectorAll('button').forEach(b=>{if(/back to reports/i.test((b.textContent||'').trim()))b.textContent='← Back to Class Reports'})
  }
  function p2v59OpenClassReports(){
    p2v59EnsureClassReportsPage();
    switchPage('classReportsHub');
    const panel=$('p2v59ClassReportsPanel');p2v54ClassReportHome(panel);p2v59CleanClassReportLabels();
    if(!panel.dataset.watch){panel.dataset.watch='1';new MutationObserver(()=>p2v59CleanClassReportLabels()).observe(panel,{childList:true,subtree:true,characterData:true})}
    $('pageTitle').textContent='Class Reports';$('pageSubtitle').textContent='Class-only reports and summaries'
  }
  function p2v58EnsurePage(){
    if($('classAttendanceHub'))return;
    const sec=document.createElement('section');sec.id='classAttendanceHub';sec.className='page';
    sec.innerHTML=`<div class="p2v58-page">
      <div class="p2v58-title-row"><div><h2>CLASS ATTENDANCE</h2><p>MARK ATTENDANCE, PRINT QR ATTENDANCE SHEET, SCAN/UPLOAD ATTENDANCE SHEET</p></div><button id="p2v58Back" class="btn secondary" type="button">← BACK</button></div>
      <div class="p2v58-filters">
        <div><label>Course</label><select id="p2v58Course"></select></div>
        <div><label>Batch</label><select id="p2v58Batch"></select></div>
        <div><label>Date</label><select id="p2v58Date"></select></div>
        <div class="p2v58-date-only"><span id="p2v58DateOnly">—</span></div>
      </div>
      <div class="p2v58-actions">
        <button id="p2v58Manual" class="btn" type="button">MARK ATTENDANCE<br><small>Manual Entry</small></button>
        <button id="p2v58Print" class="btn secondary" type="button">PRINT QR ATTENDANCE SHEET</button>
        <button id="p2v58Upload" class="btn secondary" type="button">SCAN / UPLOAD ATTENDANCE SHEET</button>
        <button id="p2v58Edit" class="btn secondary" type="button">VIEW / EDIT ATTENDANCE<br><small>Already Saved</small></button>
      </div>
      <div id="p2v58QrDetected" class="p2v58-detected hidden"><strong>QR detected.</strong> Course, batch and date were selected automatically. <button id="p2v58Unlock" type="button">Change manually</button></div>
      <div id="p2v58UploadPanel" class="p2v58-upload-panel hidden">
        <div><h3>Scan / Upload Attendance Sheet</h3><p>Upload the marked sheet from this computer, or connect a phone on the same Wi-Fi/hotspot. The printed QR identifies the class, batch and date automatically.</p></div>
        <div class="p2v58-upload-buttons"><button id="p2v58ChooseFile" class="btn secondary" type="button">UPLOAD IMAGE</button><button id="p2v58ConnectPhone" class="btn secondary" type="button">CONNECT PHONE</button><input id="p2v58File" type="file" accept="image/*" hidden></div>
        <div id="p2v58PhoneConnect" class="p2v58-phone hidden"><img id="p2v58PhoneQr" alt="Phone connection QR"><div><strong>Scan with phone</strong><p id="p2v58PhoneText"></p><small>Phone and this computer must be on the same Wi-Fi or hotspot. Internet is not required.</small></div></div>
        <div id="p2v58UploadStatus" class="p2v58-upload-status"></div>
      </div>
      <div class="p2v58-list-head"><div><button class="p2v58-tab active" type="button">ATTENDANCE LIST</button></div><input id="p2v58Search" class="search" placeholder="Search by name or mobile..."></div>
      <div id="p2v58Roster"></div>
      <div class="p2v58-footer"><div class="p2v58-left-actions"><button id="p2v58Clear" class="btn secondary" type="button">Clear All</button><button id="p2v58All" class="btn secondary" type="button">Mark Remaining Absent</button></div><div id="p2v58Totals" class="p2v58-totals"></div><div><button id="p2v58Save" class="btn secondary" type="button">Save Attendance</button><button id="p2v58Confirm" class="btn" type="button">Confirm Attendance</button></div></div>
    </div>`;
    const anchor=$('activeClasses')||$('classWorkspace')||$('studentProgress')||$('classes');
    anchor.insertAdjacentElement('afterend',sec);
    $('p2v58Back').onclick=()=>switchPage('classes');
    $('p2v58Course').onchange=()=>{p2v58Course=$('p2v58Course').value;p2v58Batch='';p2v58Date='';p2v58UploadLocked=false;p2v58Render()};
    $('p2v58Batch').onchange=()=>{p2v58Batch=$('p2v58Batch').value;p2v58Date='';p2v58UploadLocked=false;p2v58Render()};
    $('p2v58Date').onchange=()=>{p2v58Date=$('p2v58Date').value;p2v58UploadLocked=false;p2v58ResetDraft();p2v58RenderRoster()};
    $('p2v58Manual').onclick=()=>{p2v58LockSelectors(false);$('p2v58UploadPanel').classList.add('hidden');$('p2v58Search').focus()};
    $('p2v58Edit').onclick=()=>{p2v58LockSelectors(false);$('p2v58UploadPanel').classList.add('hidden');p2v58ResetDraft();p2v58RenderRoster()};
    $('p2v58Print').onclick=()=>p2v58PrintSheet();
    $('p2v58Upload').onclick=()=>$('p2v58UploadPanel').classList.toggle('hidden');
    $('p2v58ChooseFile').onclick=()=>$('p2v58File').click();
    $('p2v58File').onchange=async()=>{const f=$('p2v58File').files?.[0];if(f)await p2v58HandleUploadedFile(f)};
    $('p2v58ConnectPhone').onclick=()=>p2v58ConnectPhone();
    $('p2v58Unlock').onclick=()=>p2v58LockSelectors(false);
    $('p2v58Search').oninput=()=>p2v58ApplySearch();
    $('p2v58Clear').onclick=()=>{p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster()};
    $('p2v58All').onclick=()=>{p2v58CurrentRows().forEach(r=>{if(p2v58Draft[r.en.id]!==true&&p2v58Draft[r.en.id]!==false)p2v58Draft[r.en.id]=false});p2v58RenderRoster()};
    $('p2v58Save').onclick=()=>p2v58SaveAttendance(false);
    $('p2v58Confirm').onclick=()=>p2v58SaveAttendance(true);
    p2v58BindPhoneListener()
  }

  function p2v58Render(){
    p2v58EnsurePage();p2v58PrepareClassesHome();p2v58EnsureSelection();
    const courses=p2v58CourseOptions(),cf=$('p2v58Course');
    cf.innerHTML=courses.map(c=>`<option value="${esc(c.id)}" ${c.id===p2v58Course?'selected':''}>${esc(c.name)}</option>`).join('');
    const batches=p2v58FilteredBatches(),bf=$('p2v58Batch');
    bf.innerHTML=batches.map(b=>`<option value="${b.id}" ${b.id===p2v58Batch?'selected':''}>${esc(b.name)}</option>`).join('');
    const b=p2v58CurrentBatch(),dates=b?p2v58Dates(b):[],df=$('p2v58Date');
    df.innerHTML=dates.map(d=>`<option value="${d}" ${d===p2v58Date?'selected':''}>${esc(fmt(d))}</option>`).join('');
    $('p2v58DateOnly').textContent=p2v58Date?fmt(p2v58Date):'No class date';
    p2v58ResetDraft();p2v58RenderRoster();p2v58LockSelectors(p2v58UploadLocked)
  }

  function p2v58RenderRoster(){
    const host=$('p2v58Roster');if(!host)return;
    const rows=p2v58CurrentRows(),half=Math.min(20,Math.ceil(rows.length/2)),left=rows.slice(0,half),right=rows.slice(half,half*2);
    const rowHtml=(r,i)=>`<label class="p2v58-row" data-search="${esc(((r.p.name||'')+' '+(r.p.mobile||'')).toLowerCase())}"><span class="p2v58-no">${String(i+1).padStart(2,'0')}</span><span class="p2v58-name">${esc(r.p.name||'Unnamed')}</span><input class="p2v58-check" type="checkbox" data-en="${r.en.id}" ${p2v58Draft[r.en.id]?'checked':''}><span class="p2v58-box"></span></label>`;
    host.innerHTML=rows.length?`<div class="p2v58-namebar">NAME</div><div class="p2v58-two"><div>${left.map((r,i)=>rowHtml(r,i)).join('')}</div><div>${right.map((r,i)=>rowHtml(r,i+half)).join('')}</div></div>`:'<div class="p2-empty">No students are enrolled in this batch.</div>';
    host.querySelectorAll('.p2v58-check').forEach(x=>x.onchange=()=>{p2v58Draft[x.dataset.en]=x.checked?true:null;p2v58RenderRoster()});
    p2v58ApplySearch();p2v58UpdateTotals()
  }
  function p2v58ApplySearch(){
    const q=($('p2v58Search')?.value||'').trim().toLowerCase();
    $('p2v58Roster')?.querySelectorAll('.p2v58-row').forEach(r=>r.style.display=!q||r.dataset.search.includes(q)?'':'none')
  }
  function p2v58UpdateTotals(){const c=p2v58Counts(),x=$('p2v58Totals');if(x)x.innerHTML=`<span>Total: <b>${c.total}</b></span><span class="green">Present: <b>${c.present}</b></span><span class="red">Absent: <b>${c.absent}</b></span><span class="pending">Unmarked: <b>${c.pending}</b></span>`}
  function p2v58SaveAttendance(confirming){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}
    const counts=p2v58Counts();if(confirming&&counts.pending){toast('Mark remaining absent before confirming attendance.');return}
    p2v58CurrentRows().forEach(({en})=>{en.attendance=en.attendance||{};const v=p2v58Draft[en.id];if(v===true||v===false)en.attendance[p2v58Date]=v;else delete en.attendance[p2v58Date]});
    save();toast(confirming?'Attendance confirmed and saved everywhere':'Attendance saved')
  }

  async function p2v58LogoData(){
    try{const r=await fetch('logo-128.png'),b=await r.blob();return await new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(b)})}catch{return''}
  }
  async function p2v58MakeQr(payload,width=132){
    if(!window.QRCode||typeof window.QRCode.toDataURL!=='function')throw new Error('QR generator is not available');
    return await window.QRCode.toDataURL(payload,{errorCorrectionLevel:'M',margin:1,width})
  }
  async function p2v58PrintSheet(){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}
    const rows=p2v58CurrentRows();if(!rows.length){toast('No students enrolled in this batch');return}
    const chunks=[];for(let i=0;i<rows.length;i+=40)chunks.push(rows.slice(i,i+40));
    const logo=await p2v58LogoData(),session=p2v58SessionNo(b,p2v58Date);
    const pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],qr=await p2v58MakeQr(p2v58Payload(b,p2v58Date,pi+1,chunks.length),120),left=chunk.slice(0,20),right=chunk.slice(20,40);
      const list=(arr,offset)=>arr.map((r,i)=>`<div class="att-row"><span class="num">${String(offset+i+1).padStart(2,'0')}</span><span class="mark"></span><span class="nm">${esc(r.p.name||'Unnamed')}</span></div>`).join('');
      pages.push(`<section class="sheet"><header><div class="brand">${logo?`<img src="${logo}">`:''}<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="${qr}"><small>QR</small></div></header><div class="meta"><div><b>${esc(p2CourseName(b).toUpperCase())} · ${esc(String(b.name).toUpperCase())}</b><small>SESSION ${session}</small></div><div class="date"><b>${esc(fmt(p2v58Date))}</b></div></div><div class="namehead">NAME</div><div class="cols"><div>${list(left,0)}</div><div>${list(right,20)}</div></div><div class="sheetno">Sheet ${pi+1} of ${chunks.length}</div></section>`)
    }
    const printHtml=`<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>@page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#062b72}.sheet{position:relative;min-height:277mm;border:1px solid #d9e5f1;padding:6mm;page-break-after:always}.sheet:last-child{page-break-after:auto}header{display:grid;grid-template-columns:1fr 1.4fr 1fr;align-items:center;border-bottom:1px solid #cbd9e8;padding-bottom:4mm}.brand{display:flex;align-items:center;gap:8px;font-size:15px}.brand img{width:28px;height:28px;border-radius:50%}h1{font-size:16px;text-align:center;margin:0}.qr{text-align:right}.qr img{width:26mm;height:26mm;display:block;margin-left:auto}.qr small{display:block;text-align:center;width:26mm;margin-left:auto;font-size:7px}.meta{display:grid;grid-template-columns:1fr 1.2fr;gap:4mm;margin:3mm 0}.meta>div{background:#f3f8fc;border:1px solid #dce7f1;border-radius:6px;padding:3mm 4mm}.meta small{display:block;margin-top:2px;font-size:9px}.date{display:flex;align-items:center}.namehead{background:#144d94;color:white;text-align:center;font-weight:700;border-radius:4px;padding:2.2mm;margin-bottom:1.5mm}.cols{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.att-row{height:11.7mm;display:grid;grid-template-columns:10mm 12mm 1fr;align-items:center;padding:0 3mm;font-size:12px}.att-row:nth-child(odd){background:#f3f8fc}.num{font-size:9px}.mark{height:8mm}.nm{font-weight:700}.sheetno{position:absolute;right:7mm;bottom:4mm;font-size:8px;color:#71849a}</style></head><body>${pages.join('')}</body></html>`;
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  }

  async function p2v58DecodeSource(source){
    if(typeof window.jsQR!=='function')throw new Error('QR reader is not available');
    const bmp=await createImageBitmap(source),max=1800,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,w,h);const img=ctx.getImageData(0,0,w,h);
    const result=window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'});bmp.close?.();return result?.data||''
  }
  async function p2v58ApplyQrRaw(raw,name=''){
    const status=$('p2v58UploadStatus'),data=p2v58ParsePayload(raw);
    if(!data){p2v58LockSelectors(false);if(status)status.innerHTML='<span class="bad">QR not detected or verification failed — select class manually.</span>';return false}
    const b=state.classBatches.find(x=>String(x.id)===String(data.batchId));
    if(!b||!p2v58Dates(b).includes(String(data.date))){p2v58LockSelectors(false);if(status)status.innerHTML='<span class="bad">QR is valid, but this batch/date is not in this database. Select class manually.</span>';return false}
    p2v58Course=p2v58CourseKey(b);p2v58Batch=b.id;p2v58Date=String(data.date);p2v58UploadLocked=true;p2v58LastUploadName=name||'';p2v58Render();
    $('p2v58UploadPanel').classList.remove('hidden');p2v58LockSelectors(true);
    if(status)status.innerHTML=`<span class="good"><b>QR detected ✓</b> ${esc(p2CourseName(b))} · ${esc(b.name)} · ${esc(fmt(p2v58Date))}. Class, batch and date selected automatically.${name?' · '+esc(name):''}</span>`;
    return true
  }
  async function p2v58HandleUploadedFile(file){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR from attendance sheet...';
    try{const raw=await p2v58DecodeSource(file);await p2v58ApplyQrRaw(raw,file.name)}catch(e){p2v58LockSelectors(false);if(status)status.innerHTML=`<span class="bad">${esc(e.message||'QR could not be read')} — select class manually.</span>`}
  }
  async function p2v58HandleDataUrl(dataUrl,name='Phone photo'){
    try{const blob=await (await fetch(dataUrl)).blob(),raw=await p2v58DecodeSource(blob);await p2v58ApplyQrRaw(raw,name)}catch(e){const status=$('p2v58UploadStatus');p2v58LockSelectors(false);if(status)status.innerHTML=`<span class="bad">${esc(e.message||'QR could not be read')} — select class manually.</span>`}
  }
    let p2v59PhoneStatusBound=false;
  function p2v59BindPhoneStatus(){
    if(p2v59PhoneStatusBound||!window.anandaAttendanceBridge?.onPhoneStatus)return;p2v59PhoneStatusBound=true;
    window.anandaAttendanceBridge.onPhoneStatus(payload=>{const status=$('p2v58UploadStatus');if(!status)return;if(payload?.status==='connected')status.innerHTML='<span class="good"><b>PHONE CONNECTED ✓</b> Waiting for attendance sheet…</span>';if(payload?.status==='received')status.innerHTML='<span class="good"><b>ATTENDANCE SHEET RECEIVED ✓</b> Reading the printed QR…</span>'})
  }
function p2v58BindPhoneListener(){
    if(p2v58PhoneListenerBound||!window.anandaAttendanceBridge?.onPhoneUpload)return;p2v58PhoneListenerBound=true;
    window.anandaAttendanceBridge.onPhoneUpload(payload=>{if(payload?.dataUrl){switchPage('classAttendanceHub');$('p2v58UploadPanel')?.classList.remove('hidden');p2v58HandleDataUrl(payload.dataUrl,payload.name||'Phone photo')}})
  }
  async function p2v58ConnectPhone(){
    const status=$('p2v58UploadStatus');
    if(!window.anandaAttendanceBridge?.startPhoneUpload){if(status)status.textContent='Phone connection is not available in this build.';return}
    try{
      const r=await window.anandaAttendanceBridge.startPhoneUpload();
      if(!r?.ok)throw new Error(r?.error||'Could not start phone connection');
      p2v58PhoneUrl=r.url;p2v58PhoneQr=await p2v58MakeQr(r.url,170);
      $('p2v58PhoneQr').src=p2v58PhoneQr;$('p2v58PhoneText').textContent=r.url;$('p2v58PhoneConnect').classList.remove('hidden');
      if(status)status.textContent='Phone connection ready. Scan the connection QR with the phone camera.'
    }catch(e){if(status)status.innerHTML=`<span class="bad">${esc(e.message||'Could not connect phone')}</span>`}
  }

  function p2v58EnsureStyle(){
    if($('p2v58Style'))return;const st=document.createElement('style');st.id='p2v58Style';st.textContent=`
      .p2v58-page{background:#fff;border-radius:14px;padding:4px 2px 18px}.p2v58-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.p2v58-title-row h2{margin:0;color:#102d5e;font-size:25px}.p2v58-title-row p{margin:5px 0 0;color:#61758d;font-size:12px}.p2v58-filters{display:grid;grid-template-columns:1fr 1fr 1.05fr 1.8fr;gap:16px;align-items:end;border:1px solid #e0e8ef;border-radius:12px;padding:14px;background:#fff}.p2v58-filters label{display:block;color:#173f7d;font-size:11px;font-weight:900;margin-bottom:6px}.p2v58-filters select{width:100%;height:40px;border:1px solid #cad8e5;border-radius:7px;background:white;padding:0 10px;color:#173f7d}.p2v58-date-only{height:70px;background:#f3f8fc;border-radius:8px;display:flex;align-items:center;padding:0 22px;color:#123f7d;font-size:15px;font-weight:900}.p2v58-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.p2v58-actions .btn{min-height:56px}.p2v58-actions small{font-size:10px}.p2v58-detected{border:1px solid #b9e1cf;background:#eff9f4;color:#176247;border-radius:9px;padding:10px 12px;margin-bottom:10px}.p2v58-detected.hidden,.p2v58-upload-panel.hidden,.p2v58-phone.hidden{display:none}.p2v58-detected button{border:0;background:none;color:#0c5c9c;text-decoration:underline;cursor:pointer}.p2v58-upload-panel{border:1px solid #d8e4ee;background:#f8fbfd;border-radius:12px;padding:14px;margin-bottom:12px;display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}.p2v58-upload-panel h3{margin:0 0 3px;color:#123f7d}.p2v58-upload-panel p{margin:0;color:#607790;font-size:12px}.p2v58-upload-buttons{display:flex;gap:8px}.p2v58-phone{grid-column:1/-1;display:flex;align-items:center;gap:16px;background:#fff;border:1px solid #dbe6ef;border-radius:10px;padding:12px}.p2v58-phone img{width:145px;height:145px}.p2v58-phone p{font-family:Consolas,monospace;font-size:11px;word-break:break-all}.p2v58-phone small{color:#64798e}.p2v58-upload-status{grid-column:1/-1;font-size:12px;color:#547089}.p2v58-upload-status .good{color:#13704c}.p2v58-upload-status .bad{color:#b62d2d}.p2v58-list-head{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e6edf3;padding-top:10px}.p2v58-tab{border:0;border-bottom:3px solid #1c62b3;background:transparent;color:#164d92;font-weight:900;padding:10px 20px}.p2v58-list-head .search{width:290px}.p2v58-namebar{margin-top:8px;background:#174e94;color:#fff;text-align:center;font-weight:900;padding:8px;border-radius:5px 5px 0 0}.p2v58-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p2v58-row{display:grid;grid-template-columns:46px 1fr 42px;align-items:center;min-height:34px;padding:0 12px;color:#102f68;cursor:pointer}.p2v58-row:nth-child(odd){background:#f3f8fc}.p2v58-no{font-size:10px}.p2v58-name{font-weight:800;font-size:12px}.p2v58-check{position:absolute;opacity:0;pointer-events:none}.p2v58-box{width:17px;height:17px;border:1px solid #7891ad;border-radius:3px;background:#fff;justify-self:center;position:relative}.p2v58-check:checked+.p2v58-box{background:#10a04a;border-color:#10a04a}.p2v58-check:checked+.p2v58-box:after{content:'✓';position:absolute;color:#fff;font-size:13px;font-weight:900;left:2px;top:-2px}.p2v58-footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;border-top:1px solid #e3eaf0;margin-top:10px;padding-top:12px}.p2v58-footer>div:last-child{text-align:right}.p2v58-left-actions{display:flex;gap:8px}.p2v58-totals{display:flex;gap:20px;color:#4c6784}.p2v58-totals .green{color:#099447}.p2v58-totals .red{color:#d62d2d}.p2v58-totals .pending{color:#8a6a17}
      .p2v59-class-reports{background:#fff;border-radius:14px;padding:4px 2px 18px}.p2v59-class-report-title{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.p2v59-class-report-title h2{margin:0;color:#102d5e;font-size:25px}.p2v59-class-report-title p{margin:5px 0 0;color:#61758d;font-size:12px}@media(max-width:1000px){.p2v58-filters{grid-template-columns:1fr 1fr}.p2v58-actions{grid-template-columns:1fr 1fr}.p2v58-two{grid-template-columns:1fr}.p2v58-upload-panel{grid-template-columns:1fr}.p2v58-footer{grid-template-columns:1fr}.p2v58-footer>div:last-child{text-align:left}}
    `;document.head.appendChild(st)
  }

  p2v58EnsureStyle();p2v58EnsurePage();p2v58PrepareClassesHome();p2v58BindPhoneListener();p2v59BindPhoneStatus();
  const p2v58SwitchBase=switchPage;
  switchPage=function(id){
    const r=p2v58SwitchBase(id);
    if(id==='classes')p2v58PrepareClassesHome();
    if(id==='classAttendanceHub'){p2v58Render();$('pageTitle').textContent='Class Attendance';$('pageSubtitle').textContent='Attendance by class and date'}
    return r
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')

# Add local-network phone upload bridge to main.js.
main=Path('src/main.js')
m=main.read_text(encoding='utf-8')
if 'BETA58 ATTENDANCE PHONE UPLOAD' not in m:
    hook="app.whenReady().then(() => {"
    if hook not in m: raise SystemExit('main.js app.whenReady hook not found')
    server=r'''
// BETA58 ATTENDANCE PHONE UPLOAD — local Wi-Fi/hotspot only; internet not required.
const anandaHttp = require('http');
const anandaOs = require('os');
const anandaCrypto = require('crypto');
let anandaAttendanceServer=null;
let anandaAttendanceToken='';
let anandaAttendanceTimer=null;
function anandaAttendanceStopServer(){
  if(anandaAttendanceTimer){clearTimeout(anandaAttendanceTimer);anandaAttendanceTimer=null}
  if(anandaAttendanceServer){try{anandaAttendanceServer.close()}catch{}anandaAttendanceServer=null}
}
function anandaAttendanceIp(){
  const nets=anandaOs.networkInterfaces(),candidates=[];
  for(const group of Object.values(nets))for(const n of group||[]){
    const ipv4=n&&(n.family==='IPv4'||n.family===4),a=String(n?.address||'');
    if(!ipv4||n.internal||!a||a==='0.0.0.0'||a==='127.0.0.1'||a.startsWith('169.254.'))continue;
    let priority=9;if(a.startsWith('192.168.'))priority=1;else if(a.startsWith('10.'))priority=2;else{const mt=/^172\.(\d+)\./.exec(a);if(mt&&Number(mt[1])>=16&&Number(mt[1])<=31)priority=3}
    candidates.push({a,priority})
  }
  candidates.sort((x,y)=>x.priority-y.priority);
  return candidates[0]?.a||''
}
function anandaMultipartFile(buf,contentType){
  const m=/boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType||'');if(!m)return null;
  const boundary=Buffer.from('--'+(m[1]||m[2]).trim());
  let pos=buf.indexOf(boundary);while(pos>=0){
    const headerStart=pos+boundary.length+2,headerEnd=buf.indexOf(Buffer.from('\r\n\r\n'),headerStart);if(headerEnd<0)break;
    const header=buf.slice(headerStart,headerEnd).toString('utf8'),fileMatch=/filename="([^"]*)"/i.exec(header),typeMatch=/Content-Type:\s*([^\r\n]+)/i.exec(header);
    const dataStart=headerEnd+4,next=buf.indexOf(boundary,dataStart);
    if(fileMatch&&next>dataStart){let dataEnd=next-2;return{name:fileMatch[1]||'attendance.jpg',mime:(typeMatch?.[1]||'image/jpeg').trim(),data:buf.slice(dataStart,dataEnd)}}
    pos=buf.indexOf(boundary,pos+boundary.length)
  }
  return null
}
ipcMain.handle('ananda-attendance-start-upload-server',async()=>{
  try{
    anandaAttendanceStopServer();anandaAttendanceToken=anandaCrypto.randomBytes(18).toString('hex');
    anandaAttendanceServer=anandaHttp.createServer((req,res)=>{
      try{
        const u=new URL(req.url,'http://local/');
        if(u.searchParams.get('token')!==anandaAttendanceToken){res.writeHead(403,{'Content-Type':'text/plain'});return res.end('Invalid or expired connection')}
        if(req.method==='GET'){
          if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('ananda-attendance-phone-status',{status:'connected',remoteAddress:req.socket?.remoteAddress||''});
          const page='<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ananda Attendance Upload</title><style>body{font-family:Arial,sans-serif;background:#f4f7fa;color:#123f7d;padding:24px}main{max-width:520px;margin:auto;background:white;border-radius:14px;padding:22px;box-shadow:0 8px 30px #1232}h2{margin-top:0}input,button{width:100%;margin-top:14px;padding:14px;border-radius:9px;border:1px solid #bed0e0}button{background:#174e94;color:white;font-weight:700}</style><main><h2>ANANDA SANGHA</h2><h3>Upload Attendance Sheet</h3><p>Take a clear photo showing the QR code and the marked attendance sheet.</p><form method="post" enctype="multipart/form-data"><input name="sheet" type="file" accept="image/*" capture="environment" required><button>UPLOAD TO EVENT DESK</button></form></main></html>';
          res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(page)
        }
        if(req.method==='POST'){
          const chunks=[];let size=0,tooBig=false;
          req.on('data',c=>{size+=c.length;if(size>16*1024*1024){tooBig=true;req.destroy()}else chunks.push(c)});
          req.on('end',()=>{if(tooBig)return;const file=anandaMultipartFile(Buffer.concat(chunks),req.headers['content-type']);if(!file){res.writeHead(400,{'Content-Type':'text/plain'});return res.end('No image received')}const dataUrl='data:'+file.mime+';base64,'+file.data.toString('base64');if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.webContents.send('ananda-attendance-phone-status',{status:'received'});mainWindow.webContents.send('ananda-attendance-phone-upload',{name:file.name,mime:file.mime,dataUrl})};res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<h2 style="font-family:Arial;color:#087a46">Uploaded successfully.</h2><p>You can return to the Ananda Event Desk.</p>');setTimeout(anandaAttendanceStopServer,800)})
          return
        }
        res.writeHead(405);res.end()
      }catch(e){res.writeHead(500,{'Content-Type':'text/plain'});res.end('Upload error')}
    });
    await new Promise((resolve,reject)=>{anandaAttendanceServer.once('error',reject);anandaAttendanceServer.listen(0,resolve)});
    const port=anandaAttendanceServer.address().port,ip=anandaAttendanceIp();if(!ip){anandaAttendanceStopServer();return{ok:false,error:'Connect this laptop to Wi-Fi or to the phone hotspot first.'}}const url='http://'+ip+':'+port+'/?token='+anandaAttendanceToken;
    anandaAttendanceTimer=setTimeout(anandaAttendanceStopServer,15*60*1000);
    return{ok:true,url,ip,port}
  }catch(error){anandaAttendanceStopServer();return{ok:false,error:error?.message||String(error)}}
});
ipcMain.handle('ananda-attendance-stop-upload-server',async()=>{anandaAttendanceStopServer();return{ok:true}});
'''
    m=m.replace(hook,server+'\n'+hook,1)
    m=m.replace("const APP_VERSION = '2.0.0-beta.1';","const APP_VERSION = '2.0.0-beta.5.8';")
    # BETA59 PRINT PREVIEW — show exact A4 preview before print/save.
    m=m.replace("const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');","const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');")
    ps=m.find("ipcMain.handle('ananda-native-print-html'")
    pe=m.find("ipcMain.handle('ananda-open-data-folder'",ps)
    if ps<0 or pe<0: raise SystemExit('Could not find native print handler for preview')
    preview=r'''// BETA59 PRINT PREVIEW
let anandaPrintPreviewWindow=null;
let anandaPrintPreviewFile='';
function anandaDecoratePrintPreview(source){
  const addon=`<style>.ananda-preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;position:fixed;z-index:999999;left:0;right:0;top:0;height:58px;padding:0 18px;background:#123f7d;color:#fff;font-family:Arial,sans-serif;box-shadow:0 2px 12px #0002}.ananda-preview-toolbar .group{display:flex;align-items:center;gap:8px}.ananda-preview-toolbar button{border:1px solid #d9e7f5;background:#fff;color:#123f7d;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.ananda-preview-toolbar button.primary{background:#1762c4;color:#fff;border-color:#1762c4}.ananda-preview-counter{min-width:70px;text-align:center;font-weight:700}@media screen{body{background:#e9eef4!important;padding:76px 24px 30px!important}.sheet{display:none!important;background:#fff;margin:0 auto 22px!important;max-width:210mm;box-shadow:0 8px 30px #102d5e22}.sheet.ananda-preview-active{display:block!important}}@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.sheet{display:block!important;box-shadow:none!important}}</style><div class='ananda-preview-toolbar'><div class='group'><strong>QR ATTENDANCE PRINT PREVIEW</strong></div><div class='group'><button id='anandaPrev'>Previous</button><span id='anandaCounter' class='ananda-preview-counter'></span><button id='anandaNext'>Next</button></div><div class='group'><button id='anandaSave'>Save PDF</button><button id='anandaPrint' class='primary'>Print</button><button id='anandaClose'>Close</button></div></div><script>(function(){const sheets=[...document.querySelectorAll('.sheet')],counter=document.getElementById('anandaCounter');let idx=0;function show(){sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1}document.getElementById('anandaPrev').onclick=()=>{if(idx>0){idx--;show()}};document.getElementById('anandaNext').onclick=()=>{if(idx<sheets.length-1){idx++;show()}};document.getElementById('anandaPrint').onclick=()=>location.href='ananda-preview://print';document.getElementById('anandaSave').onclick=()=>location.href='ananda-preview://save';document.getElementById('anandaClose').onclick=()=>location.href='ananda-preview://close';show()})();</script>`;
  return /<\\/body>/i.test(source)?source.replace(/<\\/body>/i,addon+'</body>'):source+addon
}
ipcMain.handle('ananda-native-print-html',async(_event,payload)=>{
  const html=payload&&typeof payload.html==='string'?payload.html:'';if(!html)return{ok:false,error:'Nothing to preview.'};
  try{
    if(anandaPrintPreviewWindow&&!anandaPrintPreviewWindow.isDestroyed())anandaPrintPreviewWindow.close();
    anandaPrintPreviewFile=path.join(SESSION_ROOT,'attendance-print-preview.html');fs.writeFileSync(anandaPrintPreviewFile,anandaDecoratePrintPreview(html),'utf8');
    const win=new BrowserWindow({width:1120,height:860,minWidth:900,minHeight:650,show:false,autoHideMenuBar:true,parent:mainWindow||undefined,icon:path.join(__dirname,'ananda-icon.ico'),webPreferences:{contextIsolation:true,nodeIntegration:false}});anandaPrintPreviewWindow=win;
    win.webContents.on('will-navigate',async(event,url)=>{if(!String(url).startsWith('ananda-preview://'))return;event.preventDefault();const action=new URL(url).hostname;if(action==='close'){win.close();return}if(action==='print'){win.webContents.print({silent:false,printBackground:true},()=>{});return}if(action==='save'){try{const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,pageSize:'A4'});const result=await dialog.showSaveDialog(win,{title:'Save QR Attendance Sheet as PDF',defaultPath:path.join(app.getPath('documents'),'Ananda_QR_Attendance_'+safeTimestamp()+'.pdf'),filters:[{name:'PDF',extensions:['pdf']}]});if(!result.canceled&&result.filePath)fs.writeFileSync(result.filePath,pdf)}catch{}}});
    win.on('closed',()=>{if(anandaPrintPreviewWindow===win)anandaPrintPreviewWindow=null;try{if(anandaPrintPreviewFile&&fs.existsSync(anandaPrintPreviewFile))fs.unlinkSync(anandaPrintPreviewFile)}catch{}});
    await win.loadFile(anandaPrintPreviewFile);win.show();win.focus();return{ok:true,preview:true}
  }catch(error){return{ok:false,error:error&&error.message?error.message:String(error)}}
});
'''
    m=m[:ps]+preview+m[pe:]
    main.write_text(m,encoding='utf-8')

# Expose phone-upload bridge from preload.
pre=Path('src/preload.js')
s=pre.read_text(encoding='utf-8')
if 'anandaAttendanceBridge' not in s:
    s += r'''

contextBridge.exposeInMainWorld('anandaAttendanceBridge', {
  startPhoneUpload: () => ipcRenderer.invoke('ananda-attendance-start-upload-server'),
  stopPhoneUpload: () => ipcRenderer.invoke('ananda-attendance-stop-upload-server'),
  onPhoneUpload: (callback) => {
    ipcRenderer.removeAllListeners('ananda-attendance-phone-upload');
    ipcRenderer.on('ananda-attendance-phone-upload', (_event, payload) => callback(payload));
  },
  onPhoneStatus: (callback) => {
    ipcRenderer.removeAllListeners('ananda-attendance-phone-status');
    ipcRenderer.on('ananda-attendance-phone-status', (_event, payload) => callback(payload));
  }
});
'''
    pre.write_text(s,encoding='utf-8')

# Package the two browser-side QR libraries copied by CI.
pkgp=Path('src/package.json')
pkg=json.loads(pkgp.read_text(encoding='utf-8'))
files=pkg.setdefault('build',{}).setdefault('files',[])
for f in ['qrcode-client.js','jsqr-client.js']:
    if f not in files: files.append(f)
pkg['version']='2.0.0-beta.5.8'
pkgp.write_text(json.dumps(pkg,indent=2)+'\n',encoding='utf-8')

required=['PHASE2 BETA58 ATTENDANCE QR','classAttendanceHub','PRINT QR ATTENDANCE SHEET','SCAN / UPLOAD ATTENDANCE SHEET','p2v58Payload','p2v58ParsePayload','Class, batch and date selected automatically','qrcode-client.js','jsqr-client.js']
missing=[x for x in required if x not in html]
if missing: raise SystemExit('Missing beta 5.8 attendance markers: '+repr(missing))
print('BETA 5.8 ATTENDANCE QR APPLIED',len(html))

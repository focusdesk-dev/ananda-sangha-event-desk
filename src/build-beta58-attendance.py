from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA57 REFINE' not in html:
    raise SystemExit('Beta 5.7 marker not found')
if 'PHASE2 BETA58 QR ATTENDANCE' in html:
    print('Beta 5.8 attendance already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''  // PHASE2 BETA58 QR ATTENDANCE — offline QR attendance workflow.
  let p2v58AttendanceBatch='';
  let p2v58AttendanceDate='';
  let p2v58PhoneUnsub=null;

  function p2v58Esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function p2v58Dates(b){return typeof p2v5ValidDates==='function'?p2v5ValidDates(b):[...(b?.sessionDates||[])].filter(Boolean).sort()}
  function p2v58Enrollments(b){return state.classEnrollments.filter(e=>e.batchId===b.id).map(en=>({en,p:typeof p2v5Person==='function'?p2v5Person(en):(state.students.find(s=>s.id===en.studentId)||{name:en.personName||'Unnamed',mobile:en.personMobile||''})})).sort((a,z)=>(a.p.name||'').localeCompare(z.p.name||'',undefined,{sensitivity:'base'}))}
  function p2v58QrText(b,date,sheet,total){return 'ANANDA_ATT_V1:'+btoa(unescape(encodeURIComponent(JSON.stringify({courseId:String(b.courseId||''),batchId:String(b.id),date:String(date),sheet:Number(sheet),total:Number(total)}))))}
  function p2v58ParseQr(text){
    try{
      if(!String(text||'').startsWith('ANANDA_ATT_V1:'))return null;
      const raw=String(text).slice('ANANDA_ATT_V1:'.length);
      const obj=JSON.parse(decodeURIComponent(escape(atob(raw))));
      if(!obj.batchId||!obj.date)return null;
      const b=state.classBatches.find(x=>String(x.id)===String(obj.batchId));
      if(!b)return null;
      if(!p2v58Dates(b).includes(String(obj.date)))return null;
      return {b,date:String(obj.date),sheet:Number(obj.sheet||1),total:Number(obj.total||1)}
    }catch{return null}
  }

  function p2v58FindHomeCard(term){
    const page=$('classes');if(!page)return null;
    const els=[...page.querySelectorAll('button,.card,[class*="card"],[class*="choice"]')];
    return els.find(x=>(x.textContent||'').toUpperCase().includes(term))||null
  }
  function p2v58RenumberCard(card,num){
    if(!card)return;
    const candidates=[...card.querySelectorAll('span,small,div')].filter(x=>x.children.length===0&&/^\s*\d{2}\s*$/.test(x.textContent||''));
    if(candidates[0])candidates[0].textContent=String(num).padStart(2,'0')
  }
  function p2v58EnsureHomeCard(){
    const page=$('classes');if(!page||$('p2v58AttendanceCard'))return;
    const student=p2v58FindHomeCard('STUDENT PROGRESS'),reports=p2v58FindHomeCard('CLASS REPORT');
    const anchor=student||reports;if(!anchor||!anchor.parentElement)return;
    const tag=anchor.tagName==='BUTTON'?'button':'div',card=document.createElement(tag);
    card.id='p2v58AttendanceCard';card.className=anchor.className||'card';if(tag==='button')card.type='button';
    card.innerHTML='<span class="p2v58-num">03</span><h3>ATTENDANCE</h3><p>Manual attendance, print QR attendance sheet, scan/upload attendance sheet.</p>';
    card.onclick=p2v58OpenAttendance;
    anchor.parentElement.insertBefore(card,anchor);
    p2v58RenumberCard(student,4);p2v58RenumberCard(reports,5)
  }

  function p2v58EnsureAttendanceShell(){
    const page=$('classes');if(!page||$('p2v58AttendanceShell'))return;
    const shell=document.createElement('div');shell.id='p2v58AttendanceShell';
    shell.innerHTML=\`
      <div class="p2v58-head"><div><h2>CLASS ATTENDANCE</h2><p>MARK ATTENDANCE, PRINT QR ATTENDANCE SHEET, SCAN/UPLOAD ATTENDANCE SHEET</p></div><button id="p2v58Back" class="btn ghost" type="button">← BACK</button></div>
      <div class="p2v58-filterbar"><div><label>Course</label><select id="p2v58Course"></select></div><div><label>Batch</label><select id="p2v58Batch"></select></div><div><label>Date</label><select id="p2v58Date"></select></div></div>
      <div class="p2v58-actions">
        <button id="p2v58Manual" class="p2v58-action active" type="button">MARK ATTENDANCE<small>Manual Entry</small></button>
        <button id="p2v58Print" class="p2v58-action" type="button">PRINT QR ATTENDANCE SHEET</button>
        <button id="p2v58Scan" class="p2v58-action" type="button">SCAN / UPLOAD ATTENDANCE SHEET</button>
        <button id="p2v58View" class="p2v58-action" type="button">VIEW / EDIT ATTENDANCE<small>Already Saved</small></button>
      </div>
      <input id="p2v58File" type="file" accept="image/*" hidden>
      <div id="p2v58QrStatus" class="p2v58-status hidden"></div>
      <div class="p2v58-tabs"><button class="active" type="button">ATTENDANCE LIST</button><span></span><input id="p2v58Search" placeholder="Search by name or mobile..."></div>
      <div id="p2v58Roster"></div>
      <div class="p2v58-bottom"><div><button id="p2v58Clear" class="btn ghost" type="button">Clear All</button><button id="p2v58All" class="btn ghost" type="button">Mark All Present</button></div><div id="p2v58Totals"></div><div><button id="p2v58Save" class="btn secondary" type="button">Save Attendance</button><button id="p2v58Confirm" class="btn" type="button">Confirm Attendance</button></div></div>
      <div id="p2v58PhoneModal" class="modal-backdrop"><div class="modal" style="width:min(560px,100%)"><div class="modal-head"><h3>Scan / Upload Attendance Sheet</h3><button id="p2v58PhoneClose" class="x" type="button">×</button></div><p class="card-sub">Upload from this computer, or connect a phone on the same Wi-Fi / hotspot. Internet is not required.</p><div class="p2v58-phone-options"><button id="p2v58ChooseFile" class="btn" type="button">Upload From Computer</button><button id="p2v58ConnectPhone" class="btn secondary" type="button">Connect Phone (Same Wi-Fi)</button></div><div id="p2v58PhoneConnect" class="hidden"></div></div></div>
    \`;
    page.appendChild(shell);
    $('p2v58Back').onclick=p2v58CloseAttendance;
    $('p2v58Course').onchange=()=>{p2v58AttendanceBatch='';p2v58AttendanceDate='';p2v58FillSelectors();p2v58RenderRoster()};
    $('p2v58Batch').onchange=e=>{p2v58AttendanceBatch=e.target.value;p2v58AttendanceDate='';p2v58FillSelectors();p2v58RenderRoster()};
    $('p2v58Date').onchange=e=>{p2v58AttendanceDate=e.target.value;p2v58RenderRoster()};
    $('p2v58Search').oninput=p2v58RenderRoster;
    $('p2v58Clear').onclick=()=>{$('p2v58Roster').querySelectorAll('input[type=checkbox]').forEach(x=>x.checked=false);p2v58UpdateTotals()};
    $('p2v58All').onclick=()=>{$('p2v58Roster').querySelectorAll('input[type=checkbox]').forEach(x=>x.checked=true);p2v58UpdateTotals()};
    $('p2v58Save').onclick=()=>p2v58SaveAttendance(false);
    $('p2v58Confirm').onclick=()=>p2v58SaveAttendance(true);
    $('p2v58Print').onclick=p2v58PrintSheets;
    $('p2v58Scan').onclick=()=>{$('p2v58PhoneModal').classList.add('open')};
    $('p2v58ChooseFile').onclick=()=>{$('p2v58PhoneModal').classList.remove('open');$('p2v58File').click()};
    $('p2v58PhoneClose').onclick=()=>{$('p2v58PhoneModal').classList.remove('open')};
    $('p2v58File').onchange=e=>{const f=e.target.files?.[0];if(f)p2v58ReadImageFile(f);e.target.value=''};
    $('p2v58ConnectPhone').onclick=p2v58StartPhone;
    $('p2v58Manual').onclick=p2v58RenderRoster;$('p2v58View').onclick=p2v58RenderRoster;
    if(window.anandaDesktop?.onAttendancePhoneUpload&&!p2v58PhoneUnsub)p2v58PhoneUnsub=window.anandaDesktop.onAttendancePhoneUpload(p=>{if(p?.dataUrl){$('p2v58PhoneModal').classList.remove('open');p2v58ReadImageDataUrl(p.dataUrl,p.name||'Phone upload')}})
  }

  function p2v58OpenAttendance(){
    p2v58EnsureAttendanceShell();$('classes')?.classList.add('p2v58-attendance-open');p2v58FillSelectors();p2v58RenderRoster()
  }
  function p2v58CloseAttendance(){
    $('classes')?.classList.remove('p2v58-attendance-open');$('p2v58PhoneModal')?.classList.remove('open')
  }

  function p2v58FillSelectors(forceCourse){
    const c=$('p2v58Course'),bsel=$('p2v58Batch'),dsel=$('p2v58Date');if(!c||!bsel||!dsel)return;
    const courses=[...new Map(state.classBatches.map(b=>[String(b.courseId||p2CourseName(b)),{id:String(b.courseId||p2CourseName(b)),name:p2CourseName(b)}])).values()].sort((a,z)=>a.name.localeCompare(z.name));
    let course=forceCourse||c.value||courses[0]?.id||'';
    c.innerHTML=courses.map(x=>\`<option value="\${p2v58Esc(x.id)}">\${p2v58Esc(x.name)}</option>\`).join('');if([...c.options].some(o=>o.value===course))c.value=course;else course=c.value;
    const batches=state.classBatches.filter(b=>String(b.courseId||p2CourseName(b))===course).sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')));
    if(!batches.some(b=>b.id===p2v58AttendanceBatch))p2v58AttendanceBatch=batches[0]?.id||'';
    bsel.innerHTML=batches.map(b=>\`<option value="\${p2v58Esc(b.id)}" \${b.id===p2v58AttendanceBatch?'selected':''}>\${p2v58Esc(b.name)}</option>\`).join('');
    const batch=state.classBatches.find(x=>x.id===p2v58AttendanceBatch),dates=batch?p2v58Dates(batch):[];
    if(!dates.includes(p2v58AttendanceDate))p2v58AttendanceDate=dates[0]||'';
    dsel.innerHTML=dates.map(d=>\`<option value="\${p2v58Esc(d)}" \${d===p2v58AttendanceDate?'selected':''}>\${p2v58Esc(typeof fmt==='function'?fmt(d):d)}</option>\`).join('')
  }

  function p2v58RenderRoster(){
    const host=$('p2v58Roster');if(!host)return;
    const b=state.classBatches.find(x=>x.id===p2v58AttendanceBatch),date=p2v58AttendanceDate,q=($('p2v58Search')?.value||'').trim().toLowerCase();
    if(!b||!date){host.innerHTML='<div class="p2-empty">Select a class batch and date.</div>';p2v58UpdateTotals();return}
    let rows=p2v58Enrollments(b);if(q)rows=rows.filter(r=>\`\${r.p.name||''} \${r.p.mobile||''}\`.toLowerCase().includes(q));
    const half=Math.ceil(rows.length/2),left=rows.slice(0,half),right=rows.slice(half);
    const col=(list,start)=>\`<div class="p2v58-roster-col"><div class="p2v58-roster-head">NAME</div>\${list.map((r,i)=>{const checked=!!r.en.attendance?.[date];return \`<label class="p2v58-person"><span class="p2v58-index">\${String(start+i+1).padStart(2,'0')}</span><strong>\${p2v58Esc(r.p.name||'Unnamed')}</strong><input class="p2v58-check" data-en="\${p2v58Esc(r.en.id||'')}" type="checkbox" \${checked?'checked':''}></label>\`}).join('')}</div>\`;
    host.innerHTML=\`<div class="p2v58-roster-grid">\${col(left,0)}\${col(right,half)}</div>\`;
    host.querySelectorAll('.p2v58-check').forEach(x=>x.onchange=p2v58UpdateTotals);p2v58UpdateTotals()
  }
  function p2v58UpdateTotals(){
    const boxes=[...($('p2v58Roster')?.querySelectorAll('.p2v58-check')||[])],present=boxes.filter(x=>x.checked).length,total=boxes.length;
    if($('p2v58Totals'))$('p2v58Totals').innerHTML=\`<span>Total: <b>\${total}</b></span><span class="green">Present: <b>\${present}</b></span><span class="red">Absent: <b>\${Math.max(0,total-present)}</b></span>\`
  }
  function p2v58SaveAttendance(confirming){
    const b=state.classBatches.find(x=>x.id===p2v58AttendanceBatch),date=p2v58AttendanceDate;if(!b||!date)return;
    const map=new Map([...$('p2v58Roster').querySelectorAll('.p2v58-check')].map(x=>[x.dataset.en,x.checked]));
    state.classEnrollments.filter(e=>e.batchId===b.id).forEach(e=>{if(!e.attendance)e.attendance={};if(map.has(String(e.id||'')))e.attendance[date]=!!map.get(String(e.id||''))});
    save();toast(confirming?'Attendance confirmed':'Attendance saved');p2v58RenderRoster()
  }

  async function p2v58LogoData(){
    try{const res=await fetch('logo-128.png');const blob=await res.blob();return await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(blob)})}catch{return ''}
  }
  async function p2v58PrintSheets(){
    const b=state.classBatches.find(x=>x.id===p2v58AttendanceBatch),date=p2v58AttendanceDate;if(!b||!date){toast('Select a batch and date first');return}
    if(!window.anandaDesktop?.makeQrDataUrl||!window.anandaDesktop?.printHtml){toast('QR printing is unavailable in this build');return}
    const rows=p2v58Enrollments(b),pages=[];for(let i=0;i<Math.max(1,Math.ceil(rows.length/40));i++)pages.push(rows.slice(i*40,(i+1)*40));
    const logo=await p2v58LogoData(),ach=typeof p2AcharyaNames==='function'?p2AcharyaNames(b).join(', '):'',total=pages.length;
    const sheets=[];
    for(let pi=0;pi<pages.length;pi++){
      const qr=await window.anandaDesktop.makeQrDataUrl(p2v58QrText(b,date,pi+1,total),{width:150,margin:1}),list=pages[pi],left=list.slice(0,20),right=list.slice(20,40);
      const listHtml=(arr,offset)=>arr.map((r,i)=>\`<div class="row"><span class="n">\${String(pi*40+offset+i+1).padStart(2,'0')}</span><span class="tick"></span><strong>\${p2v58Esc(r.p.name||'Unnamed')}</strong></div>\`).join('');
      sheets.push(\`<section class="sheet"><header><div class="brand">\${logo?\`<img src="\${logo}">\`:''}<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="\${qr}"><small>QR · Sheet \${pi+1} of \${total}</small></div></header><div class="meta"><div><b>\${p2v58Esc(p2CourseName(b))} · \${p2v58Esc(b.name)}</b><small>Session \${Math.max(1,p2v58Dates(b).indexOf(date)+1)}</small></div><div><b>\${p2v58Esc(typeof fmt==='function'?fmt(date):date)}</b>\${ach?\`<small>Acharya: \${p2v58Esc(ach)}</small>\`:''}</div></div><div class="namebar">NAME</div><div class="cols"><div>\${listHtml(left,0)}</div><div>\${listHtml(right,20)}</div></div></section>\`)
    }
    const doc=\`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;color:#0e3475}.sheet{break-after:page;border:1px solid #cbd9e8;padding:13px 16px 12px;min-height:275mm}.sheet:last-child{break-after:auto}header{display:grid;grid-template-columns:1fr 1fr 120px;align-items:center;border-bottom:1px solid #d7e3ee;padding-bottom:9px}.brand{display:flex;gap:8px;align-items:center;font-size:15px}.brand img{width:32px;height:32px;border-radius:50%}h1{text-align:center;font-size:15px;margin:0;color:#52688f}.qr{text-align:center}.qr img{width:55px;height:55px;display:block;margin:auto}.qr small{font-size:7px}.meta{display:grid;grid-template-columns:1fr 1.35fr;gap:12px;margin:8px 0}.meta>div{background:#f1f6fa;border:1px solid #dce6ef;border-radius:6px;padding:8px 10px}.meta b,.meta small{display:block}.meta b{font-size:11px}.meta small{font-size:8px;margin-top:3px;color:#607895}.namebar{background:#164d92;color:#fff;text-align:center;font-weight:bold;padding:6px;border-radius:4px;margin-bottom:4px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.row{height:12.2mm;display:grid;grid-template-columns:32px 28px 1fr;align-items:center;padding:0 7px;font-size:11px}.row:nth-child(odd){background:#f2f7fb}.n{font-size:8px}.tick{width:17px;height:17px;border:1px solid #8ea5bb;border-radius:2px}strong{font-weight:700}</style></head><body>\${sheets.join('')}</body></html>\`;
    await window.anandaDesktop.printHtml(doc)
  }

  function p2v58SetStatus(text,ok=true){
    const s=$('p2v58QrStatus');if(!s)return;s.textContent=text;s.classList.remove('hidden','ok','bad');s.classList.add(ok?'ok':'bad')
  }
  async function p2v58ReadImageFile(file){
    const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});p2v58ReadImageDataUrl(data,file.name)
  }
  async function p2v58ReadImageDataUrl(dataUrl,name='attendance image'){
    try{
      p2v58SetStatus('Reading QR from '+name+'…',true);
      const img=await new Promise((ok,no)=>{const x=new Image();x.onload=()=>ok(x);x.onerror=no;x.src=dataUrl});
      const max=1400,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
      const id=ctx.getImageData(0,0,w,h),hit=await window.anandaDesktop?.decodeQrImageData({data:id.data,width:w,height:h});
      if(!hit?.data){p2v58SetStatus('QR not detected — select class manually.',false);return}
      const parsed=p2v58ParseQr(hit.data);if(!parsed){p2v58SetStatus('This QR is not a valid Ananda attendance sheet.',false);return}
      p2v58AttendanceBatch=parsed.b.id;p2v58AttendanceDate=parsed.date;p2v58FillSelectors(String(parsed.b.courseId||p2CourseName(parsed.b)));p2v58RenderRoster();
      p2v58SetStatus(\`QR identified automatically: \${p2CourseName(parsed.b)} · \${parsed.b.name} · \${typeof fmt==='function'?fmt(parsed.date):parsed.date} · Sheet \${parsed.sheet} of \${parsed.total}\`,true)
    }catch(e){p2v58SetStatus('Could not read this image. Try a clearer photo or select class manually.',false)}
  }
  async function p2v58StartPhone(){
    const box=$('p2v58PhoneConnect');box.classList.remove('hidden');box.innerHTML='<div class="p2-empty">Starting local phone connection…</div>';
    const info=await window.anandaDesktop?.startAttendancePhoneUpload?.();if(!info?.ok){box.innerHTML='<div class="security-warning">Could not start phone connection. '+p2v58Esc(info?.error||'Unknown error')+'</div>';return}
    const qr=await window.anandaDesktop.makeQrDataUrl(info.url,{width:220,margin:1});
    box.innerHTML=\`<div class="p2v58-connect-card"><img src="\${qr}"><div><strong>Scan with your phone camera</strong><p>Keep the phone and this laptop on the same Wi-Fi or hotspot. Internet is not required.</p><code>\${p2v58Esc(info.url)}</code></div></div>\`
  }

  (function p2v58Style(){
    if($('p2v58Style'))return;const st=document.createElement('style');st.id='p2v58Style';st.textContent=\`
    #p2v58AttendanceCard{cursor:pointer;text-align:left}#p2v58AttendanceCard h3{margin:10px 0 5px;color:#123f7d}#p2v58AttendanceCard p{margin:0;color:#61778d}.p2v58-num{font-size:11px;color:#214f8f}
    #p2v58AttendanceShell{display:none}.p2v58-attendance-open>#p2v58AttendanceShell{display:block}.p2v58-attendance-open>:not(#p2v58AttendanceShell){display:none!important}
    .p2v58-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.p2v58-head h2{margin:0;color:#102d5e}.p2v58-head p{margin:5px 0 0;color:#637b94;font-size:12px}
    .p2v58-filterbar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;background:#fff;border:1px solid #dce6ef;border-radius:12px;padding:14px;margin-top:16px}.p2v58-filterbar label{display:block;font-size:11px;font-weight:900;color:#17385f;margin-bottom:5px}.p2v58-filterbar select{width:100%;height:40px;border:1px solid #cbd8e6;border-radius:8px;background:#fff;padding:0 10px;color:#17385f}
    .p2v58-actions{display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr;gap:10px;margin:12px 0}.p2v58-action{min-height:58px;border:1px solid #8cb2e5;background:#f8fbff;color:#123f7d;border-radius:6px;font-weight:900;cursor:pointer}.p2v58-action.active{background:#123f7d;color:#fff}.p2v58-action small{display:block;margin-top:3px;font-weight:600}
    .p2v58-tabs{display:flex;align-items:center;gap:20px;margin:8px 0}.p2v58-tabs button{border:0;border-bottom:3px solid #1a5bc2;background:transparent;color:#123f7d;padding:10px 12px;font-weight:900}.p2v58-tabs span{flex:1}.p2v58-tabs input{width:300px;height:38px;border:1px solid #ccd9e5;border-radius:8px;padding:0 12px}
    .p2v58-roster-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p2v58-roster-col{border:1px solid #e0e8f0;border-radius:8px;overflow:hidden}.p2v58-roster-head{text-align:center;background:#174c91;color:#fff;font-weight:900;padding:7px}.p2v58-person{display:grid;grid-template-columns:54px 1fr 48px;align-items:center;min-height:31px;padding:0 8px}.p2v58-person:nth-child(even){background:#f2f7fb}.p2v58-index{font-size:11px;color:#365780}.p2v58-person strong{font-size:12px;color:#123f7d}.p2v58-check{width:18px;height:18px;accent-color:#11a04b}
    .p2v58-bottom{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;margin-top:12px;background:#fff;border-top:1px solid #e6edf3;padding:14px 0}.p2v58-bottom>div{display:flex;gap:10px;align-items:center}.p2v58-bottom>div:last-child{justify-content:flex-end}#p2v58Totals .green{color:#0b9a47}#p2v58Totals .red{color:#dc3131}
    .p2v58-status{border-radius:9px;padding:10px 12px;margin:8px 0;font-size:12px;font-weight:800}.p2v58-status.ok{background:#eaf8f0;color:#116b46}.p2v58-status.bad{background:#fff0f0;color:#a52f2f}.p2v58-status.hidden{display:none}
    .p2v58-phone-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px}.p2v58-connect-card{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:center;margin-top:16px;background:#f7fbff;border:1px solid #dce6ef;border-radius:12px;padding:14px}.p2v58-connect-card img{width:170px;height:170px}.p2v58-connect-card p{color:#61778d;font-size:12px;line-height:1.45}.p2v58-connect-card code{font-size:11px;word-break:break-all}
    @media(max-width:1000px){.p2v58-actions{grid-template-columns:1fr 1fr}.p2v58-roster-grid{grid-template-columns:1fr}.p2v58-filterbar{grid-template-columns:1fr}.p2v58-bottom{grid-template-columns:1fr}.p2v58-tabs input{width:220px}}
    \`;document.head.appendChild(st)
  })();

  p2v58EnsureAttendanceShell();p2v58EnsureHomeCard();
  const p2v58SwitchBase=switchPage;switchPage=function(id){if(id!=='classes')p2v58CloseAttendance();const out=p2v58SwitchBase.apply(this,arguments);if(id==='classes')setTimeout(()=>{p2v58EnsureAttendanceShell();p2v58EnsureHomeCard()},0);return out};
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.8 QR ATTENDANCE APPLIED',len(html))

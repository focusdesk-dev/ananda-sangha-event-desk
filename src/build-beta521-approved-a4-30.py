from pathlib import Path

htmlp=Path('src/index.html')
html=htmlp.read_text(encoding='utf-8')
if 'PHASE2 BETA520 A4 LANDSCAPE 40' not in html:
    raise SystemExit('Beta 5.20 attendance patch missing')
if 'PHASE2 BETA521 APPROVED A4 30' in html:
    print('Beta 5.21 already applied')
    raise SystemExit(0)

marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker missing')

patch=r'''
  // PHASE2 BETA521 APPROVED A4 30
  // Approved sheet: A4 landscape, fixed 15 rows left + 15 rows right,
  // exact 30-name maximum, large white attendance lanes, no row stretching.
  const P2V521_LAYOUT='A4L30V2';
  const P2V521_DOC={
    width:297,height:210,
    anchor:[[11,11],[286,11],[11,199],[286,199]],
    headerTop:39,headerHeight:9,
    dataTop:48,dataBottom:189,
    left:9,right:152,rowWidth:136,
    serialWidth:13,nameWidth:47,markStart:60,markEnd:136,
    rowsPerColumn:15
  };
  const P2V521_ROW_HEIGHT=(P2V521_DOC.dataBottom-P2V521_DOC.dataTop)/P2V521_DOC.rowsPerColumn;

  function p2v521Pos(i){
    return i<P2V521_DOC.rowsPerColumn
      ?{col:0,row:i,left:P2V521_DOC.left}
      :{col:1,row:i-P2V521_DOC.rowsPerColumn,left:P2V521_DOC.right}
  }
  function p2v521Payload(b,date,sheet,total,sheetId){
    const core=[String(b.id),String(date),String(sheet),String(total),String(sheetId),P2V521_LAYOUT].join('|');
    return JSON.stringify({
      v:5,kind:'ANANDA_ATTENDANCE',layout:P2V521_LAYOUT,
      batchId:String(b.id),date:String(date),sheet:Number(sheet),totalSheets:Number(total),
      sheetId:String(sheetId),sessionId:String(b.id)+':'+String(date),verify:p2v58Hash(core)
    })
  }

  const p2v521ParseBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    try{
      const o=JSON.parse(String(raw||''));
      if(o&&o.kind==='ANANDA_ATTENDANCE'&&Number(o.v)===5&&o.sheetId&&o.layout===P2V521_LAYOUT){
        const core=[String(o.batchId),String(o.date),String(o.sheet),String(o.totalSheets),String(o.sheetId),String(o.layout)].join('|');
        if(String(o.verify)!==p2v58Hash(core))return null;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||'')))return null;
        return o
      }
    }catch{}
    return p2v521ParseBase(raw)
  };

  function p2v521Detect(prep,count){
    const anchors=[0,1,2,3].map(q=>p2v518FindAnchor(prep.img,prep.w,prep.h,q));
    if(anchors.some(x=>!x))return{ok:false,reason:'All four corner markers must be visible. Retake the full A4 sheet.'};
    const dst=anchors.map(x=>({x:x.cx,y:x.cy})),H=p2v511Homography(P2V521_DOC.anchor,dst);
    if(!H)return{ok:false,reason:'The A4 page could not be aligned. Retake the full sheet.'};
    const marks=[];
    for(let i=0;i<count;i++){
      const pos=p2v521Pos(i),top=P2V521_DOC.dataTop+pos.row*P2V521_ROW_HEIGHT;
      // The visible attendance lane is broad and completely white.
      // The detector stays 2 mm inside its horizontal edges and ~1.4 mm inside
      // the row lines, so printed borders cannot become attendance marks.
      const x0=pos.left+P2V521_DOC.markStart+2,
            x1=pos.left+P2V521_DOC.markEnd-2,
            y0=top+1.4,
            y1=top+P2V521_ROW_HEIGHT-1.4;
      marks.push(p2v518Ink(p2v518ZonePatch(prep.img,prep.w,prep.h,H,x0,y0,x1,y1,250,72)))
    }
    return{ok:true,marks,anchors:dst}
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR, four A4 corners and attendance marks...';
    let prep;try{prep=await p2v518Prepare(blob)}catch(e){if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>';return}
    const raw=attendancePayload||prep.raw||'',data=p2v58ParsePayload(raw);
    if(!data){p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">QR could not be read or verified. Retake the full A4 sheet.</span>';return}
    const ok=await p2v58ApplyQrRaw(raw,name);if(!ok)return;
    if(Number(data.v)!==5||data.layout!==P2V521_LAYOUT||!data.sheetId){
      p2v518ClearScanScope();
      p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">This sheet uses an older print calibration. Print the approved 30-name sheet again for automatic scanning.</span>';return
    }
    const snap=state.attendanceSheetSnapshots?.[String(data.sheetId)];
    if(!snap||snap.layout!==P2V521_LAYOUT||String(snap.batchId)!==String(data.batchId)||String(snap.date)!==String(data.date)){
      p2v518ClearScanScope();p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">The exact printed-sheet roster is not available. No attendance was guessed.</span>';return
    }
    const mapped=p2v518RowsForSnapshot(snap);
    if(mapped.missing.length){
      p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">A printed student no longer maps safely to the class record. Review manually; nothing was guessed.</span>';return
    }
    p2v518ActiveSnapshot=snap;p2v518ActiveRows=mapped.out;
    p2v58Draft={};p2v518ActiveRows.forEach(r=>p2v58Draft[r.en.id]=null);
    const det=p2v521Detect(prep,p2v518ActiveRows.length);
    if(!det.ok){p2v58RenderRoster();p2v511ShowReview(0,Number(data.sheet||1),Number(data.totalSheets||1),det.reason);if(status)status.innerHTML='<span class="bad">'+esc(det.reason)+'</span>';return}
    let present=0;const detected=[];
    p2v518ActiveRows.forEach((r,i)=>{
      const hit=!!det.marks[i]?.present;
      p2v58Draft[r.en.id]=hit?true:null;
      if(hit){present++;detected.push(r.p.name||r.sheetRow?.name||'Unnamed')}
    });
    p2v58RenderRoster();
    p2v511ShowReview(
      present,Number(data.sheet||1),Number(data.totalSheets||1),
      'Sheet '+String(data.sheetId)+' · exact frozen printed roster only. Detected: '+(detected.length?detected.join(', '):'none')+'. Review before marking remaining absent.'
    );
    if(status)status.innerHTML='<span class="good"><b>Sheet analysed ✓</b> '+present+' present mark'+(present===1?'':'s')+' detected from this exact printed sheet.</span>';
    $('p2v58Roster')?.scrollIntoView({behavior:'smooth',block:'start'})
  };
  p2v58HandleUploadedFile=async function(file){await p2v511ApplyPhotoBlob(file,file.name||'Uploaded sheet','')};
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    try{const blob=await (await fetch(dataUrl)).blob();await p2v511ApplyPhotoBlob(blob,name,attendancePayload)}
    catch(e){const status=$('p2v58UploadStatus');if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Attendance photo could not be analysed')+'</span>'}
  };

  p2v58PrintSheet=async function(){
    p2v518ClearScanScope();
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}
    const rows=p2v518CurrentRowsBase();if(!rows.length){toast('No students enrolled in this batch');return}

    // EXACT APPROVED CAPACITY: 30 names per A4 sheet, 15 + 15.
    const chunks=[];for(let i=0;i<rows.length;i+=30)chunks.push(rows.slice(i,i+30));
    const logo=await p2v58LogoData(),pages=[];

    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],sheetId=p2v518Id(),payload=p2v521Payload(b,p2v58Date,pi+1,chunks.length,sheetId);
      const snap={
        layout:P2V521_LAYOUT,sheetId,batchId:String(b.id),date:String(p2v58Date),
        sheet:pi+1,totalSheets:chunks.length,course:p2CourseName(b),batch:b.name,createdAt:new Date().toISOString(),
        rows:chunk.map((r,i)=>({
          position:i+1,enrollmentId:String(r.en.id),studentId:String(r.en.studentId||''),
          name:String(r.p.name||''),mobile:String(r.p.mobile||'')
        }))
      };
      state.attendanceSheetSnapshots[sheetId]=snap;

      const meta={
        payload,sheetId,layout:P2V521_LAYOUT,course:p2CourseName(b),batch:b.name,
        date:fmt(p2v58Date),dateIso:p2v58Date,sheet:pi+1,total:chunks.length
      };
      const link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),
        qrText=link?.ok&&link.url?link.url:payload,
        qr=await p2v58MakeQr(qrText,300);
      if(!qr){toast('Could not create attendance QR');return}

      const rowHtml=chunk.map((r,i)=>{
        const pos=p2v521Pos(i),top=P2V521_DOC.dataTop+pos.row*P2V521_ROW_HEIGHT;
        return '<div class="att-row '+(pos.row%2?'even':'odd')+'" style="left:'+pos.left+'mm;top:'+top+'mm;height:'+P2V521_ROW_HEIGHT+'mm">'+
          '<span class="num">'+String(pi*30+i+1).padStart(2,'0')+'</span>'+
          '<span class="nm">'+esc(r.p.name||'Unnamed')+'</span>'+
          '<span class="mark"></span></div>'
      }).join('');

      pages.push(
        '<section class="sheet">'+
        '<span class="fid tl"><i></i></span><span class="fid tr"><i></i></span><span class="fid bl"><i></i></span><span class="fid br"><i></i></span>'+
        '<div class="brand">'+(logo?'<img src="'+logo+'">':'')+'<b>ANANDA SANGHA</b></div>'+
        '<h1>CLASS ATTENDANCE</h1>'+
        '<div class="scanqr"><img src="'+qr+'"><small>SCAN TO UPLOAD</small></div>'+
        '<div class="sheetmeta">'+
          '<div><span>Sheet ID</span><b>'+esc(sheetId)+'</b></div>'+
          '<div><span>Level</span><b>'+esc(p2CourseName(b).replace(/^Level\s*/i,'')||p2CourseName(b))+'</b></div>'+
          '<div><span>Batch</span><b>'+esc(String(b.name).replace(/^Batch\s*/i,'')||String(b.name))+'</b></div>'+
          '<div><span>Date</span><b>'+esc(fmt(p2v58Date))+'</b></div>'+
        '</div>'+
        '<div class="head left"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        '<div class="head right"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        rowHtml+
        '</section>'
      )
    }

    save();
    const printHtml='<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>'+
      '@page{size:297mm 210mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#073a88;background:#fff}.sheet{position:relative;width:297mm;height:210mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}'+
      '.fid{position:absolute;width:6mm;height:6mm;border:1.05mm solid #0e2f5c;z-index:20;background:#fff}.fid i{position:absolute;left:1.35mm;top:1.35mm;width:1.2mm;height:1.2mm;background:#111}.fid.tl{left:8mm;top:8mm}.fid.tr{right:8mm;top:8mm}.fid.bl{left:8mm;bottom:8mm}.fid.br{right:8mm;bottom:8mm}'+
      '.brand{position:absolute;left:18mm;top:14mm;height:16mm;display:flex;align-items:center;gap:4mm;font-size:15pt;letter-spacing:.15mm;font-weight:700}.brand img{width:14mm;height:14mm;border-radius:50%;display:block}'+
      'h1{position:absolute;left:105mm;top:18mm;width:86mm;text-align:center;margin:0;font-size:20pt;line-height:1;font-weight:800;letter-spacing:.1mm;color:#073a88}'+
      '.scanqr{position:absolute;left:202mm;top:11mm;width:21mm;text-align:center;z-index:15;background:#fff}.scanqr img{display:block;width:21mm;height:21mm;margin:0 auto}.scanqr small{display:block;font-size:5.2pt;margin-top:1mm;font-weight:700;white-space:nowrap;color:#073a88}'+
      '.sheetmeta{position:absolute;left:228mm;top:14mm;width:60mm;font-size:8.1pt;line-height:1.45;z-index:15;background:#fff;color:#073a88}.sheetmeta div{display:grid;grid-template-columns:15mm 2mm minmax(0,1fr);align-items:center}.sheetmeta div:before{content:"";display:none}.sheetmeta span{font-weight:400}.sheetmeta span:after{content:" :";float:right}.sheetmeta b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:1mm}'+
      '.head{position:absolute;top:39mm;width:136mm;height:9mm;background:#00519b;color:#fff;display:grid;grid-template-columns:13mm 47mm 76mm;align-items:center;font-size:10pt;border-radius:.6mm .6mm 0 0}.head.left{left:9mm}.head.right{left:152mm}.head span{text-align:center;font-weight:700}.head b:nth-child(2){padding-left:4mm}.head b:nth-child(3){text-align:center}'+
      '.att-row{position:absolute;width:136mm;display:grid;grid-template-columns:13mm 47mm 76mm;align-items:stretch;font-size:10pt;border-left:.18mm solid #9cc7ed;border-right:.18mm solid #9cc7ed;border-bottom:.18mm solid #9cc7ed}.num,.nm{display:flex;align-items:center}.num{justify-content:center;font-size:8.5pt;font-weight:500;color:#073a88}.nm{padding-left:4mm;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:.18mm solid #9cc7ed}.att-row.odd .num,.att-row.odd .nm{background:#f0f8ff}.att-row.even .num,.att-row.even .nm{background:#fff}.mark{background:#fff!important;border-left:.18mm solid #9cc7ed}'+
      '</style></head><body>'+pages.join('')+'</body></html>';

    const r=await window.anandaDesktop?.printHtml(printHtml);
    if(r&&!r.ok)toast(r.error||'Printing failed')
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
htmlp.write_text(html,encoding='utf-8')

mainp=Path('src/main.js')
m=mainp.read_text(encoding='utf-8')
if 'BETA521 APPROVED LANDSCAPE PREVIEW' not in m:
    # Phone compact URL payload reconstruction: this geometry gets its own version.
    old="const payload=JSON.stringify({v:layout==='A4L40'?4:(layout==='A4L30'?3:(sheetId?2:1)),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});"
    new="const payload=JSON.stringify({v:layout==='A4L30V2'?5:(layout==='A4L40'?4:(layout==='A4L30'?3:(sheetId?2:1))),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});"
    if old not in m:
        raise SystemExit('Beta 5.20 compact payload builder not found')
    m=m.replace(old,new,1)

    # ROOT CAUSE FIX:
    # The preview wrapper was forcing every sheet to max-width:210mm on screen.
    # A real A4 landscape sheet is 297mm wide, so that distorted/clipped the preview.
    old_preview=".sheet{display:none!important;background:#fff;margin:0 auto 22px!important;max-width:210mm;box-shadow:0 8px 30px #102d5e22}"
    new_preview=".sheet{display:none!important;background:#fff;margin:0 auto 22px!important;max-width:none!important;width:297mm!important;height:210mm!important;box-shadow:0 8px 30px #102d5e22}"
    if old_preview not in m:
        raise SystemExit('Old 210mm preview clamp not found')
    m=m.replace(old_preview,new_preview,1)

    old_show="let idx=0;function show(){sheets.forEach((x,i)=>x.classList.toggle('ananda-preview-active',i===idx));counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1}"
    new_show="let idx=0;function fit(){const p=sheets[idx];if(!p)return;p.style.zoom='1';const available=Math.max(420,window.innerWidth-56),z=Math.min(1,available/Math.max(1,p.offsetWidth));p.style.zoom=String(z)}function show(){sheets.forEach((x,i)=>{x.classList.toggle('ananda-preview-active',i===idx);x.style.zoom='1'});counter.textContent=sheets.length?((idx+1)+' / '+sheets.length):'1 / 1';document.getElementById('anandaPrev').disabled=idx<=0;document.getElementById('anandaNext').disabled=idx>=sheets.length-1;requestAnimationFrame(fit)}window.addEventListener('resize',fit)"
    if old_show not in m:
        raise SystemExit('Preview show() block not found')
    m=m.replace(old_show,new_show,1)

    old_print="@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.sheet{display:block!important;box-shadow:none!important}}"
    new_print="@media print{.ananda-preview-toolbar{display:none!important}body{padding:0!important;background:#fff!important}.sheet{display:block!important;box-shadow:none!important;zoom:1!important;width:297mm!important;height:210mm!important}}"
    if old_print not in m:
        raise SystemExit('Preview print media block not found')
    m=m.replace(old_print,new_print,1)

    old_native="win.webContents.print({silent:false,printBackground:true},()=>{})"
    new_native="win.webContents.print({silent:false,printBackground:true,landscape:true},()=>{})"
    if old_native not in m:
        raise SystemExit('Preview print options not found')
    m=m.replace(old_native,new_native,1)

    old_pdf="win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,pageSize:'A4'})"
    new_pdf="win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true})"
    if old_pdf not in m:
        raise SystemExit('Preview PDF options not found')
    m=m.replace(old_pdf,new_pdf,1)

    needle="function anandaDecoratePrintPreview(source){"
    m=m.replace(needle,"// BETA521 APPROVED LANDSCAPE PREVIEW\n"+needle,1)
    mainp.write_text(m,encoding='utf-8')

print('BETA 5.21 APPROVED A4 30 + LANDSCAPE PREVIEW FIX APPLIED')

from pathlib import Path

htmlp=Path('src/index.html')
html=htmlp.read_text(encoding='utf-8')
if 'PHASE2 BETA519 A4 LANDSCAPE 30' not in html:
    raise SystemExit('Beta 5.19 landscape attendance patch missing')
if 'PHASE2 BETA520 A4 LANDSCAPE 40' in html:
    print('Beta 5.20 already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker missing')

patch=r'''
  // PHASE2 BETA520 A4 LANDSCAPE 40
  // One real A4 landscape sheet now holds up to 40 students:
  // fixed 20 rows on the left + fixed 20 rows on the right.
  // Fixed row pitch prevents the last sheet from stretching when it has only a few names.
  const P2V520_LAYOUT='A4L40';
  const P2V520_DOC={
    width:297,height:210,
    anchor:[[11,11],[286,11],[11,199],[286,199]],
    dataTop:51,dataBottom:193,
    left:10,right:151,rowWidth:136,
    serialWidth:10,nameWidth:40,markStart:50,markEnd:136,
    rowsPerColumn:20
  };
  const P2V520_ROW_HEIGHT=(P2V520_DOC.dataBottom-P2V520_DOC.dataTop)/P2V520_DOC.rowsPerColumn;
  function p2v520Geometry(count){
    const leftCount=Math.min(P2V520_DOC.rowsPerColumn,Math.max(0,count)),
      rightCount=Math.max(0,Math.min(P2V520_DOC.rowsPerColumn,count-P2V520_DOC.rowsPerColumn));
    return{leftCount,rightCount,rows:P2V520_DOC.rowsPerColumn,rowHeight:P2V520_ROW_HEIGHT}
  }
  function p2v520Pos(i){
    return i<P2V520_DOC.rowsPerColumn
      ?{col:0,row:i,left:P2V520_DOC.left}
      :{col:1,row:i-P2V520_DOC.rowsPerColumn,left:P2V520_DOC.right}
  }
  function p2v520Payload(b,date,sheet,total,sheetId){
    const core=[String(b.id),String(date),String(sheet),String(total),String(sheetId),P2V520_LAYOUT].join('|');
    return JSON.stringify({v:4,kind:'ANANDA_ATTENDANCE',layout:P2V520_LAYOUT,batchId:String(b.id),date:String(date),sheet:Number(sheet),totalSheets:Number(total),sheetId:String(sheetId),sessionId:String(b.id)+':'+String(date),verify:p2v58Hash(core)})
  }

  const p2v520ParseBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    try{
      const o=JSON.parse(String(raw||''));
      if(o&&o.kind==='ANANDA_ATTENDANCE'&&Number(o.v)===4&&o.sheetId&&o.layout===P2V520_LAYOUT){
        const core=[String(o.batchId),String(o.date),String(o.sheet),String(o.totalSheets),String(o.sheetId),String(o.layout)].join('|');
        if(String(o.verify)!==p2v58Hash(core))return null;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||'')))return null;
        return o
      }
    }catch{}
    return p2v520ParseBase(raw)
  };

  function p2v520Detect(prep,count){
    const anchors=[0,1,2,3].map(q=>p2v518FindAnchor(prep.img,prep.w,prep.h,q));
    if(anchors.some(x=>!x))return{ok:false,reason:'All four corner markers must be visible. Retake the full A4 sheet.'};
    const dst=anchors.map(x=>({x:x.cx,y:x.cy})),H=p2v511Homography(P2V520_DOC.anchor,dst);
    if(!H)return{ok:false,reason:'The A4 page could not be aligned. Retake the full sheet.'};
    const marks=[];
    for(let i=0;i<count;i++){
      const pos=p2v520Pos(i),top=P2V520_DOC.dataTop+pos.row*P2V520_ROW_HEIGHT;
      const x0=pos.left+P2V520_DOC.markStart+2,
            x1=pos.left+P2V520_DOC.markEnd-2,
            y0=top+1.15,
            y1=top+P2V520_ROW_HEIGHT-1.15;
      marks.push(p2v518Ink(p2v518ZonePatch(prep.img,prep.w,prep.h,H,x0,y0,x1,y1,260,58)))
    }
    return{ok:true,marks,anchors:dst}
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR, four A4 corners and attendance marks...';
    let prep;try{prep=await p2v518Prepare(blob)}catch(e){if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>';return}
    const raw=attendancePayload||prep.raw||'',data=p2v58ParsePayload(raw);
    if(!data){p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">QR could not be read or verified. Retake the full A4 sheet.</span>';return}
    const ok=await p2v58ApplyQrRaw(raw,name);if(!ok)return;
    if(Number(data.v)!==4||data.layout!==P2V520_LAYOUT||!data.sheetId){
      p2v518ClearScanScope();
      p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">This sheet uses an older print calibration. Print a new 40-name attendance sheet for automatic scanning.</span>';return
    }
    const snap=state.attendanceSheetSnapshots?.[String(data.sheetId)];
    if(!snap||snap.layout!==P2V520_LAYOUT||String(snap.batchId)!==String(data.batchId)||String(snap.date)!==String(data.date)){
      p2v518ClearScanScope();p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">The exact printed-sheet roster is not available. No attendance was guessed.</span>';return
    }
    const mapped=p2v518RowsForSnapshot(snap);
    if(mapped.missing.length){
      p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">A printed student no longer maps safely to the class record. Review manually; nothing was guessed.</span>';return
    }
    p2v518ActiveSnapshot=snap;p2v518ActiveRows=mapped.out;
    p2v58Draft={};p2v518ActiveRows.forEach(r=>p2v58Draft[r.en.id]=null);
    const det=p2v520Detect(prep,p2v518ActiveRows.length);
    if(!det.ok){p2v58RenderRoster();p2v511ShowReview(0,Number(data.sheet||1),Number(data.totalSheets||1),det.reason);if(status)status.innerHTML='<span class="bad">'+esc(det.reason)+'</span>';return}
    let present=0;const detected=[];
    p2v518ActiveRows.forEach((r,i)=>{const hit=!!det.marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit){present++;detected.push(r.p.name||r.sheetRow?.name||'Unnamed')}});
    p2v58RenderRoster();
    p2v511ShowReview(present,Number(data.sheet||1),Number(data.totalSheets||1),'Sheet '+String(data.sheetId)+' · exact frozen printed roster only. Detected: '+(detected.length?detected.join(', '):'none')+'. Review before marking remaining absent.');
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
    const chunks=[];for(let i=0;i<rows.length;i+=40)chunks.push(rows.slice(i,i+40));
    const logo=await p2v58LogoData(),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],sheetId=p2v518Id(),payload=p2v520Payload(b,p2v58Date,pi+1,chunks.length,sheetId);
      const snap={
        layout:P2V520_LAYOUT,sheetId,batchId:String(b.id),date:String(p2v58Date),
        sheet:pi+1,totalSheets:chunks.length,course:p2CourseName(b),batch:b.name,createdAt:new Date().toISOString(),
        rows:chunk.map((r,i)=>({position:i+1,enrollmentId:String(r.en.id),studentId:String(r.en.studentId||''),name:String(r.p.name||''),mobile:String(r.p.mobile||'')}))
      };
      state.attendanceSheetSnapshots[sheetId]=snap;
      const meta={payload,sheetId,layout:P2V520_LAYOUT,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),dateIso:p2v58Date,sheet:pi+1,total:chunks.length},
        link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),
        qrText=link?.ok&&link.url?link.url:payload,
        qr=await p2v58MakeQr(qrText,300);
      if(!qr){toast('Could not create attendance QR');return}
      const rowHtml=chunk.map((r,i)=>{
        const pos=p2v520Pos(i),top=P2V520_DOC.dataTop+pos.row*P2V520_ROW_HEIGHT;
        return '<div class="att-row '+(pos.row%2?'even':'odd')+'" style="left:'+pos.left+'mm;top:'+top+'mm;height:'+P2V520_ROW_HEIGHT+'mm"><span class="num">'+String(pi*40+i+1).padStart(2,'0')+'</span><span class="nm">'+esc(r.p.name||'Unnamed')+'</span><span class="mark"></span></div>'
      }).join('');
      pages.push(
        '<section class="sheet">'+
        '<span class="fid tl"><i></i></span><span class="fid tr"><i></i></span><span class="fid bl"><i></i></span><span class="fid br"><i></i></span>'+
        '<div class="brand">'+(logo?'<img src="'+logo+'">':'')+'<b>ANANDA SANGHA</b></div>'+
        '<h1>CLASS ATTENDANCE</h1>'+
        '<div class="scanqr"><img src="'+qr+'"><small>SCAN TO UPLOAD</small></div>'+
        '<div class="sheetmeta"><div><span>Sheet ID</span><b>'+esc(sheetId)+'</b></div><div><span>Level</span><b>'+esc(p2CourseName(b).replace(/^Level\s*/i,'')||p2CourseName(b))+'</b></div><div><span>Batch</span><b>'+esc(String(b.name).replace(/^Batch\s*/i,'')||String(b.name))+'</b></div><div><span>Date</span><b>'+esc(fmt(p2v58Date))+'</b></div></div>'+
        '<div class="head left"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        '<div class="head right"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        rowHtml+
        '</section>'
      )
    }
    save();
    const printHtml='<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>'+
      '@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#082f71;background:#fff}.sheet{position:relative;width:297mm;height:210mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}'+
      '.fid{position:absolute;width:6mm;height:6mm;border:1.05mm solid #174f96;z-index:20;background:#fff}.fid i{position:absolute;left:1.3mm;top:1.3mm;width:1.15mm;height:1.15mm;background:#174f96}.fid.tl{left:8mm;top:8mm}.fid.tr{right:8mm;top:8mm}.fid.bl{left:8mm;bottom:8mm}.fid.br{right:8mm;bottom:8mm}'+
      '.brand{position:absolute;left:18mm;top:12mm;height:16mm;display:flex;align-items:center;gap:3.5mm;font-size:14pt;letter-spacing:.2mm;z-index:5}.brand img{width:14mm;height:14mm;border-radius:50%}h1{position:absolute;left:94mm;top:14mm;width:92mm;text-align:center;margin:0;font-size:18pt;letter-spacing:.2mm;z-index:5}'+
      '.scanqr{position:absolute;left:211mm;top:7mm;width:27mm;text-align:center;z-index:15;background:#fff}.scanqr img{display:block;width:27mm;height:27mm;margin:0 auto}.scanqr small{display:block;font-size:5.2pt;margin-top:.4mm;font-weight:700;white-space:nowrap}'+
      '.sheetmeta{position:absolute;left:241mm;top:12mm;width:47mm;font-size:6.6pt;line-height:1.38;z-index:15;background:#fff}.sheetmeta div{display:grid;grid-template-columns:13mm minmax(0,1fr);gap:1mm}.sheetmeta span{font-weight:400}.sheetmeta b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.head{position:absolute;top:43mm;width:136mm;height:7mm;background:#174f96;color:#fff;display:grid;grid-template-columns:10mm 40mm 86mm;align-items:center;font-size:8.5pt}.head.left{left:10mm}.head.right{left:151mm}.head span{text-align:center}.head b:nth-child(2){padding-left:3mm}.head b:nth-child(3){text-align:center}'+
      '.att-row{position:absolute;width:136mm;display:grid;grid-template-columns:10mm 40mm 86mm;align-items:stretch;font-size:8.8pt;border-bottom:.17mm solid #d7e3ee}.num,.nm{display:flex;align-items:center}.num{justify-content:center;font-size:6.7pt;color:#315985}.nm{padding-left:3mm;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:.17mm solid #d7e3ee}.att-row.odd .num,.att-row.odd .nm{background:#f3f8fc}.att-row.even .num,.att-row.even .nm{background:#fff}.mark{background:#fff!important;border-left:.22mm solid #cadbea}'+
      '</style></head><body>'+pages.join('')+'</body></html>';
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
htmlp.write_text(html,encoding='utf-8')

mainp=Path('src/main.js')
m=mainp.read_text(encoding='utf-8')
if 'BETA520 A4L40 SHEET LINK' not in m:
    # Reconstructed compact phone payload must carry v4 for the new 40-name geometry.
    old="const payload=JSON.stringify({v:layout==='A4L30'?3:(sheetId?2:1),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});"
    new="const payload=JSON.stringify({v:layout==='A4L40'?4:(layout==='A4L30'?3:(sheetId?2:1)),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});"
    if old not in m: raise SystemExit('Beta 5.19 compact payload builder not found')
    m=m.replace(old,new,1)
    needle="function anandaMobilePage(meta,encoded){"
    m=m.replace(needle,needle+"\n  // BETA520 A4L40 SHEET LINK",1)
    mainp.write_text(m,encoding='utf-8')

print('BETA 5.20 A4 LANDSCAPE 40 + FIXED 20/20 ROWS APPLIED')

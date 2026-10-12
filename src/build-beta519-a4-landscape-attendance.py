from pathlib import Path
import re

htmlp=Path('src/index.html')
html=htmlp.read_text(encoding='utf-8')
if 'PHASE2 BETA518 FROZEN SHEET SCAN' not in html:
    raise SystemExit('Beta 5.18 scanner missing')
if 'PHASE2 BETA519 A4 LANDSCAPE 30' in html:
    print('Beta 5.19 already applied')
    raise SystemExit(0)

marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker missing')

patch=r'''
  // PHASE2 BETA519 A4 LANDSCAPE 30
  // Final print calibration: real A4 landscape (297 x 210 mm), max 30 names/page,
  // 15 left + 15 right, wide pure-white attendance lanes, four inward fiducials.
  const P2V519_LAYOUT='A4L30';
  const P2V519_DOC={
    width:297,height:210,
    anchor:[[11,11],[286,11],[11,199],[286,199]],
    dataTop:51,dataBottom:193,
    left:10,right:151,rowWidth:136,
    serialWidth:10,nameWidth:40,markStart:50,markEnd:136
  };
  function p2v519Geometry(count){
    const leftCount=Math.ceil(Math.max(1,count)/2),rightCount=Math.max(0,count-leftCount),
      rows=Math.max(1,leftCount);
    return{leftCount,rightCount,rows,rowHeight:(P2V519_DOC.dataBottom-P2V519_DOC.dataTop)/rows}
  }
  function p2v519Pos(i,count){
    const g=p2v519Geometry(count);
    return i<g.leftCount?{col:0,row:i,left:P2V519_DOC.left}:{col:1,row:i-g.leftCount,left:P2V519_DOC.right}
  }
  function p2v519Payload(b,date,sheet,total,sheetId){
    const core=[String(b.id),String(date),String(sheet),String(total),String(sheetId),P2V519_LAYOUT].join('|');
    return JSON.stringify({v:3,kind:'ANANDA_ATTENDANCE',layout:P2V519_LAYOUT,batchId:String(b.id),date:String(date),sheet:Number(sheet),totalSheets:Number(total),sheetId:String(sheetId),sessionId:String(b.id)+':'+String(date),verify:p2v58Hash(core)})
  }

  const p2v519ParseBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    try{
      const o=JSON.parse(String(raw||''));
      if(o&&o.kind==='ANANDA_ATTENDANCE'&&Number(o.v)===3&&o.sheetId&&o.layout===P2V519_LAYOUT){
        const core=[String(o.batchId),String(o.date),String(o.sheet),String(o.totalSheets),String(o.sheetId),String(o.layout)].join('|');
        if(String(o.verify)!==p2v58Hash(core))return null;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||'')))return null;
        return o
      }
    }catch{}
    return p2v519ParseBase(raw)
  };

  function p2v519Detect(prep,count){
    const anchors=[0,1,2,3].map(q=>p2v518FindAnchor(prep.img,prep.w,prep.h,q));
    if(anchors.some(x=>!x))return{ok:false,reason:'All four corner markers must be visible. Retake the full A4 sheet.'};
    const dst=anchors.map(x=>({x:x.cx,y:x.cy})),H=p2v511Homography(P2V519_DOC.anchor,dst);
    if(!H)return{ok:false,reason:'The A4 page could not be aligned. Retake the full sheet.'};
    const g=p2v519Geometry(count),marks=[];
    for(let i=0;i<count;i++){
      const pos=p2v519Pos(i,count),top=P2V519_DOC.dataTop+pos.row*g.rowHeight;
      // Printed attendance lane is intentionally much wider. Scanner ignores a 2 mm
      // inner perimeter, so dividers / row borders cannot become attendance marks.
      const x0=pos.left+P2V519_DOC.markStart+2,
            x1=pos.left+P2V519_DOC.markEnd-2,
            y0=top+1.3,
            y1=top+g.rowHeight-1.3;
      marks.push(p2v518Ink(p2v518ZonePatch(prep.img,prep.w,prep.h,H,x0,y0,x1,y1,260,70)))
    }
    return{ok:true,marks,anchors:dst}
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR, four A4 corners and attendance marks...';
    let prep;try{prep=await p2v518Prepare(blob)}catch(e){if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>';return}
    const raw=attendancePayload||prep.raw||'',data=p2v58ParsePayload(raw);
    if(!data){p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">QR could not be read or verified. Retake the full A4 sheet.</span>';return}
    const ok=await p2v58ApplyQrRaw(raw,name);if(!ok)return;
    if(Number(data.v)!==3||data.layout!==P2V519_LAYOUT||!data.sheetId){
      p2v518ClearScanScope();
      p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">This sheet uses an older print calibration. Print a new attendance sheet for automatic scanning.</span>';return
    }
    const snap=state.attendanceSheetSnapshots?.[String(data.sheetId)];
    if(!snap||snap.layout!==P2V519_LAYOUT||String(snap.batchId)!==String(data.batchId)||String(snap.date)!==String(data.date)){
      p2v518ClearScanScope();p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">The exact printed-sheet roster is not available. No attendance was guessed.</span>';return
    }
    const mapped=p2v518RowsForSnapshot(snap);
    if(mapped.missing.length){
      p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">A printed student no longer maps safely to the class record. Review manually; nothing was guessed.</span>';return
    }
    p2v518ActiveSnapshot=snap;p2v518ActiveRows=mapped.out;
    // Every machine scan begins blank. Saved/manual attendance cannot leak into detection.
    p2v58Draft={};p2v518ActiveRows.forEach(r=>p2v58Draft[r.en.id]=null);
    const det=p2v519Detect(prep,p2v518ActiveRows.length);
    if(!det.ok){p2v58RenderRoster();p2v511ShowReview(0,Number(data.sheet||1),Number(data.totalSheets||1),det.reason);if(status)status.innerHTML='<span class="bad">'+esc(det.reason)+'</span>';return}
    let present=0;const detected=[];
    p2v518ActiveRows.forEach((r,i)=>{const hit=!!det.marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit){present++;detected.push(r.p.name||r.sheetRow?.name||'Unnamed')}});
    p2v58RenderRoster();
    const msg='Sheet '+String(data.sheetId)+' · '+p2v518ActiveRows.length+' frozen printed names only. Detected: '+(detected.length?detected.join(', '):'none')+'. Review before marking remaining absent.';
    p2v511ShowReview(present,Number(data.sheet||1),Number(data.totalSheets||1),msg);
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
    const chunks=[];for(let i=0;i<rows.length;i+=30)chunks.push(rows.slice(i,i+30));
    const logo=await p2v58LogoData(),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],g=p2v519Geometry(chunk.length),sheetId=p2v518Id(),payload=p2v519Payload(b,p2v58Date,pi+1,chunks.length,sheetId);
      const snap={
        layout:P2V519_LAYOUT,sheetId,batchId:String(b.id),date:String(p2v58Date),
        sheet:pi+1,totalSheets:chunks.length,course:p2CourseName(b),batch:b.name,createdAt:new Date().toISOString(),
        rows:chunk.map((r,i)=>({position:i+1,enrollmentId:String(r.en.id),studentId:String(r.en.studentId||''),name:String(r.p.name||''),mobile:String(r.p.mobile||'')}))
      };
      state.attendanceSheetSnapshots[sheetId]=snap;
      const meta={payload,sheetId,layout:P2V519_LAYOUT,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),dateIso:p2v58Date,sheet:pi+1,total:chunks.length},
        link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),
        qrText=link?.ok&&link.url?link.url:payload,
        qr=await p2v58MakeQr(qrText,300);
      const rowHtml=chunk.map((r,i)=>{
        const pos=p2v519Pos(i,chunk.length),top=P2V519_DOC.dataTop+pos.row*g.rowHeight;
        return '<div class="att-row '+(pos.row%2?'even':'odd')+'" style="left:'+pos.left+'mm;top:'+top+'mm;height:'+g.rowHeight+'mm"><span class="num">'+String(pi*30+i+1).padStart(2,'0')+'</span><span class="nm">'+esc(r.p.name||'Unnamed')+'</span><span class="mark"></span></div>'
      }).join('');
      pages.push(
        '<section class="sheet">'+
        '<span class="fid tl"><i></i></span><span class="fid tr"><i></i></span><span class="fid bl"><i></i></span><span class="fid br"><i></i></span>'+
        '<div class="brand">'+(logo?'<img src="'+logo+'">':'')+'<b>ANANDA SANGHA</b></div>'+
        '<h1>CLASS ATTENDANCE</h1>'+
        '<div class="qr"><img src="'+qr+'"><small>SCAN TO UPLOAD</small></div>'+
        '<div class="meta"><div><span>Sheet ID</span><b>'+esc(sheetId)+'</b></div><div><span>Level</span><b>'+esc(p2CourseName(b).replace(/^Level\s*/i,'')||p2CourseName(b))+'</b></div><div><span>Batch</span><b>'+esc(String(b.name).replace(/^Batch\s*/i,'')||String(b.name))+'</b></div><div><span>Date</span><b>'+esc(fmt(p2v58Date))+'</b></div></div>'+
        '<div class="head left"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        '<div class="head right"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+
        rowHtml+
        '</section>'
      )
    }
    save();
    const printHtml='<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>'+
      '@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#082f71}.sheet{position:relative;width:297mm;height:210mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}'+
      '.fid{position:absolute;width:6mm;height:6mm;border:1.05mm solid #174f96;z-index:8;background:#fff}.fid i{position:absolute;left:1.3mm;top:1.3mm;width:1.15mm;height:1.15mm;background:#174f96}.fid.tl{left:8mm;top:8mm}.fid.tr{right:8mm;top:8mm}.fid.bl{left:8mm;bottom:8mm}.fid.br{right:8mm;bottom:8mm}'+
      '.brand{position:absolute;left:18mm;top:12mm;height:16mm;display:flex;align-items:center;gap:3.5mm;font-size:14pt;letter-spacing:.2mm}.brand img{width:14mm;height:14mm;border-radius:50%}h1{position:absolute;left:96mm;top:14mm;width:92mm;text-align:center;margin:0;font-size:18pt;letter-spacing:.2mm}'+
      '.qr{position:absolute;left:219mm;top:7mm;width:28mm;text-align:center}.qr img{display:block;width:28mm;height:28mm}.qr small{display:block;font-size:5.4pt;margin-top:.4mm;font-weight:700}'+
      '.meta{position:absolute;left:251mm;top:15mm;width:37mm;font-size:6.5pt;line-height:1.35}.meta div{display:grid;grid-template-columns:12mm 1fr;gap:1mm}.meta span{font-weight:400}.meta b{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.head{position:absolute;top:43mm;width:136mm;height:7mm;background:#174f96;color:#fff;display:grid;grid-template-columns:10mm 40mm 86mm;align-items:center;font-size:8.5pt}.head.left{left:10mm}.head.right{left:151mm}.head span{text-align:center}.head b:nth-child(2){padding-left:3mm}.head b:nth-child(3){text-align:center}'+
      '.att-row{position:absolute;width:136mm;display:grid;grid-template-columns:10mm 40mm 86mm;align-items:stretch;font-size:9.6pt;border-bottom:.18mm solid #d7e3ee}.num,.nm{display:flex;align-items:center}.num{justify-content:center;font-size:7pt;color:#315985}.nm{padding-left:3mm;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:.18mm solid #d7e3ee}.att-row.odd .num,.att-row.odd .nm{background:#f3f8fc}.att-row.even .num,.att-row.even .nm{background:#fff}.mark{background:#fff!important;border-left:.22mm solid #cadbea}'+
      '</style></head><body>'+pages.join('')+'</body></html>';
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
htmlp.write_text(html,encoding='utf-8')

mainp=Path('src/main.js')
m=mainp.read_text(encoding='utf-8')
if 'BETA519 LANDSCAPE SHEET LINK' not in m:
    # Compact QR now carries layout code so an old portrait sheet can never be
    # interpreted with the new landscape coordinates.
    old="const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'',sheetId=u.searchParams.get('x')||'';"
    new="const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'',sheetId=u.searchParams.get('x')||'',layout=u.searchParams.get('l')||'';"
    if old not in m: raise SystemExit('Beta 5.18 compact QR parser not found')
    m=m.replace(old,new,1)
    m=m.replace(
      "const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify,sheetId].join('|');",
      "const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify,sheetId,layout].join('|');",1)
    m=m.replace(
      "const payload=JSON.stringify({v:sheetId?2:1,kind:'ANANDA_ATTENDANCE',batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});",
      "const payload=JSON.stringify({v:layout==='A4L30'?3:(sheetId?2:1),kind:'ANANDA_ATTENDANCE',layout:layout||undefined,batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});",1)
    old2="const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||''),sheetId=String(p.sheetId||'');"
    new2="const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||''),sheetId=String(p.sheetId||''),layout=String(p.layout||'');"
    if old2 not in m: raise SystemExit('Beta 5.18 sheet-link builder parser not found')
    m=m.replace(old2,new2,1)
    m=m.replace(
      "const key=[b,d8,sheet,total,verify,sheetId].join('|');anandaAttendanceSheetMeta.set(key,meta||{});",
      "const key=[b,d8,sheet,total,verify,sheetId,layout].join('|');anandaAttendanceSheetMeta.set(key,meta||{});",1)
    m=m.replace(
      "const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify,...(sheetId?{x:sheetId}:{})}).toString();",
      "const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify,...(sheetId?{x:sheetId}:{}),...(layout?{l:layout}:{})}).toString();",1)

    # CLOSE first attempts a real tab close. If mobile Safari/Chrome blocks it,
    # go back out of the attendance page rather than leaving a dead success screen.
    oldclose="$('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{try{window.open('','_self');window.close()}catch{}setTimeout(()=>{if(!document.hidden){document.body.innerHTML='<div style=\"font-family:Arial;text-align:center;padding:55px;color:#123f7d\"><h2>Attendance sheet uploaded.</h2><p>This browser did not allow the tab to close automatically. You can close it now.</p></div>'}},350)};"
    newclose="$('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{try{window.open('','_self');window.close()}catch{}setTimeout(()=>{if(document.hidden)return;try{if(history.length>1){history.back();return}}catch{}try{location.replace('about:blank')}catch{}},250)};"
    if oldclose not in m: raise SystemExit('Beta 5.18 phone CLOSE handler not found')
    m=m.replace(oldclose,newclose,1)
    needle="function anandaMobilePage(meta,encoded){"
    m=m.replace(needle,needle+"\n  // BETA519 LANDSCAPE SHEET LINK",1)
    mainp.write_text(m,encoding='utf-8')

print('BETA 5.19 A4 LANDSCAPE 30 + WIDE ATTENDANCE + PHONE CLOSE APPLIED')

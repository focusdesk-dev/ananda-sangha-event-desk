from pathlib import Path
import re

htmlp=Path('src/index.html')
html=htmlp.read_text(encoding='utf-8')
if 'PHASE2 BETA517 ATTENDANCE GENIUS' not in html:
    raise SystemExit('Beta 5.17 attendance patch missing')
if 'PHASE2 BETA518 FROZEN SHEET SCAN' in html:
    print('Beta 5.18 frozen-sheet scanner already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker missing')

patch=r'''
  // PHASE2 BETA518 FROZEN SHEET SCAN
  // QR identifies a frozen printed roster. Four corner fiducials, not the QR,
  // define page geometry. Only new black/dark-blue ink inside white mark lanes counts.

  state.attendanceSheetSnapshots=state.attendanceSheetSnapshots||{};
  let p2v518ActiveRows=null,p2v518ActiveSnapshot=null;
  const p2v518CurrentRowsBase=p2v58CurrentRows;
  p2v58CurrentRows=function(){return p2v518ActiveRows||p2v518CurrentRowsBase()};

  const P2V518_DOC={anchor:[[7,7],[203,7],[7,290],[203,290]],top:70,bottom:275,left:7,right:108};
  function p2v518Geometry(count){const rows=Math.max(1,Math.ceil(Math.max(1,count)/2));return{rows,rowHeight:Math.min(30,(P2V518_DOC.bottom-P2V518_DOC.top)/rows)}}
  function p2v518Id(){return 'AS'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase()}
  function p2v518Payload(b,date,sheet,total,sheetId){
    const core=[String(b.id),String(date),String(sheet),String(total),String(sheetId)].join('|');
    return JSON.stringify({v:2,kind:'ANANDA_ATTENDANCE',batchId:String(b.id),date:String(date),sheet:Number(sheet),totalSheets:Number(total),sheetId:String(sheetId),sessionId:String(b.id)+':'+String(date),verify:p2v58Hash(core)})
  }
  const p2v518ParseBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    try{
      const o=JSON.parse(String(raw||''));
      if(o&&o.kind==='ANANDA_ATTENDANCE'&&Number(o.v)===2&&o.sheetId){
        const core=[String(o.batchId),String(o.date),String(o.sheet),String(o.totalSheets),String(o.sheetId)].join('|');
        if(String(o.verify)!==p2v58Hash(core))return null;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(String(o.date||'')))return null;
        return o
      }
    }catch{}
    return p2v518ParseBase(raw)
  };

  function p2v518ClearScanScope(){
    p2v518ActiveRows=null;p2v518ActiveSnapshot=null
  }
  ['p2v58Manual','p2v58Edit','p2v58Unlock'].forEach(id=>$ (id)?.addEventListener('click',p2v518ClearScanScope,true));
  ['p2v58Course','p2v58Batch','p2v58Date'].forEach(id=>$ (id)?.addEventListener('change',p2v518ClearScanScope,true));

  function p2v518Dark(r,g,b){
    const L=.299*r+.587*g+.114*b,mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    return L<172 || (b>r+20&&b>g+10&&L<205) || (mx-mn>45&&L<165)
  }
  function p2v518FindAnchor(img,w,h,quadrant){
    const q=quadrant,rx0=q%2?Math.floor(w*.72):0,rx1=q%2?w:Math.ceil(w*.28),ry0=q>=2?Math.floor(h*.78):0,ry1=q>=2?h:Math.ceil(h*.22);
    const rw=rx1-rx0,rh=ry1-ry0,seen=new Uint8Array(rw*rh),stack=[],cand=[];
    const isDark=(x,y)=>{const k=(y*w+x)*4;return p2v518Dark(img.data[k],img.data[k+1],img.data[k+2])};
    for(let ly=0;ly<rh;ly++)for(let lx=0;lx<rw;lx++){
      const idx=ly*rw+lx;if(seen[idx])continue;seen[idx]=1;
      const gx=rx0+lx,gy=ry0+ly;if(!isDark(gx,gy))continue;
      let n=0,minx=gx,maxx=gx,miny=gy,maxy=gy;stack.push([lx,ly]);
      while(stack.length){
        const [x,y]=stack.pop(),px=rx0+x,py=ry0+y;n++;if(px<minx)minx=px;if(px>maxx)maxx=px;if(py<miny)miny=py;if(py>maxy)maxy=py;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=rw||ny>=rh)continue;const ni=ny*rw+nx;if(seen[ni])continue;seen[ni]=1;
          if(isDark(rx0+nx,ry0+ny))stack.push([nx,ny])
        }
      }
      const bw=maxx-minx+1,bh=maxy-miny+1,wr=bw/w,hr=bh/h,aspect=bw/Math.max(1,bh);
      if(n>=18&&wr>=.010&&wr<=.060&&hr>=.007&&hr<=.050&&aspect>=.55&&aspect<=1.8){
        const cx=(minx+maxx)/2,cy=(miny+maxy)/2,tx=q%2?w:0,ty=q>=2?h:0,dist=Math.hypot((cx-tx)/w,(cy-ty)/h),sizePenalty=Math.abs(wr-.029)+Math.abs(hr-.020);
        cand.push({cx,cy,bw,bh,n,score:dist+sizePenalty*2})
      }
    }
    cand.sort((a,b)=>a.score-b.score);return cand[0]||null
  }
  function p2v518Anchors(prep){
    const a=[0,1,2,3].map(q=>p2v518FindAnchor(prep.img,prep.w,prep.h,q));
    if(a.some(x=>!x))return null;
    return a.map(x=>({x:x.cx,y:x.cy}))
  }

  function p2v518ZonePatch(img,w,h,H,x0,y0,x1,y1,cw=220,ch=76){
    const lum=new Float32Array(cw*ch),rr=new Uint8Array(cw*ch),gg=new Uint8Array(cw*ch),bb=new Uint8Array(cw*ch);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const dx=x0+(x+.5)*(x1-x0)/cw,dy=y0+(y+.5)*(y1-y0)/ch,p=p2v511Map(H,dx,dy),px=Math.max(0,Math.min(w-1,Math.round(p.x))),py=Math.max(0,Math.min(h-1,Math.round(p.y))),k=(py*w+px)*4,i=y*cw+x;
      const r=img.data[k],g=img.data[k+1],b=img.data[k+2];rr[i]=r;gg[i]=g;bb[i]=b;lum[i]=.299*r+.587*g+.114*b
    }
    return{lum,rr,gg,bb,cw,ch}
  }
  function p2v518Ink(patch){
    const {lum,rr,gg,bb,cw,ch}=patch,ii=new Float64Array((cw+1)*(ch+1));
    for(let y=0;y<ch;y++){let row=0;for(let x=0;x<cw;x++){row+=lum[y*cw+x];ii[(y+1)*(cw+1)+x+1]=ii[y*(cw+1)+x+1]+row}}
    const mean=(x0,y0,x1,y1)=>{x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(cw,x1);y1=Math.min(ch,y1);return(ii[y1*(cw+1)+x1]-ii[y0*(cw+1)+x1]-ii[y1*(cw+1)+x0]+ii[y0*(cw+1)+x0])/Math.max(1,(x1-x0)*(y1-y0))};
    const mask=new Uint8Array(cw*ch);
    for(let y=4;y<ch-4;y++)for(let x=4;x<cw-4;x++){
      const i=y*cw+x,L=lum[i],local=mean(x-8,y-8,x+9,y+9),contrast=local-L;
      const black=L<155&&contrast>32,blue=bb[i]>rr[i]+18&&bb[i]>gg[i]+8&&L<195&&contrast>17;
      if(black||blue)mask[i]=1
    }
    const seen=new Uint8Array(mask.length),stack=[];let best=null,total=0;
    for(let i=0;i<mask.length;i++){
      if(!mask[i]||seen[i])continue;seen[i]=1;let n=0,minx=cw,maxx=0,miny=ch,maxy=0,contrastSum=0;stack.push(i);
      while(stack.length){
        const q=stack.pop(),y=Math.floor(q/cw),x=q-y*cw;n++;total++;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
        contrastSum+=mean(x-8,y-8,x+9,y+9)-lum[q];
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<2||ny<2||nx>=cw-2||ny>=ch-2)continue;const ni=ny*cw+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni)}}
      }
      const bw=maxx-minx+1,bh=maxy-miny+1,spanW=bw/cw,spanH=bh/ch,avgContrast=contrastSum/Math.max(1,n);
      const valid=n>=6&&avgContrast>=22&&spanW<.94&&spanH<.94&&n<cw*ch*.28;
      if(valid&&(!best||n>best.n))best={n,bw,bh,avgContrast,minx,maxx,miny,maxy}
    }
    return{present:!!best,best,total}
  }

  async function p2v518Prepare(blob){
    const bmp=await createImageBitmap(blob),max=2800,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
    const img=ctx.getImageData(0,0,w,h),qr=p2v516FindQr(c);return{canvas:c,img,w,h,qr,raw:qr?.data||''}
  }
  function p2v518Detect(prep,count){
    const anchors=p2v518Anchors(prep);if(!anchors)return{ok:false,reason:'All four corner markers must be visible. Retake the full page.'};
    const H=p2v511Homography(P2V518_DOC.anchor,anchors);if(!H)return{ok:false,reason:'The page could not be straightened. Retake the photo.'};
    const g=p2v518Geometry(count),marks=[];
    for(let i=0;i<count;i++){
      const row=Math.floor(i/2),col=i%2,left=col?P2V518_DOC.right:P2V518_DOC.left,top=P2V518_DOC.top+row*g.rowHeight;
      // Visual mark lane starts after the name. Scanner uses a 2 mm internal safety margin.
      const x0=left+55,x1=left+91,y0=top+1.5,y1=top+g.rowHeight-1.5;
      marks.push(p2v518Ink(p2v518ZonePatch(prep.img,prep.w,prep.h,H,x0,y0,x1,y1)))
    }
    return{ok:true,marks,anchors}
  }
  function p2v518RowsForSnapshot(snap){
    const out=[],missing=[];
    for(const sr of snap.rows||[]){
      const en=state.classEnrollments.find(e=>String(e.id)===String(sr.enrollmentId));
      if(!en){missing.push(sr);continue}
      out.push({en,p:p2v5Person(en),sheetRow:sr})
    }
    return{out,missing}
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR, four page corners and pen marks...';
    let prep;try{prep=await p2v518Prepare(blob)}catch(e){if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>';return}
    const raw=attendancePayload||prep.raw||'',data=p2v58ParsePayload(raw);
    if(!data){p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">QR could not be read or verified. Retake the full sheet.</span>';return}
    const ok=await p2v58ApplyQrRaw(raw,name);if(!ok)return;
    if(Number(data.v)!==2||!data.sheetId){
      p2v518ClearScanScope();p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">This is an older attendance sheet without a frozen roster. Select/mark it manually or print a new sheet.</span>';return
    }
    const snap=state.attendanceSheetSnapshots?.[String(data.sheetId)];
    if(!snap||String(snap.batchId)!==String(data.batchId)||String(snap.date)!==String(data.date)){
      p2v518ClearScanScope();p2v58Draft={};p2v58CurrentRows().forEach(r=>p2v58Draft[r.en.id]=null);p2v58RenderRoster();
      if(status)status.innerHTML='<span class="bad">The exact printed-sheet roster is not available in this database. No attendance was guessed.</span>';return
    }
    const mapped=p2v518RowsForSnapshot(snap);
    if(mapped.missing.length){
      p2v518ClearScanScope();if(status)status.innerHTML='<span class="bad">A student from this printed sheet no longer maps safely to the class record. Review manually; nothing was guessed.</span>';return
    }
    p2v518ActiveSnapshot=snap;p2v518ActiveRows=mapped.out;
    // Fresh scan: never inherit old attendance into machine detection.
    p2v58Draft={};p2v518ActiveRows.forEach(r=>p2v58Draft[r.en.id]=null);
    const det=p2v518Detect(prep,p2v518ActiveRows.length);
    if(!det.ok){p2v58RenderRoster();p2v511ShowReview(0,Number(data.sheet||1),Number(data.totalSheets||1),det.reason);if(status)status.innerHTML='<span class="bad">'+esc(det.reason)+'</span>';return}
    let present=0;const detected=[];
    p2v518ActiveRows.forEach((r,i)=>{const hit=!!det.marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit){present++;detected.push(r.p.name||r.sheetRow?.name||'Unnamed')}});
    p2v58RenderRoster();
    const msg='Frozen Sheet ID '+String(data.sheetId)+' · detected only from this printed roster. Present: '+(detected.length?detected.join(', '):'none')+'. Review, then use MARK REMAINING ABSENT.';
    p2v511ShowReview(present,Number(data.sheet||1),Number(data.totalSheets||1),msg);
    if(status)status.innerHTML='<span class="good"><b>Sheet analysed ✓</b> '+present+' present mark'+(present===1?'':'s')+' detected from '+p2v518ActiveRows.length+' printed name'+(p2v518ActiveRows.length===1?'':'s')+'.</span>';
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
    const logo=await p2v58LogoData(),session=p2v58SessionNo(b,p2v58Date),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],g=p2v518Geometry(chunk.length),sheetId=p2v518Id(),payload=p2v518Payload(b,p2v58Date,pi+1,chunks.length,sheetId);
      const snap={sheetId,batchId:String(b.id),date:String(p2v58Date),sheet:pi+1,totalSheets:chunks.length,course:p2CourseName(b),batch:b.name,session,createdAt:new Date().toISOString(),rows:chunk.map((r,i)=>({position:i+1,enrollmentId:String(r.en.id),studentId:String(r.en.studentId||''),name:String(r.p.name||''),mobile:String(r.p.mobile||'')}))};
      state.attendanceSheetSnapshots[sheetId]=snap;
      const meta={payload,sheetId,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),dateIso:p2v58Date,session,sessionLabel:'Session '+session,sheet:pi+1,total:chunks.length},
        link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),qrText=link?.ok&&link.url?link.url:payload,qr=await p2v58MakeQr(qrText,280);
      const rowHtml=chunk.map((r,i)=>{const col=i%2,row=Math.floor(i/2),left=col?P2V518_DOC.right:P2V518_DOC.left,top=P2V518_DOC.top+row*g.rowHeight;return '<div class="att-row '+(row%2?'even':'odd')+'" style="left:'+left+'mm;top:'+top+'mm;height:'+g.rowHeight+'mm"><span class="num">'+String(pi*40+i+1).padStart(2,'0')+'</span><span class="nm">'+esc(r.p.name||'Unnamed')+'</span><span class="mark"></span></div>'}).join('');
      pages.push('<section class="sheet"><span class="fid tl"><i></i></span><span class="fid tr"><i></i></span><span class="fid bl"><i></i></span><span class="fid br"><i></i></span><div class="brand">'+(logo?'<img src="'+logo+'">':'')+'<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="'+qr+'"><small>SCAN TO CONNECT &amp; UPLOAD</small></div><div class="sheetid">SHEET ID · '+esc(sheetId)+'</div><div class="meta course"><b>'+esc(p2CourseName(b).toUpperCase())+' · '+esc(String(b.name).toUpperCase())+'</b><small>SESSION '+session+'</small></div><div class="meta date"><b>'+esc(fmt(p2v58Date))+'</b></div><div class="head left"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div><div class="head right"><span>#</span><b>NAME</b><b>ATTENDANCE</b></div>'+rowHtml+'<div class="motto">WITH EVERY STEP, WE GROW IN JOY</div><div class="sheetno">Sheet '+(pi+1)+' of '+chunks.length+'</div></section>')
    }
    save();
    const printHtml='<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>'+
      '@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#082f71}.sheet{position:relative;width:210mm;height:297mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}'+
      '.fid{position:absolute;width:6mm;height:6mm;border:1.05mm solid #174f96;z-index:4}.fid i{position:absolute;left:1.3mm;top:1.3mm;width:1.15mm;height:1.15mm;background:#174f96}.fid.tl{left:4mm;top:4mm}.fid.tr{right:4mm;top:4mm}.fid.bl{left:4mm;bottom:4mm}.fid.br{right:4mm;bottom:4mm}'+
      '.brand{position:absolute;left:10mm;top:11mm;display:flex;align-items:center;gap:3mm;font-size:12pt}.brand img{width:12mm;height:12mm;border-radius:50%}h1{position:absolute;left:67mm;top:14mm;width:76mm;text-align:center;margin:0;font-size:15pt}.qr{position:absolute;left:173mm;top:8mm;width:29mm;text-align:center}.qr img{display:block;width:29mm;height:29mm}.qr small{display:block;font-size:5.1pt;margin-top:.5mm}.sheetid{position:absolute;right:8mm;top:39mm;font-size:5.7pt;color:#6e8298}'+
      '.meta{position:absolute;top:48mm;height:13mm;border:1px solid #d8e4ee;background:#f7fafc;border-radius:2mm;padding:2.6mm 4mm}.meta.course{left:7mm;width:112mm}.meta.date{left:123mm;width:79mm;display:flex;align-items:center}.meta b{font-size:10pt}.meta small{display:block;font-size:7pt;margin-top:1mm}'+
      '.head{position:absolute;top:63mm;width:95mm;height:6mm;background:#174f96;color:#fff;display:grid;grid-template-columns:8mm 43mm 1fr;align-items:center;padding:0 2mm;font-size:8pt}.head.left{left:7mm}.head.right{left:108mm}.head span{font-size:7pt}.head b:nth-child(2){text-align:left}.head b:nth-child(3){text-align:center}'+
      '.att-row{position:absolute;width:95mm;display:grid;grid-template-columns:8mm 43mm 1fr;align-items:stretch;padding:0 2mm;font-size:10pt}.num,.nm{display:flex;align-items:center}.att-row.odd .num,.att-row.odd .nm{background:#f3f8fc}.att-row.even .num,.att-row.even .nm{background:#fff}.num{font-size:7pt;color:#385a82}.nm{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mark{background:#fff;border-left:.22mm solid #d7e3ee}'+
      '.motto{position:absolute;bottom:7mm;left:55mm;width:100mm;text-align:center;font-size:6.5pt;letter-spacing:.8mm;color:#174f96}.sheetno{position:absolute;right:9mm;bottom:7mm;font-size:6.5pt;color:#71849a}'+
      '</style></head><body>'+pages.join('')+'</body></html>';
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
htmlp.write_text(html,encoding='utf-8')

mainp=Path('src/main.js')
m=mainp.read_text(encoding='utf-8')
if 'BETA518 SHEET ID + PHONE CLOSE' not in m:
    # Add sheetId to compact printed URL and reconstructed payload.
    m=m.replace(
      "const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'';",
      "const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'',sheetId=u.searchParams.get('x')||'';"
    )
    m=m.replace(
      "const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify].join('|');",
      "const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify,sheetId].join('|');"
    )
    m=m.replace(
      "const payload=JSON.stringify({v:1,kind:'ANANDA_ATTENDANCE',batchId:b,date,sheet,totalSheets:total,sessionId:b+':'+date,verify});",
      "const payload=JSON.stringify({v:sheetId?2:1,kind:'ANANDA_ATTENDANCE',batchId:b,date,sheet,totalSheets:total,sheetId:sheetId||undefined,sessionId:b+':'+date,verify});"
    )
    m=m.replace(
      "const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||'');",
      "const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||''),sheetId=String(p.sheetId||'');"
    )
    m=m.replace(
      "const key=[b,d8,sheet,total,verify].join('|');anandaAttendanceSheetMeta.set(key,meta||{});",
      "const key=[b,d8,sheet,total,verify,sheetId].join('|');anandaAttendanceSheetMeta.set(key,meta||{});"
    )
    m=m.replace(
      "const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify}).toString();",
      "const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify,...(sheetId?{x:sheetId}:{})}).toString();"
    )
    # Clicking CLOSE now attempts to close the mobile tab. Fallback remains clear and safe.
    old="$('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{document.body.innerHTML='<div style=\"font-family:Arial;text-align:center;padding:55px;color:#123f7d\"><h2>Attendance sheet uploaded.</h2><p>You can close this page.</p></div>'};"
    new="$('another').onclick=()=>{selected=null;$('camera').value='';$('gallery').value='';show('pick')};$('close').onclick=()=>{try{window.open('','_self');window.close()}catch{}setTimeout(()=>{if(!document.hidden){document.body.innerHTML='<div style=\"font-family:Arial;text-align:center;padding:55px;color:#123f7d\"><h2>Attendance sheet uploaded.</h2><p>This browser did not allow the tab to close automatically. You can close it now.</p></div>'}},350)};"
    if old not in m:
        raise SystemExit('Mobile close-button block not found')
    m=m.replace(old,new,1)
    needle="function anandaMobilePage(meta,encoded){"
    m=m.replace(needle,needle+"\n  // BETA518 SHEET ID + PHONE CLOSE",1)
    mainp.write_text(m,encoding='utf-8')

print('BETA 5.18 FROZEN SHEET + 4-CORNER SCAN + PHONE CLOSE APPLIED')

from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA516 SHEET READER' not in html:
    raise SystemExit('Beta 5.16 sheet reader marker missing')
if 'PHASE2 BETA517 ATTENDANCE GENIUS' in html:
    print('Beta 5.17 attendance genius already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker not found')

patch=r'''
  // PHASE2 BETA517 ATTENDANCE GENIUS
  const P2V517_QR_DOC={left:173,top:7,size:29};
  const P2V517_DOC={top:70,bottom:275,leftRow:7,rightRow:108,rowWidth:95,markOffset:52,markEnd:94};

  function p2v517Geometry(count){
    const rows=Math.max(1,Math.ceil(Math.max(1,count)/2)),available=P2V517_DOC.bottom-P2V517_DOC.top;
    return{rows,rowHeight:Math.min(30,available/rows)}
  }

  function p2v517PatchFromZone(img,w,h,H,x0,y0,x1,y1,cw=132,ch=42){
    const lum=new Float32Array(cw*ch),rr=new Uint8Array(cw*ch),gg=new Uint8Array(cw*ch),bb=new Uint8Array(cw*ch);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      const dx=x0+(x+.5)*(x1-x0)/cw,dy=y0+(y+.5)*(y1-y0)/ch,p=p2v511Map(H,dx,dy),px=Math.max(0,Math.min(w-1,Math.round(p.x))),py=Math.max(0,Math.min(h-1,Math.round(p.y))),k=(py*w+px)*4,i=y*cw+x;
      const r=img.data[k],g=img.data[k+1],b=img.data[k+2];rr[i]=r;gg[i]=g;bb[i]=b;lum[i]=.299*r+.587*g+.114*b
    }
    return{lum,rr,gg,bb,cw,ch}
  }

  function p2v517InkEvidence(patch){
    const {lum,rr,gg,bb,cw,ch}=patch,integral=new Float64Array((cw+1)*(ch+1));
    for(let y=0;y<ch;y++){let row=0;for(let x=0;x<cw;x++){row+=lum[y*cw+x];integral[(y+1)*(cw+1)+(x+1)]=integral[y*(cw+1)+(x+1)]+row}}
    const mean=(x0,y0,x1,y1)=>{x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(cw,x1);y1=Math.min(ch,y1);const A=integral[y0*(cw+1)+x0],B=integral[y0*(cw+1)+x1],C=integral[y1*(cw+1)+x0],D=integral[y1*(cw+1)+x1];return(D-B-C+A)/Math.max(1,(x1-x0)*(y1-y0))};
    const mask=new Uint8Array(cw*ch);let total=0;
    for(let y=3;y<ch-3;y++)for(let x=3;x<cw-3;x++){
      const i=y*cw+x,L=lum[i],local=mean(x-6,y-6,x+7,y+7),contrast=local-L;
      const blue=bb[i]>rr[i]+16&&bb[i]>gg[i]+8&&L<198&&contrast>8;
      const black=L<178&&contrast>22;
      if(black||blue){mask[i]=1;total++}
    }
    let largest=0,components=0;const seen=new Uint8Array(mask.length),stack=[];
    for(let i=0;i<mask.length;i++){
      if(!mask[i]||seen[i])continue;components++;let n=0;stack.push(i);seen[i]=1;
      while(stack.length){const q=stack.pop();n++;const y=Math.floor(q/cw),x=q-y*cw;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<2||ny<2||nx>=cw-2||ny>=ch-2)continue;const ni=ny*cw+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push(ni)}}}
      if(n>largest)largest=n
    }
    return{present:largest>=3&&total>=4,largest,total,components}
  }

  function p2v517AnchorQuality(img,w,h,H){
    const points=[[5,5],[205,5],[5,292],[205,292]],scores=[];
    for(const [cx,cy] of points){
      let dark=0,n=0;
      for(let gy=-3;gy<=3;gy++)for(let gx=-3;gx<=3;gx++){
        const p=p2v511Map(H,cx+gx*.5,cy+gy*.5),px=Math.round(p.x),py=Math.round(p.y);if(px<0||py<0||px>=w||py>=h)continue;
        const k=(py*w+px)*4,L=.299*img.data[k]+.587*img.data[k+1]+.114*img.data[k+2];n++;if(L<120)dark++
      }
      scores.push(n?dark/n:0)
    }
    return scores.filter(x=>x>.12).length
  }

  function p2v517DetectMarks(prep,count){
    const qr=prep.qr;if(!qr?.location)return null;
    const q=P2V517_QR_DOC,src=[[q.left,q.top],[q.left+q.size,q.top],[q.left,q.top+q.size],[q.left+q.size,q.top+q.size]],loc=qr.location,dst=[loc.topLeftCorner,loc.topRightCorner,loc.bottomLeftCorner,loc.bottomRightCorner],H=p2v511Homography(src,dst);
    if(!H)return null;
    const g=p2v517Geometry(count),marks=[];
    for(let i=0;i<count;i++){
      const row=Math.floor(i/2),col=i%2,rowLeft=col?P2V517_DOC.rightRow:P2V517_DOC.leftRow,top=P2V517_DOC.top+row*g.rowHeight,pad=Math.max(1.2,g.rowHeight*.13);
      const x0=rowLeft+P2V517_DOC.markOffset,x1=rowLeft+P2V517_DOC.markEnd;
      marks.push(p2v517InkEvidence(p2v517PatchFromZone(prep.img,prep.w,prep.h,H,x0,top+pad,x1,top+g.rowHeight-pad)))
    }
    return{marks,anchors:p2v517AnchorQuality(prep.img,prep.w,prep.h,H)}
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading sheet, class/date QR and dark pen marks...';
    let prep;try{prep=await p2v516PreparePhoto(blob)}catch(e){prep={raw:'',qr:null};if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>'}
    const raw=attendancePayload||prep?.raw||'',ok=await p2v58ApplyQrRaw(raw,name);
    if(!ok){if(status)status.innerHTML='<span class="bad">QR could not be read. Keep the QR and full sheet clear in the photo.</span>';return}
    const data=p2v58ParsePayload(raw),page=Math.max(1,Number(data?.sheet||1)||1),total=Math.max(1,Number(data?.totalSheets||1)||1),rows=p2v58CurrentRows(),start=(page-1)*40,pageRows=rows.slice(start,start+40),det=prep?.qr?p2v517DetectMarks(prep,pageRows.length):null;
    if(!det){
      p2v511ShowReview(0,page,total,'Class/date identified, but the sheet could not be aligned. Retake the full page or mark attendance manually.');
      if(status)status.innerHTML='<span class="bad">Class/date identified, but mark lanes could not be aligned reliably.</span>';return
    }
    let present=0;pageRows.forEach((r,i)=>{const hit=!!det.marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit)present++});
    p2v58RenderRoster();
    const q=det.anchors>=3?'Page alignment verified.':det.anchors>=1?'Page alignment acceptable; review detected names.':'Corner anchors were not all visible; review detected names carefully.';
    p2v511ShowReview(present,page,total,q+' Any genuine dark black/dark-blue dot, line or tick anywhere after the name counts as PRESENT.');
    if(status)status.innerHTML='<span class="good"><b>Sheet analysed ✓</b> '+present+' present mark'+(present===1?'':'s')+' detected. '+esc(q)+'</span>';
    $('p2v58Roster')?.scrollIntoView({behavior:'smooth',block:'start'})
  };

  p2v58HandleUploadedFile=async function(file){await p2v511ApplyPhotoBlob(file,file.name||'Uploaded sheet','')};
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    try{const blob=await (await fetch(dataUrl)).blob();await p2v511ApplyPhotoBlob(blob,name,attendancePayload)}
    catch(e){const status=$('p2v58UploadStatus');if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Attendance photo could not be analysed')+'</span>'}
  };

  p2v58PrintSheet=async function(){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}
    const rows=p2v58CurrentRows();if(!rows.length){toast('No students enrolled in this batch');return}
    const chunks=[];for(let i=0;i<rows.length;i+=40)chunks.push(rows.slice(i,i+40));
    const logo=await p2v58LogoData(),session=p2v58SessionNo(b,p2v58Date),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const chunk=chunks[pi],g=p2v517Geometry(chunk.length),payload=p2v58Payload(b,p2v58Date,pi+1,chunks.length),meta={payload,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),dateIso:p2v58Date,session,sessionLabel:'Session '+session,sheet:pi+1,total:chunks.length},link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),qrText=link?.ok&&link.url?link.url:payload,qr=await p2v58MakeQr(qrText,260);
      const rowHtml=chunk.map((r,i)=>{const col=i%2,row=Math.floor(i/2),left=col?P2V517_DOC.rightRow:P2V517_DOC.leftRow,top=P2V517_DOC.top+row*g.rowHeight;return '<div class="att-row '+(row%2?'even':'odd')+'" style="left:'+left+'mm;top:'+top+'mm;height:'+g.rowHeight+'mm"><span class="num">'+String(pi*40+i+1).padStart(2,'0')+'</span><span class="nm">'+esc(r.p.name||'Unnamed')+'</span><span class="mark"></span></div>'}).join('');
      pages.push('<section class="sheet"><span class="fid tl"><i></i></span><span class="fid tr"><i></i></span><span class="fid bl"><i></i></span><span class="fid br"><i></i></span><div class="brand">'+(logo?'<img src="'+logo+'">':'')+'<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="'+qr+'"><small>SCAN TO CONNECT &amp; UPLOAD</small></div><div class="meta course"><b>'+esc(p2CourseName(b).toUpperCase())+' · '+esc(String(b.name).toUpperCase())+'</b><small>SESSION '+session+'</small></div><div class="meta date"><b>'+esc(fmt(p2v58Date))+'</b></div><div class="head left"><span>#</span><b>NAME</b><b>MARK</b></div><div class="head right"><span>#</span><b>NAME</b><b>MARK</b></div>'+rowHtml+'<div class="sheetno">Sheet '+(pi+1)+' of '+chunks.length+'</div></section>')
    }
    const printHtml='<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#082f71}.sheet{position:relative;width:210mm;height:297mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}.fid{position:absolute;width:6mm;height:6mm;border:1.15mm solid #174f96;z-index:4}.fid i{position:absolute;left:1.25mm;top:1.25mm;width:1.2mm;height:1.2mm;background:#174f96}.fid.tl{left:2mm;top:2mm}.fid.tr{right:2mm;top:2mm}.fid.bl{left:2mm;bottom:2mm}.fid.br{right:2mm;bottom:2mm}.brand{position:absolute;left:10mm;top:10mm;display:flex;align-items:center;gap:3mm;font-size:12pt}.brand img{width:12mm;height:12mm;border-radius:50%}h1{position:absolute;left:68mm;top:13mm;width:74mm;text-align:center;margin:0;font-size:15pt}.qr{position:absolute;left:173mm;top:7mm;width:29mm;text-align:center}.qr img{display:block;width:29mm;height:29mm}.qr small{display:block;font-size:5.3pt;margin-top:.8mm}.meta{position:absolute;top:43mm;height:13mm;border:1px solid #d8e4ee;background:#f5f9fc;border-radius:2mm;padding:2.6mm 4mm}.meta.course{left:7mm;width:112mm}.meta.date{left:123mm;width:79mm;display:flex;align-items:center}.meta b{font-size:10pt}.meta small{display:block;font-size:7pt;margin-top:1mm}.head{position:absolute;top:61mm;width:95mm;height:6mm;background:#174f96;color:#fff;display:grid;grid-template-columns:8mm 43mm 1fr;align-items:center;padding:0 2mm;font-size:8.5pt}.head.left{left:7mm}.head.right{left:108mm}.head span{font-size:7pt}.head b:nth-child(2){text-align:left}.head b:nth-child(3){text-align:center}.att-row{position:absolute;width:95mm;display:grid;grid-template-columns:8mm 43mm 1fr;align-items:center;padding:0 2mm;font-size:10.5pt}.att-row.odd{background:#f3f8fc}.att-row.even{background:#fff}.num{font-size:7pt;color:#385a82}.nm{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mark{align-self:stretch;border-left:.25mm solid #d5e2ee;margin-left:0;background:transparent}.sheetno{position:absolute;right:9mm;bottom:6mm;font-size:7pt;color:#71849a}</style></head><body>'+pages.join('')+'</body></html>';
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.17 ATTENDANCE GENIUS APPLIED')

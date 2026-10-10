from pathlib import Path
import json,re

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA510 CURRENT APPROVED' not in html:
    raise SystemExit('Beta 5.10 marker not found')
if 'PHASE2 BETA511 COMPLETE' in html:
    print('Beta 5.11 already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Insertion marker not found')

patch=r'''
  // PHASE2 BETA511 COMPLETE
  // Photograph -> QR/session -> automatic handwritten tick detection -> review -> confirm.
  const P2V511_QR_DOC={left:174,top:8,size:27};
  const P2V511_ROW={top:70,height:10.35,leftMark:[19,29],rightMark:[120,130],yInset:[2.0,8.2]};

  function p2v511Solve8(A,b){
    const m=A.map((r,i)=>r.slice().concat([b[i]])),n=8;
    for(let c=0;c<n;c++){
      let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[pivot][c]))pivot=r;
      if(Math.abs(m[pivot][c])<1e-9)return null;
      [m[c],m[pivot]]=[m[pivot],m[c]];
      const div=m[c][c];for(let j=c;j<=n;j++)m[c][j]/=div;
      for(let r=0;r<n;r++)if(r!==c){const f=m[r][c];for(let j=c;j<=n;j++)m[r][j]-=f*m[c][j]}
    }
    return m.map(r=>r[n])
  }
  function p2v511Homography(src,dst){
    const A=[],b=[];
    for(let i=0;i<4;i++){
      const [x,y]=src[i],u=dst[i].x,v=dst[i].y;
      A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);
      A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)
    }
    const h=p2v511Solve8(A,b);return h&&[...h,1]
  }
  function p2v511Map(H,x,y){
    const d=H[6]*x+H[7]*y+H[8];
    return{x:(H[0]*x+H[1]*y+H[2])/d,y:(H[3]*x+H[4]*y+H[5])/d}
  }
  function p2v511PixelIsInk(r,g,b){
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),chroma=mx-mn;
    return mx<145 || (chroma>45 && mn<170 && mx<238)
  }
  function p2v511ZoneInk(img,w,h,H,x0,y0,x1,y1){
    let ink=0,total=0;
    for(let gy=0;gy<12;gy++)for(let gx=0;gx<18;gx++){
      const x=x0+(gx+.5)*(x1-x0)/18,y=y0+(gy+.5)*(y1-y0)/12,p=p2v511Map(H,x,y),px=Math.round(p.x),py=Math.round(p.y);
      if(px<0||py<0||px>=w||py>=h)continue;
      const k=(py*w+px)*4,r=img.data[k],g=img.data[k+1],b=img.data[k+2];
      total++;if(p2v511PixelIsInk(r,g,b))ink++
    }
    return total?ink/total:0
  }
  async function p2v511AnalyzeBlob(blob,sheetNo=1){
    if(typeof window.jsQR!=='function')throw new Error('QR reader is not available');
    const bmp=await createImageBitmap(blob),max=1900,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
    const img=ctx.getImageData(0,0,w,h),qr=window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'});
    if(!qr?.location)return{raw:qr?.data||'',marks:null,reason:'Printed QR could not be located accurately for tick detection.'};
    const q=P2V511_QR_DOC,src=[[q.left,q.top],[q.left+q.size,q.top],[q.left,q.top+q.size],[q.left+q.size,q.top+q.size]];
    const loc=qr.location,dst=[loc.topLeftCorner,loc.topRightCorner,loc.bottomLeftCorner,loc.bottomRightCorner],H=p2v511Homography(src,dst);
    if(!H)return{raw:qr.data||'',marks:null,reason:'Could not align the photographed page.'};
    const marks=[];
    for(let i=0;i<40;i++){
      const row=i%20,col=i<20?0:1,y=P2V511_ROW.top+row*P2V511_ROW.height,[x0,x1]=col?P2V511_ROW.rightMark:P2V511_ROW.leftMark;
      const score=p2v511ZoneInk(img,w,h,H,x0,y+P2V511_ROW.yInset[0],x1,y+P2V511_ROW.yInset[1]);
      marks.push({present:score>=0.028,score})
    }
    return{raw:qr.data||'',marks}
  }
  function p2v511EnsureReview(){
    let box=$('p2v511Review');if(box)return box;
    box=document.createElement('div');box.id='p2v511Review';box.className='p2v511-review hidden';
    const anchor=$('p2v58UploadPanel');anchor?.insertAdjacentElement('afterend',box);return box
  }
  function p2v511ShowReview(present,page,total,message=''){
    const box=p2v511EnsureReview();if(!box)return;
    box.classList.remove('hidden');
    box.innerHTML=`<div><strong>REVIEW DETECTED ATTENDANCE</strong><p>${present} present mark${present===1?'':'s'} detected on sheet ${page} of ${total}. Green ✓ = detected present. Review the names, then use <b>MARK REMAINING ABSENT</b> and <b>${p2v510AttendanceSaved()?'UPDATE':'CONFIRM'} ATTENDANCE</b>.</p>${message?`<small>${esc(message)}</small>`:''}</div>`
  }
  async function p2v511ApplyPhotoBlob(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR and handwritten attendance marks...';
    let provisional=p2v58ParsePayload(attendancePayload||''),sheetNo=Number(provisional?.sheet||1)||1,analysis;
    try{analysis=await p2v511AnalyzeBlob(blob,sheetNo)}catch(e){analysis={raw:'',marks:null,reason:e.message||'Photo analysis failed'}}
    const raw=attendancePayload||analysis.raw;
    const ok=await p2v58ApplyQrRaw(raw,name);
    if(!ok)return;
    const data=p2v58ParsePayload(raw),page=Math.max(1,Number(data?.sheet||sheetNo)||1),total=Math.max(1,Number(data?.totalSheets||1)||1);
    if(!analysis.marks){
      p2v511ShowReview(0,page,total,analysis.reason||'Automatic mark detection was not available. Mark attendance manually.');
      if(status)status.innerHTML=`<span class="bad">Class identified, but handwritten marks could not be detected reliably. Review and mark manually.</span>`;
      return
    }
    const rows=p2v58CurrentRows(),start=(page-1)*40,pageRows=rows.slice(start,start+40);
    let present=0;
    pageRows.forEach((r,i)=>{const hit=!!analysis.marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit)present++});
    p2v58RenderRoster();p2v511ShowReview(present,page,total);
    if(status)status.innerHTML=`<span class="good"><b>Sheet analysed ✓</b> ${present} present mark${present===1?'':'s'} detected. Review before confirming attendance.</span>`;
    $('p2v58Roster')?.scrollIntoView({behavior:'smooth',block:'start'})
  }
  p2v58HandleUploadedFile=async function(file){await p2v511ApplyPhotoBlob(file,file.name||'Uploaded sheet','')};
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    try{const blob=await (await fetch(dataUrl)).blob();await p2v511ApplyPhotoBlob(blob,name,attendancePayload)}
    catch(e){const status=$('p2v58UploadStatus');if(status)status.innerHTML=`<span class="bad">${esc(e.message||'Attendance photo could not be analysed')}</span>`}
  };

  p2v58PrintSheet=async function(){
    const b=p2v58CurrentBatch();if(!b||!p2v58Date){toast('Choose a batch and date first');return}
    const rows=p2v58CurrentRows();if(!rows.length){toast('No students enrolled in this batch');return}
    const chunks=[];for(let i=0;i<rows.length;i+=40)chunks.push(rows.slice(i,i+40));
    const logo=await p2v58LogoData(),session=p2v58SessionNo(b,p2v58Date),pages=[];
    for(let pi=0;pi<chunks.length;pi++){
      const payload=p2v58Payload(b,p2v58Date,pi+1,chunks.length),meta={payload,course:p2CourseName(b),batch:b.name,date:fmt(p2v58Date),sheet:pi+1,total:chunks.length},link=await window.anandaAttendanceBridge?.prepareSheetLink?.(meta),qrText=link?.ok&&link.url?link.url:payload,qr=await p2v58MakeQr(qrText,230),chunk=chunks[pi];
      const rowsHtml=chunk.map((r,i)=>{const col=i<20?0:1,ri=i%20,left=col?108:7,top=70+ri*10.35;return `<div class="att-row ${ri%2?'even':'odd'}" style="left:${left}mm;top:${top}mm"><span class="num">${String(pi*40+i+1).padStart(2,'0')}</span><span class="mark"></span><span class="nm">${esc(r.p.name||'Unnamed')}</span></div>`}).join('');
      pages.push(`<section class="sheet"><div class="brand">${logo?`<img src="${logo}">`:''}<b>ANANDA SANGHA</b></div><h1>CLASS ATTENDANCE</h1><div class="qr"><img src="${qr}"><small>SCAN TO CONNECT &amp; UPLOAD</small></div><div class="meta course"><b>${esc(p2CourseName(b).toUpperCase())} · ${esc(String(b.name).toUpperCase())}</b><small>SESSION ${session}</small></div><div class="meta date"><b>${esc(fmt(p2v58Date))}</b></div><div class="namehead">NAME</div>${rowsHtml}<div class="sheetno">Sheet ${pi+1} of ${chunks.length}</div></section>`)
    }
    const printHtml=`<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#082f71}.sheet{position:relative;width:210mm;height:297mm;page-break-after:always;background:#fff;overflow:hidden}.sheet:last-child{page-break-after:auto}.brand{position:absolute;left:7mm;top:9mm;display:flex;align-items:center;gap:3mm;font-size:12pt}.brand img{width:12mm;height:12mm;border-radius:50%}h1{position:absolute;left:68mm;top:13mm;width:74mm;text-align:center;margin:0;font-size:15pt}.qr{position:absolute;left:174mm;top:8mm;width:27mm;text-align:center}.qr img{display:block;width:27mm;height:27mm}.qr small{display:block;font-size:5.5pt;margin-top:1mm}.meta{position:absolute;top:43mm;height:13mm;border:1px solid #d8e4ee;background:#f5f9fc;border-radius:2mm;padding:2.6mm 4mm}.meta.course{left:7mm;width:112mm}.meta.date{left:123mm;width:78mm;display:flex;align-items:center}.meta b{font-size:10pt}.meta small{display:block;font-size:7pt;margin-top:1mm}.namehead{position:absolute;left:7mm;top:61mm;width:194mm;height:6mm;background:#174f96;color:#fff;text-align:center;font-weight:700;line-height:6mm}.att-row{position:absolute;width:95mm;height:10.35mm;display:grid;grid-template-columns:10mm 14mm 1fr;align-items:center;padding:0 2mm;font-size:10.5pt}.att-row.odd{background:#f3f8fc}.att-row.even{background:#fff}.num{font-size:7pt;color:#385a82}.mark{width:14mm;height:100%;position:relative}.nm{font-weight:700}.sheetno{position:absolute;right:8mm;bottom:5mm;font-size:7pt;color:#71849a}</style></head><body>${pages.join('')}</body></html>`;
    const r=await window.anandaDesktop?.printHtml(printHtml);if(r&&!r.ok)toast(r.error||'Printing failed')
  };

  (function p2v511Style(){
    const st=document.createElement('style');st.id='p2v511Style';st.textContent=`
      .p2v511-review{margin:10px 0 12px;padding:13px 15px;border:1px solid #b8d5ee;border-radius:10px;background:#f5faff;color:#123f7d}.p2v511-review.hidden{display:none!important}.p2v511-review strong{font-size:12px}.p2v511-review p{margin:5px 0 0;font-size:12px;line-height:1.45}.p2v511-review small{display:block;margin-top:5px;color:#6a7d91}
    `;document.head.appendChild(st)
  })();
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')

# Mobile page: use the packaged approved artwork instead of a CSS-drawn logo.
main=Path('src/main.js')
m=main.read_text(encoding='utf-8')
if 'BETA511 APPROVED MOBILE LOGO' not in m:
    needle="function anandaMobilePage(meta,encoded){\n  const safe="
    if needle not in m: raise SystemExit('Mobile page function not found')
    m=m.replace(needle,"function anandaMobilePage(meta,encoded){\n  // BETA511 APPROVED MOBILE LOGO\n  let logoData='';try{logoData='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'logo-128.png')).toString('base64')}catch{}\n  const safe=",1)
    m=m.replace(".logo{width:86px;height:86px;border-radius:50%;margin:0 auto 14px;background:radial-gradient(circle,#153e8a 0 55%,#08296e 56%);border:13px solid #ffd735;box-shadow:0 0 25px rgba(255,204,35,.45),inset 0 0 15px rgba(54,139,255,.7);display:grid;place-items:center}.star{color:white;font-size:28px;line-height:1;text-shadow:0 0 10px #fff}",
                ".logo{width:92px;height:92px;border-radius:50%;margin:0 auto 14px;box-shadow:0 0 28px rgba(255,204,35,.42);overflow:hidden}.logo img{width:100%;height:100%;display:block;object-fit:cover}")
    m=m.replace('<div class="brand"><div class="logo"><span class="star">★</span></div><h1>ANANDA SANGHA</h1></div>',
                '<div class="brand"><div class="logo"><img src="${logoData}" alt="Ananda Sangha"></div><h1>ANANDA SANGHA</h1></div>')
m=re.sub(r"const APP_VERSION = '[^']+';","const APP_VERSION = '2.0.0-beta.5.11';",m,count=1)
main.write_text(m,encoding='utf-8')

pkgp=Path('src/package.json')
pkg=json.loads(pkgp.read_text(encoding='utf-8'))
pkg['version']='2.0.0-beta.5.11'
nsis=pkg.setdefault('build',{}).setdefault('nsis',{})
nsis['oneClick']=False
nsis['perMachine']=True
nsis['allowElevation']=True
nsis['allowToChangeInstallationDirectory']=False
nsis['createDesktopShortcut']=True
nsis['createStartMenuShortcut']=True
nsis['runAfterFinish']=False
nsis['include']='installer.nsh'
nsis['installerSidebar']='installer-sidebar.bmp'
nsis['uninstallerSidebar']='installer-sidebar.bmp'
nsis['installerHeader']='installer-header.bmp'
pkgp.write_text(json.dumps(pkg,indent=2)+'\n',encoding='utf-8')

print('BETA 5.11 COMPLETE PATCH APPLIED')

from pathlib import Path
import re

htmlp=Path('src/index.html')
html=htmlp.read_text(encoding='utf-8')
if 'PHASE2 BETA513 CURRENT FINAL' not in html or 'PHASE2 BETA514 ENROL PAYMENT IDENTITY' not in html:
    raise SystemExit('Beta 5.13/5.14 markers missing')
if 'PHASE2 BETA516 SHEET READER' not in html:
    marker='\n\n    updateBackButton();'
    if marker not in html:
        raise SystemExit('Renderer insertion marker not found')
    patch=r'''
  // PHASE2 BETA516 SHEET READER
  // Compact printed QR + multi-pass QR detection + row-major mark-after-name geometry.

  const p2v516ParsePayloadBase=p2v58ParsePayload;
  p2v58ParsePayload=function(raw){
    const old=p2v516ParsePayloadBase(raw);if(old)return old;
    try{
      const u=new URL(String(raw||''));
      const batchId=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),totalSheets=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'';
      if(!batchId||!/^\d{8}$/.test(d8)||!verify)return null;
      const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8);
      const core=[String(batchId),String(date),String(sheet),String(totalSheets)].join('|');
      if(verify!==p2v58Hash(core))return null;
      return{v:1,kind:'ANANDA_ATTENDANCE',batchId:String(batchId),date,sheet,totalSheets,sessionId:String(batchId)+':'+date,verify}
    }catch{return null}
  };

  function p2v516MapQrLocation(loc,x0,y0,scale){
    if(!loc)return null;
    const map=p=>({x:x0+p.x/scale,y:y0+p.y/scale});
    return{
      topLeftCorner:map(loc.topLeftCorner),topRightCorner:map(loc.topRightCorner),
      bottomLeftCorner:map(loc.bottomLeftCorner),bottomRightCorner:map(loc.bottomRightCorner),
      topLeftFinderPattern:loc.topLeftFinderPattern?map(loc.topLeftFinderPattern):undefined,
      topRightFinderPattern:loc.topRightFinderPattern?map(loc.topRightFinderPattern):undefined,
      bottomLeftFinderPattern:loc.bottomLeftFinderPattern?map(loc.bottomLeftFinderPattern):undefined
    }
  }
  function p2v516DecodeImageData(img,w,h){
    try{return window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'})||null}catch{return null}
  }
  function p2v516CropQr(source,x0,y0,cw,ch,scale=3,threshold=false){
    x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));cw=Math.max(1,Math.min(source.width-x0,Math.floor(cw)));ch=Math.max(1,Math.min(source.height-y0,Math.floor(ch)));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*scale));c.height=Math.max(1,Math.round(ch*scale));
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(source,x0,y0,cw,ch,0,0,c.width,c.height);
    let img=ctx.getImageData(0,0,c.width,c.height);
    if(threshold){
      const d=img.data;
      for(let i=0;i<d.length;i+=4){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=y<178?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}
    }
    const hit=p2v516DecodeImageData(img,c.width,c.height);
    if(!hit)return null;
    hit.location=p2v516MapQrLocation(hit.location,x0,y0,scale);
    return hit
  }
  function p2v516FindQr(source){
    const ctx=source.getContext('2d',{willReadFrequently:true}),img=ctx.getImageData(0,0,source.width,source.height);
    let hit=p2v516DecodeImageData(img,source.width,source.height);if(hit)return hit;
    const w=source.width,h=source.height;
    const boxes=[
      [w*.55,0,w*.45,h*.46],
      [w*.66,0,w*.34,h*.36],
      [w*.45,0,w*.55,h*.30],
      [w*.50,h*.02,w*.48,h*.40],
      [0,0,w*.50,h*.42],
      [w*.50,h*.50,w*.50,h*.50],
      [0,h*.50,w*.50,h*.50]
    ];
    for(const b of boxes){
      hit=p2v516CropQr(source,...b,3,false);if(hit)return hit;
      hit=p2v516CropQr(source,...b,5,false);if(hit)return hit;
      hit=p2v516CropQr(source,...b,4,true);if(hit)return hit
    }
    return null
  }
  async function p2v516PreparePhoto(blob){
    if(typeof window.jsQR!=='function')throw new Error('QR reader is not available');
    const bmp=await createImageBitmap(blob),max=2800,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.drawImage(bmp,0,0,w,h);bmp.close?.();
    const qr=p2v516FindQr(c);
    return{canvas:c,img:ctx.getImageData(0,0,w,h),w,h,qr,raw:qr?.data||''}
  }
  function p2v516MarkGeometry(count){
    const top=70,bottom=265,rows=Math.max(1,Math.ceil(Math.max(1,count)/2));
    return{top,bottom,rows,rowHeight:Math.min(30,(bottom-top)/rows),leftMark:[82,100],rightMark:[183,201]}
  }
  function p2v516DetectMarks(prep,count){
    const qr=prep.qr;if(!qr?.location)return null;
    const src=[[174,8],[201,8],[174,35],[201,35]],loc=qr.location,dst=[loc.topLeftCorner,loc.topRightCorner,loc.bottomLeftCorner,loc.bottomRightCorner],H=p2v511Homography(src,dst);
    if(!H)return null;
    const g=p2v516MarkGeometry(count),marks=[];
    for(let i=0;i<count;i++){
      const row=Math.floor(i/2),col=i%2,top=g.top+row*g.rowHeight,[x0,x1]=col?g.rightMark:g.leftMark,pad=Math.max(1.5,g.rowHeight*.18);
      const score=p2v511ZoneInk(prep.img,prep.w,prep.h,H,x0,top+pad,x1,top+g.rowHeight-pad);
      marks.push({present:score>=0.025,score})
    }
    return marks
  }

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');if(status)status.textContent='Reading QR and attendance marks...';
    let prep;try{prep=await p2v516PreparePhoto(blob)}catch(e){prep={raw:'',qr:null};if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>'}
    const raw=attendancePayload||prep?.raw||'';
    const ok=await p2v58ApplyQrRaw(raw,name);
    if(!ok){
      if(status)status.innerHTML='<span class="bad">QR could not be read. Keep the whole sheet visible and upload a clearer image.</span>';
      return
    }
    const data=p2v58ParsePayload(raw),page=Math.max(1,Number(data?.sheet||1)||1),total=Math.max(1,Number(data?.totalSheets||1)||1),rows=p2v58CurrentRows(),start=(page-1)*40,pageRows=rows.slice(start,start+40);
    const marks=prep?.qr?p2v516DetectMarks(prep,pageRows.length):null;
    if(!marks){
      p2v511ShowReview(0,page,total,'Class identified, but mark detection needs a clearer full-page image. Mark attendance manually.');
      if(status)status.innerHTML='<span class="bad">Class identified, but attendance marks could not be aligned reliably. Review manually.</span>';
      return
    }
    let present=0;
    pageRows.forEach((r,i)=>{const hit=!!marks[i]?.present;p2v58Draft[r.en.id]=hit?true:null;if(hit)present++});
    p2v58RenderRoster();p2v511ShowReview(present,page,total,'Marks are read from the large MARK area after each name.');
    if(status)status.innerHTML='<span class="good"><b>Sheet analysed ✓</b> '+present+' present mark'+(present===1?'':'s')+' detected. Review before confirming attendance.</span>';
    $('p2v58Roster')?.scrollIntoView({behavior:'smooth',block:'start'})
  };

  // Computer upload and phone upload both use the same corrected reader.
  p2v58HandleUploadedFile=async function(file){await p2v511ApplyPhotoBlob(file,file.name||'Uploaded sheet','')};
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    try{const blob=await (await fetch(dataUrl)).blob();await p2v511ApplyPhotoBlob(blob,name,attendancePayload)}
    catch(e){const status=$('p2v58UploadStatus');if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Attendance photo could not be analysed')+'</span>'}
  };
'''
    html=html.replace(marker,'\n'+patch+marker,1)
    htmlp.write_text(html,encoding='utf-8')

mainp=Path('src/main.js')
m=mainp.read_text(encoding='utf-8')
if 'BETA516 COMPACT PRINTED QR' not in m:
    # Mobile page must preserve whatever compact query was scanned.
    old="const res=await fetch('/upload?a='+encodeURIComponent(a),{method:'POST',body:fd});"
    if old in m:
        m=m.replace(old,"const res=await fetch('/upload'+window.location.search,{method:'POST',body:fd});",1)

    # Add compact URL decoder and a temporary metadata map beside the server.
    needle="let anandaAttendanceServerInfo=null;"
    add="""let anandaAttendanceServerInfo=null;
// BETA516 COMPACT PRINTED QR
const anandaAttendanceSheetMeta=new Map();
function anandaCompactAttendanceMeta(u){
  try{
    const b=u.searchParams.get('b')||'',d8=u.searchParams.get('d')||'',sheet=Number(u.searchParams.get('s')||1),total=Number(u.searchParams.get('t')||1),verify=u.searchParams.get('v')||'';
    if(!b||!/^\\d{8}$/.test(d8)||!verify)return null;
    const date=d8.slice(0,4)+'-'+d8.slice(4,6)+'-'+d8.slice(6,8),key=[b,d8,sheet,total,verify].join('|');
    const remembered=anandaAttendanceSheetMeta.get(key);if(remembered)return remembered;
    const payload=JSON.stringify({v:1,kind:'ANANDA_ATTENDANCE',batchId:b,date,sheet,totalSheets:total,sessionId:b+':'+date,verify});
    return{payload,date,sheet,total}
  }catch{return null}
}"""
    if needle not in m:
        raise SystemExit('Attendance server info marker not found')
    m=m.replace(needle,add,1)

    old="const u=new URL(req.url,'http://local/'),encoded=u.searchParams.get('a')||'',meta=anandaB64UrlDecode(encoded);"
    new="const u=new URL(req.url,'http://local/'),encoded=u.searchParams.get('a')||'';let meta=anandaB64UrlDecode(encoded);if(!meta)meta=anandaCompactAttendanceMeta(u);"
    if old not in m:
        raise SystemExit('Attendance request metadata parser not found')
    m=m.replace(old,new,1)

    old="ipcMain.handle('ananda-attendance-prepare-sheet-link',async(_event,meta)=>{const s=await anandaEnsureAttendanceServer();if(!s.ok)return s;const encoded=anandaB64UrlEncode(meta||{});return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?a='+encodeURIComponent(encoded)}});"
    new="""ipcMain.handle('ananda-attendance-prepare-sheet-link',async(_event,meta)=>{
  const s=await anandaEnsureAttendanceServer();if(!s.ok)return s;
  try{
    const p=JSON.parse(meta?.payload||'{}'),b=String(p.batchId||''),date=String(p.date||''),d8=date.replace(/-/g,''),sheet=Number(p.sheet||1),total=Number(p.totalSheets||1),verify=String(p.verify||'');
    if(b&&/^\\d{8}$/.test(d8)&&verify){
      const key=[b,d8,sheet,total,verify].join('|');anandaAttendanceSheetMeta.set(key,meta||{});
      const q=new URLSearchParams({b,d:d8,s:String(sheet),t:String(total),v:verify}).toString();
      return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?'+q}
    }
  }catch{}
  const encoded=anandaB64UrlEncode(meta||{});return{ok:true,ip:s.ip,port:s.port,url:s.baseUrl+'?a='+encodeURIComponent(encoded)}
});"""
    if old not in m:
        raise SystemExit('Prepare sheet link handler not found')
    m=m.replace(old,new,1)
    mainp.write_text(m,encoding='utf-8')

print('BETA 5.16 SHEET READER + COMPACT QR APPLIED')

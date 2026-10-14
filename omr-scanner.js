/* Ananda OMR beta 5.27: 4 printed fiducials + calibrated row ink. Never marks Absent. */
(function(root){
'use strict';
const DOC={anchor:[[11,11],[286,11],[11,199],[286,199]],top:48,bottom:189,left:[9,152],nameAndSerial:60,markEnd:136,rows:15};
function dark(a,i){const r=a[i],g=a[i+1],b=a[i+2];return .299*r+.587*g+.114*b<156||(b>r+20&&b>g+12&&r<130)}
function findMarker(a,w,h,q){
const x0=q%2?Math.floor(w*.71):0,x1=q%2?w:Math.ceil(w*.29),y0=q>=2?Math.floor(h*.76):0,y1=q>=2?h:Math.ceil(h*.24);
const rw=x1-x0,rh=y1-y0,seen=new Uint8Array(rw*rh),stack=new Int32Array(rw*rh);
const tx=q%2?w*.965:w*.035,ty=q>=2?h*.951:h*.049;let best=null;
for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
const start=y*rw+x;if(seen[start])continue;seen[start]=1;
if(!dark(a,((y+y0)*w+x+x0)*4))continue;
let n=0,minx=x,maxx=x,miny=y,maxy=y,sp=0;stack[sp++]=start;
while(sp){const p=stack[--sp],px=p%rw,py=(p/rw)|0;n++;minx=Math.min(minx,px);maxx=Math.max(maxx,px);miny=Math.min(miny,py);maxy=Math.max(maxy,py);
for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=px+dx,ny=py+dy;if(nx<0||nx>=rw||ny<0||ny>=rh)continue;const ni=ny*rw+nx;if(seen[ni])continue;seen[ni]=1;if(dark(a,((ny+y0)*w+nx+x0)*4))stack[sp++]=ni;}}
const bw=maxx-minx+1,bh=maxy-miny+1,cx=x0+(minx+maxx)/2,cy=y0+(miny+maxy)/2,ratio=bw/Math.max(bh,1),wr=bw/w,hr=bh/h,fill=n/(bw*bh);
if(n<18||wr<.009||wr>.065||hr<.009||hr>.075||ratio<.54||ratio>1.8||fill<.18||fill>.95)continue;
const score=Math.hypot((cx-tx)/w,(cy-ty)/h)+Math.abs(Math.log(ratio))*.04+(Math.abs(wr-.020)+Math.abs(hr-.027))*.3;
if(!best||score<best.score)best={x:cx,y:cy,score};
}return best;
}
function solve8(M,V){const n=8,a=M.map((r,i)=>[...r,V[i]]);
for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;if(Math.abs(a[p][c])<1e-10)return null;
[a[p],a[c]]=[a[c],a[p]];const d=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=d;for(let r=0;r<n;r++){if(r===c)continue;const f=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=f*a[c][j];}}return a.map(r=>r[n]);}
function homography(src,dst){const M=[],v=[];for(let i=0;i<4;i++){const[x,y]=src[i],{x:u,y:z}=dst[i];M.push([x,y,1,0,0,0,-u*x,-u*y]);v.push(u);M.push([0,0,0,x,y,1,-z*x,-z*y]);v.push(z)}const h=solve8(M,v);return h&&[...h,1]}
function map(H,x,y){const d=H[6]*x+H[7]*y+1;if(!Number.isFinite(d)||Math.abs(d)<1e-9)return null;return{x:(H[0]*x+H[1]*y+H[2])/d,y:(H[3]*x+H[4]*y+H[5])/d}}

function penInk(a,k){
 const r=a[k],g=a[k+1],b=a[k+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);
 // Isolate real dark pen strokes; do not treat printed blue borders as handwriting.
 return (mx<146&&r+g+b<395&&mx-mn<42)||(r<110&&g<160&&b>r+40&&b<223);
}
function rowMark(a,w,h,H,slot){
 const col=slot>=DOC.rows?1:0,row=slot%DOC.rows,left=DOC.left[col],pitch=(DOC.bottom-DOC.top)/DOC.rows;
 const x0=left+DOC.nameAndSerial+3.3,x1=left+DOC.markEnd-4.0,y0=DOC.top+row*pitch+2.0,y1=DOC.top+(row+1)*pitch-2.0;
 const pw=280,ph=46,size=pw*ph,ink=new Uint8Array(size),seen=new Uint8Array(size),stack=new Int32Array(size);let readable=0,total=0;
 for(let y=2;y<ph-2;y++)for(let x=3;x<pw-3;x++){
  const p=map(H,x0+(x+.5)*(x1-x0)/pw,y0+(y+.5)*(y1-y0)/ph);
  if(!p||p.x<0||p.y<0||p.x>=w||p.y>=h)continue;
  readable++;const k=(Math.round(p.y)*w+Math.round(p.x))*4,i=y*pw+x;
  if(penInk(a,k)){ink[i]=1;total++;}
 }
 if(readable<size*.60)return{present:false,confidence:'invalid',total,largest:0};
 let best=0,bestSpanX=0,bestSpanY=0;
 for(let i=0;i<size;i++){
  if(!ink[i]||seen[i])continue;seen[i]=1;
  let n=0,minx=pw,maxx=0,miny=ph,maxy=0,sp=0;stack[sp++]=i;
  while(sp){
   const k=stack[--sp],y=Math.floor(k/pw),x=k%pw;n++;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=pw||ny<0||ny>=ph)continue;
    const j=ny*pw+nx;if(ink[j]&&!seen[j]){seen[j]=1;stack[sp++]=j;}
   }
  }
  if(n>best){best=n;bestSpanX=maxx-minx+1;bestSpanY=maxy-miny+1;}
 }
 const present=total>=19&&best>=13&&(bestSpanX>=7||bestSpanY>=6)&&bestSpanX>=3&&bestSpanY>=2;
 const confidence=present?(best>=45?'high':'review'):(total>=14?'review':'unmarked');
 return{present,total,largest:best,spanX:bestSpanX,spanY:bestSpanY,confidence};
}
function detect(img,w,h,count,slots){
 if(!img||!w||!h||!Number.isInteger(count)||count<0||count>30)return{ok:false,reason:'Invalid attendance photo/row count'};
 if(slots&&(!Array.isArray(slots)||slots.length!==count||slots.some(s=>!Number.isInteger(s)||s<0||s>=30)||new Set(slots).size!==slots.length))
  return{ok:false,reason:'Printed row positions do not match this sheet'};
 const anchors=[0,1,2,3].map(q=>findMarker(img,w,h,q));
 if(anchors.some(a=>!a))return{ok:false,reason:'One or more page corner markers were not found. No attendance was changed.',anchorsFound:anchors.filter(Boolean).length};
 if(anchors[0].x>=anchors[1].x||anchors[2].x>=anchors[3].x||anchors[0].y>=anchors[2].y||anchors[1].y>=anchors[3].y)
  return{ok:false,reason:'Page corners are in the wrong order. No attendance was changed.'};
 const H=homography(DOC.anchor,anchors);if(!H)return{ok:false,reason:'Could not align this sheet. No attendance was changed.'};
 const marks=Array.from({length:count},(_,i)=>rowMark(img,w,h,H,slots?slots[i]:i));
 if(marks.some(x=>x.confidence==='invalid'))return{ok:false,reason:'The photo is too cropped to read safely. No attendance was changed.'};
 const present=marks.filter(m=>m.present).length;
 if(count>=8&&present>=count*.85)return{ok:false,reason:'Unreliable scan: almost all rows appear marked. No attendance was changed. Retake the photo or review manually.',diagnostics:{present,count}};
 return{ok:true,marks,present,needsReview:marks.filter(x=>x.confidence==='review').length,anchors};
}
const API={detect,findMarker,rowMark,homography,map,DOC};if(typeof module!=='undefined'&&module.exports)module.exports=API;if(root)root.AnandaOMR=API;
})(typeof window!=='undefined'?window:null);

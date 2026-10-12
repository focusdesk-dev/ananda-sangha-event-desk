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
function rowMark(a,w,h,H,index){
const col=index>=DOC.rows?1:0,row=index%DOC.rows,left=DOC.left[col],pitch=(DOC.bottom-DOC.top)/DOC.rows,x0=left+DOC.nameAndSerial+2,x1=left+DOC.markEnd-2,y0=DOC.top+row*pitch+1.6,y1=DOC.top+(row+1)*pitch-1.6;
const pw=300,ph=44,size=pw*ph,lum=new Uint8Array(size),rr=new Uint8Array(size),gg=new Uint8Array(size),bb=new Uint8Array(size),hist=new Uint32Array(256);
for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const p=map(H,x0+(x+.5)*(x1-x0)/pw,y0+(y+.5)*(y1-y0)/ph),i=y*pw+x;
if(!p||p.x<0||p.y<0||p.x>=w||p.y>=h){lum[i]=255;hist[255]++;continue}
const k=(Math.round(Math.min(h-1,p.y))*w+Math.round(Math.min(w-1,p.x)))*4,r=a[k],g=a[k+1],b=a[k+2];
rr[i]=r;gg[i]=g;bb[i]=b;const L=Math.max(0,Math.min(255,Math.round(.299*r+.587*g+.114*b)));lum[i]=L;hist[L]++}
let sum=0,bg=245;for(let i=0;i<256;i++){sum+=hist[i];if(sum>=size*.6){bg=i;break}}
const lim=Math.min(181,Math.max(65,bg-36)),ink=new Uint8Array(size);
for(let y=2;y<ph-2;y++)for(let x=3;x<pw-3;x++){const i=y*pw+x,L=lum[i],blue=bb[i]>rr[i]+18&&bb[i]>gg[i]+7&&L<Math.min(206,bg-17);if(L<lim||blue)ink[i]=1}
const seen=new Uint8Array(size),stack=new Int32Array(size);let total=0,best=0,span=0;
for(let i=0;i<size;i++){if(!ink[i]||seen[i])continue;seen[i]=1;let n=0,minx=pw,maxx=0,miny=ph,maxy=0,sp=0;stack[sp++]=i;
while(sp){const k=stack[--sp],y=(k/pw)|0,x=k%pw;n++;total++;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=pw||ny<0||ny>=ph)continue;const j=ny*pw+nx;if(ink[j]&&!seen[j]){seen[j]=1;stack[sp++]=j}}}
if(n>best){best=n;span=Math.max(maxx-minx+1,maxy-miny+1)}}
const present=total>=20&&best>=13&&span>=5;return{present,total,component:best,confidence:!present?'unmarked':best>=35?'high':'review'};}
function detect(img,w,h,count){if(!img||!w||!h||!Number.isInteger(count)||count<0||count>30)return{ok:false,reason:'Invalid attendance image or row count.'};
const anchors=[0,1,2,3].map(q=>findMarker(img,w,h,q));if(anchors.some(x=>!x))return{ok:false,reason:'Unable to locate all four printed corner squares. Retake the entire page; no attendance was changed.',anchorsFound:anchors.filter(Boolean).length};
if(anchors[0].x>=anchors[1].x||anchors[2].x>=anchors[3].x||anchors[0].y>=anchors[2].y||anchors[1].y>=anchors[3].y)return{ok:false,reason:'Page alignment is inconsistent; no attendance was changed.'};
const H=homography(DOC.anchor,anchors);if(!H)return{ok:false,reason:'Unable to straighten the sheet; no attendance was changed.'};
const marks=[];for(let i=0;i<count;i++)marks.push(rowMark(img,w,h,H,i));return{ok:true,marks,present:marks.filter(x=>x.present).length,needsReview:marks.filter(x=>x.confidence==='review').length}}
const API={detect,findMarker,rowMark,homography,map,DOC};if(typeof module!=='undefined'&&module.exports)module.exports=API;if(root)root.AnandaOMR=API;
})(typeof window!=='undefined'?window:null);

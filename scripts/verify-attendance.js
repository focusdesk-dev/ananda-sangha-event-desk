const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const omr = require('../omr-scanner.js');
const src = fs.readFileSync('index.html','utf8');
const inline = [...src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)];
for (let i=0;i<inline.length;i++) if(inline[i][1].trim()) new vm.Script(inline[i][1],{filename:'inline-script-'+i+'.js'});
assert(src.includes('BETA528: separate previously SAVED class attendance'));
assert(src.includes('BETA529: Always provide a 40-student'));
assert(src.includes('scanSlot:p2v521Pos(i,chunk.length).scanSlot'));
assert(src.includes('const leftCount=Math.min(P2V521_DOC.rowsPerColumn,Math.ceil(count/2))'));
assert(src.includes('FULL CLASS OVERVIEW'));
assert(src.includes('NEW SCAN REVIEW'));
assert(src.includes('PREVIOUSLY SAVED CLASS ATTENDANCE'));
assert(src.includes('p2v528MarkedRemainingAbsent'));
assert(src.includes('p2v524ScanSession={snapshot:snap,rows:mapped.out,data}'));
assert(src.includes('p2v58Draft[r.en.id]=hit?true:null'));
const W=1188,H=840,img=new Uint8ClampedArray(W*H*4);
for(let j=0;j<W*H;j++){img[j*4]=255;img[j*4+1]=255;img[j*4+2]=255;img[j*4+3]=255}
function pt(mmX,mmY,r,g,b){const x=Math.round(mmX*4),y=Math.round(mmY*4);if(x<0||y<0||x>=W||y>=H)return;const k=(y*W+x)*4;img[k]=r;img[k+1]=g;img[k+2]=b}
function rect(x0,y0,x1,y1,color){for(let y=Math.round(y0*4);y<y1*4;y++)for(let x=Math.round(x0*4);x<x1*4;x++){const k=(y*W+x)*4;img[k]=color;img[k+1]=color;img[k+2]=color;}}
for(const [cx,cy] of omr.DOC.anchor){
  rect(cx-3,cy-3,cx+3,cy-2,24);
  rect(cx-3,cy+2,cx+3,cy+3,24);
  rect(cx-3,cy-2,cx-2,cy+2,24);
  rect(cx+2,cy-2,cx+3,cy+2,24);
  rect(cx-.6,cy-.6,cx+.6,cy+.6,24);
}
function line(x0,y0,x1,y1){const steps=60;for(let i=0;i<=steps;i++){const t=i/steps,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;for(let dx=-.34;dx<=.34;dx+=.17)for(let dy=-.34;dy<=.34;dy+=.17)pt(x+dx,y+dy,24,30,40)}}
const unmarked = omr.detect(img,W,H,30);
assert(unmarked.ok, 'The completely unmarked sheet must be readable');
assert.strictEqual(unmarked.present,0,'Printed corners may never become Present');
const selected=[0,2,7,13,15,23,26];
for(const i of selected){const row=i%15,side=i>=15?152:9,y=48+(row+.5)*((189-48)/15),x=side+86;line(x-9,y+1,x,y-1);line(x,y-1,x+9,y-2);}
const det=omr.detect(img,W,H,30);
assert(det.ok,'Expected OMR to detect the four corners, received: '+det.reason);
const actual=det.marks.map((m,i)=>m.present?i:null).filter(v=>v!==null);
assert.deepStrictEqual(actual,selected,'Synthetic OMR result does not match seven known ink positions');
assert(det.marks.every(m=>m.present===true||m.present===false),'Scanner must only emit Present/Unmarked');
console.log('PASS: inline JavaScript syntax and OMR seven-mark mapping. Present='+actual.length+', Unmarked='+(30-actual.length));

const slots=[0,1,2,3,4,15,16,17,18,19];
const partial=omr.detect(img,W,H,10,slots);
assert(partial.ok,'Expected valid balanced 10-name final-page scan');
const presentSlots=partial.marks.map((m,i)=>m.present?i:null).filter(x=>x!==null);
assert.deepStrictEqual(presentSlots,[0,2,5],'Ten-name final page must use 5 left and 5 right row positions');
assert.strictEqual(partial.marks.filter(m=>m.present).length,3);
assert.strictEqual(omr.detect(img,W,H,10,[0,1,2,3,4,5,6,7,8,8]).ok,false,'Duplicate printed slots must be rejected');
console.log('PASS: blank form, full 30-name sheet, and balanced 5+5 final page');

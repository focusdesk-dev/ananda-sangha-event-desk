'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
(async()=>{
  const main=fs.readFileSync('main.js','utf8'),html=fs.readFileSync('index.html','utf8');
  assert(main.includes("const optimised=await anandaOptimiseUploadPhoto(selected)"),'Phone must resize before upload');
  assert(main.includes("fd.append('sheet',optimised,'attendance.jpg')"),'Phone must send JPEG');
  const start=main.indexOf('  async function anandaOptimiseUploadPhoto(f){');
  const end=main.indexOf("  $('camera').onchange",start);
  assert(start>0&&end>start,'Mobile compression helper missing');
  const phoneSize=[];let released=0;
  const canvas=()=>({width:0,height:0,getContext:()=>({drawImage:(img,x,y,w,h)=>phoneSize.push([w,h])}),
    toBlob:cb=>queueMicrotask(()=>cb({type:'image/jpeg',size:200000}))});
  const pc={createImageBitmap:async()=>({width:4032,height:3024,close:()=>released++}),
    document:{createElement:()=>canvas()},URL,Image:function(){}};
  vm.runInNewContext(main.slice(start,end)+';globalThis.compress=anandaOptimiseUploadPhoto',pc);
  const photo=await pc.compress({type:'image/jpeg'});
  assert.strictEqual(photo.type,'image/jpeg');
  assert.strictEqual(released,1);
  assert.strictEqual(phoneSize[0][0],2200);
  assert.strictEqual(phoneSize[0][1],1650);
  const aiStart=html.indexOf('    async function p2v535PrepareAiImage(blob,needQr){');
  const aiEnd=html.indexOf('    async function p2v530Analyse(){',aiStart);
  assert(aiStart>0&&aiEnd>aiStart,'AI async image helper missing');
  assert(!html.includes("const img=prep.canvas.toDataURL('image/jpeg',.86)"),'Blocking base64 conversion remains');
  assert(html.includes('p2v535PrepareAiImage(p2v530PhotoBlob,!p2v530PhotoPayload)'),
    'Signed phone metadata must skip QR rescan');
  let qrReads=0,aiDims=[];
  class MockFileReader {
    readAsDataURL(data){assert.strictEqual(data.type,'image/jpeg');queueMicrotask(()=>{this.result='data:image/jpeg;base64,QQ==';this.onload()});}
  }
  const ac={createImageBitmap:async()=>({width:3200,height:2400,close:()=>{}}),
    document:{createElement:()=>({width:0,height:0,
      getContext:()=>({drawImage:(image,x,y,w,h)=>aiDims.push([w,h])}),
      toBlob:(cb,type)=>{assert.strictEqual(type,'image/jpeg');queueMicrotask(()=>cb({type}))}})},
    p2v516FindQr:()=>{qrReads++;return{data:'test-qr'}},
    FileReader:MockFileReader};
  vm.runInNewContext(html.slice(aiStart,aiEnd)+';globalThis.prepare=p2v535PrepareAiImage',ac);
  let result=await ac.prepare({},false);
  assert.strictEqual(result.raw,'');
  assert.strictEqual(result.imageDataUrl,'data:image/jpeg;base64,QQ==');
  assert.strictEqual(qrReads,0,'Signed phone QR must not be decoded again');
  assert.strictEqual(aiDims[0][0],2200);
  assert.strictEqual(aiDims[0][1],1650);
  result=await ac.prepare({},true);
  assert.strictEqual(result.raw,'test-qr');
  assert.strictEqual(qrReads,1,'Direct laptop uploads must retain QR lookup');
  console.log('PASS: phone photo compression, bitmap disposal, async AI JPEG, signed QR rescan avoidance and laptop QR fallback');
})().catch(error=>{console.error(error);process.exitCode=1});

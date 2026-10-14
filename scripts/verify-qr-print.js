'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
(async()=>{
const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('main.js','utf8');
const start=html.indexOf('  p2v58PrintSheet=async function(aiMode=false){',html.indexOf('// EXACT APPROVED CAPACITY: 30 names per A4 sheet')-1700);
const end=html.indexOf('  // PHASE2 BETA523 PAGE BY PAGE PREVIEW',start);
assert(start>0&&end>start,'Final 30-student print function missing its AI-mode parameter');
const section=html.slice(start,end);
assert(section.includes('const p2v533PrintCore=p2v58PrintSheet'));
assert(section.includes("mode:aiMode?'ai':'offline'"),'AI mode missing from phone link metadata');
assert(section.includes("if(aiMode&&!new URL(link.url).searchParams.has('k'))"),'Unsigned AI QR must be blocked');
assert(section.includes("if(!link?.ok||!link?.url)"),'Unusable phone links must be reported');
assert(html.includes("const result=await p2v58PrintSheet(true)"),'AI print button must invoke AI mode');
assert(!html.includes("Save an OpenAI API key before printing AI QR sheets"),'No API key must be required for free QR printing');
assert(!main.includes("if(mode==='ai'&&!anandaReadAiKey())return"),'AI QR must be printable with no API key');
const rows=Array.from({length:40},(_,i)=>({en:{id:'E'+(i+1),studentId:'P'+(i+1)},p:{name:'Student '+(i+1),mobile:''}}));
const captured={links:[],qr:[],print:[],toast:[],status:[],saved:0,ids:0};
let wifi=true,failPreview=false;
const batch={id:'BATCH1',name:'Batch Test'};
const context={
 p2v58PrintSheet:undefined,
 p2v518ClearScanScope:()=>{},
 p2v58CurrentBatch:()=>batch,
 p2v58Date:'2026-10-14',
 p2v518CurrentRowsBase:()=>rows,
 p2v58LogoData:async()=>'',p2CourseName:()=> 'Level 1',
 P2V521_LAYOUT:'A4L30V2',
 P2V521_DOC:{left:9,right:152,dataTop:48},
 P2V521_ROW_HEIGHT:9.4,
 p2v521Pos:(i,count)=>{const leftCount=Math.min(15,Math.ceil(count/2));return i<leftCount?{left:9,row:i,scanSlot:i}:{left:152,row:i-leftCount,scanSlot:15+i-leftCount}},
 p2v518Id:()=> 'S'+(++captured.ids),
 p2v521Payload:(b,date,n,total,id)=>JSON.stringify({v:5,kind:'ANANDA_ATTENDANCE',layout:'A4L30V2',batchId:b.id,date,sheet:n,totalSheets:total,sheetId:id,verify:'signedverify'}),
 state:{attendanceSheetSnapshots:{}},
 window:{anandaAttendanceBridge:{prepareSheetLink:async meta=>{
   captured.links.push(meta);
   if(!wifi)return{ok:false,error:'Connect computer to Wi-Fi or phone hotspot first'};
   const url='http://192.168.1.10:45000/?b=BATCH1&x='+meta.sheetId+'&m='+meta.mode+(meta.mode==='ai'?'&k=SIGNEDTOKEN':'');
   return{ok:true,url}
 }},anandaDesktop:{printHtml:async source=>{captured.print.push(source);return failPreview?{ok:false,error:'Preview unavailable'}:{ok:true}}}},
 p2v58MakeQr:async raw=>{captured.qr.push(raw);return 'data:image/png;base64,AAA'},
 toast:msg=>captured.toast.push(msg),
 p2v530SetStatus:(msg,bad)=>captured.status.push({msg,bad}),
 fmt:x=>x,esc:x=>String(x||''),URL,Date,
 save:()=>captured.saved++,
 $:id=>id==='p2v530Status'?{}:null
};
vm.runInNewContext(section+'\n;globalThis.runPrint=p2v58PrintSheet;',context,{timeout:1000});
let result=await context.runPrint(true);
assert(result.ok&&result.pages===2&&result.mode==='ai','AI printing must produce two full sheets');
assert(captured.links.length===2&&captured.links.every(x=>x.mode==='ai'));
assert(captured.qr.every(x=>x.includes('&m=ai&k=SIGNEDTOKEN')),'AI sheets must have signed phone QR URLs');
assert(captured.print.length===1&&captured.print[0].includes('SCAN FOR AI PHOTO'),'AI print preview must show AI QR');
assert(Object.keys(context.state.attendanceSheetSnapshots).length===2,'Print snapshots must persist');
assert(context.state.attendanceSheetSnapshots.S1.rows.length===30&&context.state.attendanceSheetSnapshots.S2.rows.length===10);
assert(context.state.attendanceSheetSnapshots.S2.rows.slice(0,5).every(x=>x.scanSlot<15));
assert(context.state.attendanceSheetSnapshots.S2.rows.slice(5).every(x=>x.scanSlot>=15),'Final page should be 5 left + 5 right');
captured.links.length=0;captured.qr.length=0;
result=await context.runPrint(false);
assert(result.ok&&captured.links.every(x=>x.mode==='offline')&&captured.qr.every(x=>x.includes('m=offline')));
wifi=false;const count=captured.print.length;
result=await context.runPrint(true);
assert(!result.ok&&/Wi-Fi/.test(result.error)&&captured.print.length===count,'No Wi-Fi must show error, never issue fake QR');
wifi=true;failPreview=true;
result=await context.runPrint(true);
assert(!result.ok&&/Preview unavailable/.test(result.error),'Print-preview failure must be visible');
console.log('PASS: real final print function: AI signed QR, 30+10 frozen rosters, 5+5 last page, offline mode, no-Wi-Fi error, and preview failure');
})().catch(err=>{console.error(err);process.exitCode=1});

const fs=require('fs'),assert=require('assert'),path=require('path');
const file=process.env.ANANDA_INDEX_PATH||'index.html';
const original=fs.readFileSync(file,'utf8');
let s=original;
function exactly(before,after,label){
  const first=s.indexOf(before);assert(first>=0,'Missing '+label);
  assert(s.indexOf(before,first+before.length)<0,'Ambiguous '+label);
  s=s.replace(before,after);
}
exactly('conducted:!!date&&date<=today()&&!cancelled.has(date)}));',
  "conducted:!!date&&date<=today()&&!cancelled.has(date)&&( "+
  "(Array.isArray(b.conductedDates)&&b.conductedDates.includes(date))||"+
  "state.classEnrollments.some(en=>String(en.batchId)===String(b.id)&&"+
  "en.attendance&&(en.attendance[date]===true||en.attendance[date]===false)))}));",
  'classes conducted evidence-only count');
exactly("button.onclick=()=>$('p2v557ReviewModal').classList.remove('open'));",
  "button.onclick=()=>{$('p2v557ReviewModal').classList.remove('open');"+
  "const parent=$('p2EnrollModal');if(parent?.dataset.p1413ReviewHidden){parent.classList.add('open');delete parent.dataset.p1413ReviewHidden}});",
  'review cancel behaviour');
exactly("        $('p2v557ReviewModal').classList.add('open');\n      }\n      function p2v550RenderApprovals(){",
  "        const p1413Parent=$('p2EnrollModal');"+
  "if(p1413Parent?.classList.contains('open')){p1413Parent.dataset.p1413ReviewHidden='1';p1413Parent.classList.remove('open')}\n"+
  "        $('p2v557ReviewModal').classList.add('open');\n      }\n      function p2v550RenderApprovals(){",
  'review layering');
exactly("          v51RequireAdmin(()=>{\n            const prior=state.classEnrollments.find(x=>x.id===en.id),batch=state.classBatches.find(x=>x.id===source.id);",
  "          $('p2v557ReviewModal').classList.remove('open');"+
  "$('p2EnrollModal')?.classList.remove('open');\n"+
  "          window.p1413ReviewAuthPending=true;\n"+
  "          v51OpenSecurity(()=>{window.p1413ReviewAuthPending=false;\n"+
  "            const prior=state.classEnrollments.find(x=>x.id===en.id),batch=state.classBatches.find(x=>x.id===source.id);",
  'force admin password on accept');
const guard="\n  (function p1413ReviewCancelSafety(){\n"+
"    const restore=()=>{\n"+
"      if(!window.p1413ReviewAuthPending)return;\n"+
"      window.p1413ReviewAuthPending=false;\n"+
"      const parent=$('p2EnrollModal');\n"+
"      if(parent?.dataset.p1413ReviewHidden){parent.classList.add('open');delete parent.dataset.p1413ReviewHidden}\n"+
"    };\n"+
"    $('v51SecurityCancel')?.addEventListener('click',restore,true);\n"+
"    $('v51SecurityClose')?.addEventListener('click',restore,true);\n"+
"  })();\n";
exactly('      function p2v550RenderApprovals(){',guard+'      function p2v550RenderApprovals(){','admin cancel restore');
let snippet=fs.readFileSync(path.join(__dirname,'patch14-13-historical-snippet.txt'),'utf8');
snippet=snippet.replace('  (function p1413HistoricalStudentRecords(){','  queueMicrotask(function p1413HistoricalStudentRecords(){');
snippet=snippet.replace('  })();\n  // PATCH 14.13 END','  });\n  // PATCH 14.13 END');
assert(s.includes('// PATCH 14.12 END'),'Require installed Patch 14.12 baseline');
exactly('  // PATCH 14.12 END','  // PATCH 14.12 END\n'+snippet,'append only three agreed changes');
assert(s.length>original.length&&s.includes('p1413HistoricalStudentRecords'));
fs.writeFileSync(file,s);
console.log('PASS patches 2, 3 and 4 inserted; unrelated application code preserved.');

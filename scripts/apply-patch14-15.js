'use strict';
const fs=require('fs'),assert=require('assert');
const file=process.env.ANANDA_INDEX_PATH||'index.html';
const original=fs.readFileSync(file,'utf8');let s=original;
function replaceOnce(a,b,label){
 const i=s.indexOf(a);assert(i>=0,'Missing approved source: '+label);
 assert(s.indexOf(a,i+a.length)<0,'Ambiguous source: '+label);
 s=s.slice(0,i)+b+s.slice(i+a.length);
}
assert(s.includes('p1414ReviewAccept')&&s.includes('// PATCH 14.12 END'),'Expected approved Patch14.14 baseline');
assert(!s.includes('p1415DemoSafe'),'Patch already applied');

// Fix 1: a save from another screen invalidates the Class Attendance draft cache.
// Nothing changes while editing / reviewing attendance on its own screen.
const session="let p2v536SessionKey='',p2v536Draft={},p2v536ScannedSheets=new Set();";
replaceOnce(session,session+
 "\n    // p1415DemoSafe: refresh attendance cache on external save.\n"+
 "    const p1415SaveOriginal=save;\n"+
 "    save=function(...args){if(page!=='classAttendanceHub')p2v536SessionKey='';return p1415SaveOriginal.apply(this,args)};\n",
 'attendance synchronisation');

// Fix 2: only remove accidental enrolment, never the master student.
const edit="p2v5OpenStudentEdit=function(en){";
replaceOnce(edit,edit+
 "\n    const modal=$('p2v5StudentEditModal');\n"+
 "    let remove=$('p1415RemoveEnrollment');\n"+
 "    if(modal&&!remove){\n"+
 "      remove=document.createElement('button');remove.id='p1415RemoveEnrollment';remove.type='button';\n"+
 "      remove.className='btn secondary';remove.textContent='REMOVE FROM THIS BATCH';\n"+
 "      remove.style.cssText='border-color:#ce6c6c;color:#9f2727;margin-left:auto';\n"+
 "      modal.querySelector('.actions')?.appendChild(remove);\n"+
 "    }\n"+
 "    if(remove){\n"+
 "      const batch=state.classBatches.find(b=>b.id===en.batchId);\n"+
 "      remove.disabled=!batch||p2v5IsEnded(batch);\n"+
 "      remove.title=remove.disabled?'Ended batch records are locked':'Remove this enrolment only';\n"+
 "      remove.onclick=()=>{\n"+
 "        const current=state.classEnrollments.find(e=>e.id===$('p2v5EditEnrollmentId').value);\n"+
 "        const b=current&&state.classBatches.find(x=>x.id===current.batchId);\n"+
 "        if(!current||!b||p2v5IsEnded(b)){toast('This enrolment cannot be removed from an ended batch.');return}\n"+
 "        const student=p2v5Person(current);\n"+
 "        if(!window.confirm('Remove '+(student.name||'this student')+' from '+p2CourseName(b)+' · '+b.name+'?\\n\\nOnly this enrolment is removed. The student master and other history remain unchanged.'))return;\n"+
 "        state.classEnrollments=state.classEnrollments.filter(x=>x.id!==current.id);\n"+
 "        if(p2cSelectedEnrollmentId===current.id)p2cSelectedEnrollmentId='';\n"+
 "        modal.classList.remove('open');save();toast('Accidental enrolment removed from this batch.');\n"+
 "      };\n"+
 "    }\n",
 'Edit Student remove from this batch');

// Fix 3: only Student Wise search UI (the reported long results list).
const search="      function p2v526StudentWise(body){";
replaceOnce(search,search+
 "        if(!$('p1415StudentDropdownStyle')){\n"+
 "          const css=document.createElement('style');css.id='p1415StudentDropdownStyle';\n"+
 "          css.textContent='#p2v526Search{max-width:510px}#p2v526Search+.p2v526-results{max-width:510px;max-height:260px;overflow:auto;background:#fff;border:1px solid #d6e2ef;border-radius:0 0 9px 9px;box-shadow:0 8px 18px rgba(11,46,95,.1)}#p2v526Search+.p2v526-results.hidden{display:none!important}#p2v526Search+.p2v526-results .p2v526-result{display:block;box-sizing:border-box;width:100%;text-align:left;padding:9px 11px;border-bottom:1px solid #edf1f5}';\n"+
 "          document.head.appendChild(css);\n"+
 "        }\n",
 'dropdown style only');
const fifty=".sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).slice(0,50);";
assert(s.split(fifty).length===3,'Expected exactly two student results lists');
s=s.split(fifty).join(".sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).slice(0,5);");
const choose="p2v520History=btn.dataset.id;p2v520ShowHistory();";
assert(s.split(choose).length===3,'Expected exactly two matching-student selection handlers');
s=s.split(choose).join("p2v520History=btn.dataset.id;body.querySelector('.p2v526-results')?.classList.add('hidden');p2v520ShowHistory();");
replaceOnce("          const list=body.querySelector('.p2v526-results');\n          list.innerHTML=",
  "          const list=body.querySelector('.p2v526-results');\n          list.classList.toggle('hidden',!p2v526Search.trim());\n          list.innerHTML=",
  'hide dropdown on empty input');

// Fix 4: display only a genuine recorded date/year, resolved using exact identity.
const dateCell='$'+'{prettyDate(k.kriyaDate)}';
const replacement='$'+'{(function(){'+
 'const student=k.studentId?state.students.find(x=>x.id===k.studentId):null;'+
 "const mobile=normMobile(k.mobile||'');"+
 "const matches=!student&&mobile.length===10?state.students.filter(x=>normMobile(x.mobile||'')===mobile):[];"+
 'const linked=student||(matches.length===1?matches[0]:null);'+
 "const date=k.kriyaDate||linked?.kriyaDate||'';"+
 "const year=k.kriyaYear||linked?.kriyaYear||'';"+
 "return date?prettyDate(date):/^(19|20)\\d{2}$/.test(String(year))?E(String(year)):'—';"+
 '})()}';
replaceOnce(dateCell,replacement,'Kriya date/year display');
assert(!s.includes('p1413HistoricalStudentRecords'),'No rejected patch content');
fs.writeFileSync(file,s);
console.log('PASS: four targeted demo fixes; approved sidebar/attendance workflows preserved.');

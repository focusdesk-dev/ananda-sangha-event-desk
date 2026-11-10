'use strict';
(function verifyV577Source(){
  'use strict';
  const fs=require('node:fs'),assert=require('node:assert/strict');
  const html=fs.readFileSync('index.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.81.3');
  const sidebar=html.slice(html.indexOf('<aside'),html.indexOf('</aside>')+8);
  assert.equal(sidebar,fs.readFileSync('scripts/frozen-sidebar-beta573.txt','utf8'),'Frozen blue sidebar differs from approved baseline');
  const first=html.indexOf('function anandaV577()'),end=html.indexOf('  resetEventForm();',first);
  assert.ok(first>0&&end>first,'Permanent Records implementation missing');
  const part=html.slice(first,end);
  const ids=['attendeeMaster','volunteers','vips','students','acharyas','kriyabans','kriya2Master','kriya3Master','kriya4Master','sttMaster'];
  for(const id of ids){assert(part.includes("['"+id+"'"),'Master row missing '+id);assert(part.includes(id+":"),'Master icon missing '+id)}
  assert(part.includes('grid-template-columns:repeat(5,minmax(0,1fr))!important'),'Approved five-column master tiles missing');
  assert(part.includes('flex-direction:column!important'),'Icon not above label');
  assert(part.includes('border-radius:50%'),'Yellow circle badge missing');
  assert(part.includes('M24 8C30.8 15.4'),'Multi-petal lotus not preserved');
  assert(part.includes("v51RefreshSecurityButton=function()"),'Existing Master Lock state not reused');
  assert(part.includes("v51MasterUnlocked?'🔓 LOCK MASTER LISTS':'🔒 MASTER LOCK'"),'Master Lock label is wrong');
  assert(part.includes('const priorSwitch=switchPage'),'Existing navigation not preserved');
  assert(part.includes('grid.appendChild(button)'),'Existing permanent button nodes not reused');
  assert(part.includes("if(id==='permanentRecords')"),'Permanent Records render not wired');
  assert(!part.includes('state.classEnrollments.push'),'Implementation must not create enrolments');
  assert(!part.includes('state.students.push'),'Implementation must not create students');
  assert(part.includes('#v51SecurityButton'),'Security control missing from header styling');
  assert(part.includes("button.innerHTML="),'Master cards do not contain the approved icons');
  let count=0;
  for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
    assert.doesNotThrow(()=>new Function(m[1]),'Invalid script '+count);count++;
  }
  console.log('PASS 5.77 ten icon-above-title master buttons; five-column grid; 6-petal lotus; Master Lock retained; frozen sidebar unchanged; '+count+' script syntax checks');
})();

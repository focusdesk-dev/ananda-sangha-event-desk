'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const baseSHA='62873FC4FA13C02FBE3B350221E99C566AA12E96792B80AF62CACB3AFDE1999E';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Released Patch14.7 application is required');
 assert.equal(sha(input),baseSHA,'Refusing unknown app code');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html');
 const before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert(before.includes("window.anandaSettingsRamsVersion='14.7'"),'Approved Settings absent');
 assert(before.includes("window.anandaClassReportsExcelStyleVersion='14.6'"),'Correct Excel formatting absent');
 assert(before.includes("window.anandaDirectEventSingleDividerVersion='14.4'"),'Approved Event navigation absent');
 assert(!before.includes("window.anandaEnrolSaveAndConfirmVersion='14.8'"),'Patch already applied');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 const toReplace=[
   ["const level=p2v550Stage(b),course=String(b.courseId||'');",
    "const level=v148CanonicalCourse(b),course=String(b.courseId||'');"],
   ["const previousLevel=p2v550Stage(oldBatch);",
    "const previousLevel=v148CanonicalCourse(oldBatch);"],
   ["save();toast('Enrolled in class');return en",
    "save();v148ShowEnrolSuccess(p2cEnrollmentPerson(en)?.name||'Student');return en"],
   ["toast("+String.fromCharCode(96)+String.fromCharCode(36,123)+"name} enrolled"+String.fromCharCode(96)+")",
    "v148ShowEnrolSuccess(name)"]
 ];
 let changed=before;
 for(const [oldText,newText] of toReplace){
  assert.equal(changed.split(oldText).length,2,'Expected exactly one target found: '+oldText);
  changed=changed.replace(oldText,newText);
 }
 assert.equal(changed.split(marker).length,2,'Approved module insertion boundary altered');
 const addition=fs.readFileSync('scripts/approved-critical-enrol-save-confirm-patch14-8.js','utf8').replace(/\r\n/g,'\n');
 assert(addition.includes("window.anandaEnrolSaveAndConfirmVersion='14.8'"));
 changed=changed.replace(marker,addition+'\n'+marker);
 let reverse=changed.replace(addition+'\n'+marker,marker);
 for(const [oldText,newText] of toReplace)reverse=reverse.replace(newText,oldText);
 assert.equal(reverse,before,'Detected any change outside the four approved enrol targets');
 fs.writeFileSync(file,changed,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(changed));
 for(const f of ['main.js','preload.js','package.json'])
  assert.deepEqual(asar.extractFile(input,f),asar.extractFile(output,f),f+' was changed');
 fs.writeFileSync('patch14-8-source-audit.json',JSON.stringify({
   baseSHA256:sha(input),newSHA256:sha(output),modifiedFiles:['index.html'],
   change:'Fix repeat-course fee stage lookup ReferenceError, show Student enrolled successfully with OK after saved enrolment',
   changesToDataSchema:false,sidebarChanged:false,otherScreensChanged:false,
   originalPaymentAndProgressionRulesRetained:true
 },null,2)+'\n');
 console.log('PASS restricted patch: repeat-fee scope fix + first-click confirmation only; all other app code intact');
 console.log('NEW_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

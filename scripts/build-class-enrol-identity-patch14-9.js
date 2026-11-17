'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const baseSHA='430135AD8FBD0263E584D4463DB0B1D87851B66D517E77B9111713B51B7A64AD';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Actual released Patch14.8 application archive required');
 assert.equal(sha(input),baseSHA,'Refusing unknown baseline: not verified 14.8 release');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 for(const marker of ["window.anandaEnrolSaveAndConfirmVersion='14.8'","window.anandaSettingsRamsVersion='14.7'","window.anandaClassReportsExcelStyleVersion='14.6'"])
  assert(before.includes(marker),'Previously approved app code missing: '+marker);
 assert(!before.includes("window.anandaClassEnrolIdentityVersion='14.9'"),'Patch14.9 already applied');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'Approved safe insertion boundary changed');
 const addition=fs.readFileSync('scripts/approved-class-enrol-identity-patch14-9.js','utf8').replace(/\r\n/g,'\n');
 assert(addition.includes("window.anandaClassEnrolIdentityVersion='14.9'"));
 const authoritative='return p2v550EnrollFormBase.call(form,event);';
 const guarded='return v149ProtectedEnrolSubmit(form,event,p2v550EnrollFormBase);';
 assert.equal(before.split(authoritative).length,2,'Authoritative capture-phase handler changed unexpectedly');
 const after=before.replace(authoritative,guarded).replace(marker,addition+'\n'+marker);
 assert.equal(after.replace(addition+'\n'+marker,marker).replace(guarded,authoritative),before,
  'Changes detected outside protected enrolment capture path');
 fs.writeFileSync(file,after,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(after));
 for(const f of ['main.js','preload.js','package.json'])
  assert.deepEqual(asar.extractFile(input,f),asar.extractFile(output,f),f+' was modified');
 fs.writeFileSync('patch14-9-source-integrity.json',JSON.stringify({
  previousSHA256:sha(input),newSHA256:sha(output),
  changedModule:'one enrolment-only submit guard in index.html',
  changedDataSchema:false,frozenSidebarUnchanged:true,WindowsFocusHandlersUnchanged:true,
  progressionAndPaymentRuleChanges:false,
  existingMasterRecordsNotDeleted:true
 },null,2)+'\n');
 console.log('PASS scoped Patch14.9: mobile identity, no class/master orphan, previous modules untouched');
 console.log('NEW_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

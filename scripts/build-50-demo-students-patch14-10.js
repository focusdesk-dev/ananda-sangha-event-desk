'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const expectedBase='8E683747825430268DEE3B0717F658DD4DC42E6A62189CD7AE0334C0875A4B5C';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Released Patch14.9 archive required');
 assert.equal(sha(input),expectedBase,'Refusing app that differs from approved Patch14.9');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 for(const marker of ["window.anandaClassEnrolIdentityVersion='14.9'","window.anandaSettingsRamsVersion='14.7'","window.anandaClassReportsExcelStyleVersion='14.6'"]){
  assert(before.includes(marker),'Prior approved feature absent: '+marker);
 }
 assert(!before.includes("window.anandaLevel1DemoStudentsVersion='14.10'"),'Already has the demo data feature');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'Safe end-of-app insertion point changed');
 const addon=fs.readFileSync('scripts/approved-50-batch-demo-students-patch14-10.js','utf8').replace(/\r\n/g,'\n');
 assert(addon.includes("window.anandaLevel1DemoStudentsVersion='14.10'"));
 const after=before.replace(marker,addon+'\n'+marker);
 assert.equal(after.replace(addon+'\n'+marker,marker),before,'Code outside demo-data feature changed');
 fs.writeFileSync(file,after,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(after));
 for(const f of ['main.js','preload.js','package.json'])
  assert.deepEqual(asar.extractFile(input,f),asar.extractFile(output,f),f+' changed');
 fs.writeFileSync('patch14-10-demo-audit.json',JSON.stringify({
  previousAppSHA256:sha(input),updatedAppSHA256:sha(output),
  changedApplicationFiles:['index.html'],
  behavior:'Adds demo students only when explicit ADD 50 TEST STUDENTS button in open Level1 batch is clicked',
  dataOnInstall:'none',studentCount:50,paid:20,unpaid:30,
  duplicateNames:true,uniqueDummyMobiles:true,
  cleanup:'REMOVE TEST STUDENTS operates only on tagged enrolments/Master people',
  frozenSidebarAndExistingLogicUnchanged:true
 },null,2)+'\n');
 console.log('PASS exact Patch14.9 + isolated opt-in 50 demo-student helper; no existing app feature changed');
 console.log('NEW_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

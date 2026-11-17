'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const expectedSHA='538EFEF637EBDE84FC569D370CD7DE2973F4D1E444A9084BA9F81F142304DEED';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert.ok(fs.existsSync(input),'Released Patch14.4 archive required');
 assert.equal(sha(input),expectedSHA,'Refuse an unknown/unverified Patch14.4 base');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const html=path.join(dir,'index.html');
 const before=fs.readFileSync(html,'utf8').replace(/\r\n/g,'\n');
 const handler="g('v574Export').onclick=()=>v51RequireAdmin(()=>p2Csv(records().map(csvEntry),'Ananda_Class_Reports_Filtered_List.csv'),'export the Class Reports list');";
 const upgraded="g('v574Export').onclick=()=>v145OpenClassReportExportMenu(g('v574Export'),()=>records(),()=>({...r}),()=>p2Csv(records().map(csvEntry),'Ananda_Class_Reports_Filtered_List.csv'));";
 assert.equal(before.split(handler).length,2,'Approved Class Reports Export List handler missing or duplicated');
 assert(before.includes("window.anandaDirectEventSingleDividerVersion='14.4'"),'VIEW/yellow divider approved fix is missing');
 assert(before.includes("window.anandaExistingFamilyPatchVersion='14'"),'Existing family Add Member fix missing');
 assert(!before.includes("window.anandaClassReportsExportVersion='14.5'"),'Export patch already installed');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'App module insertion boundary has changed');
 const fix=fs.readFileSync('scripts/approved-class-reports-xlsx-export-patch14-5.js','utf8');
 assert(fix.includes("window.anandaClassReportsExportVersion='14.5'"));
 let next=before.replace(handler,upgraded).replace(marker,fix+'\n'+marker);
 assert.equal(next.replace(fix+'\n'+marker,marker).replace(upgraded,handler),before,'A prior approved screen was changed');
 fs.writeFileSync(html,next,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(next));
 for(const file of ['main.js','package.json','preload.js'])
  assert.deepEqual(asar.extractFile(output,file),asar.extractFile(input,file),file+' unexpectedly modified');
 fs.writeFileSync('patch14-5-build-report.json',JSON.stringify({
  previousSHA256:sha(input),newSHA256:sha(output),
  modifiedAppFiles:['index.html'],changedHandler:'Class Reports Export List only',
  exportFormats:['Registration Checklist XLSX','Payment List XLSX','Combined XLSX','Three-sheet XLSX','Old CSV'],
  sourceOfTruth:'current class enrollments + saved payment status at export time',
  otherScreensModified:false,dataSchemaModified:false
 },null,2)+'\n');
 console.log('PASS exact approved Patch14.4 base, scoped Class Reports export only, no data schema/other-screen modifications');
 console.log('NEW_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

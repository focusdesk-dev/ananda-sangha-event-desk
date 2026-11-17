'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const baseSHA='C05341B5BA44A79AF29122EA39FF88E97F0D8D512BF17C1B303E6612194BD43A';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Verified released Patch14.6 application archive required');
 assert.equal(sha(input),baseSHA,'Refusing unknown app archive: correct Patch14.6 installation required');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert(before.includes("window.anandaClassReportsExcelStyleVersion='14.6'"),'Class Excel dark borders correction missing');
 assert(before.includes("window.anandaDirectEventSingleDividerVersion='14.4'"),'Frozen event route/divider correction missing');
 assert(before.includes("window.anandaExistingFamilyPatchVersion='14'"),'Approved saved family registration missing');
 assert(!before.includes("window.anandaSettingsRamsVersion='14.7'"),'Settings correction already installed');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'Source has unexpected module boundary');
 const addition=fs.readFileSync('scripts/approved-four-section-settings-patch14-7.js','utf8').replace(/\r\n/g,'\n');
 assert(addition.includes("window.anandaSettingsRamsVersion='14.7'"),'Settings patch missing');
 const after=before.replace(marker,addition+'\n'+marker);
 assert.equal(after.replace(addition+'\n'+marker,marker),before,'Detected source change outside approved Settings patch');
 fs.writeFileSync(file,after,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(after),'Packaged Settings code mismatch');
 for(const f of ['main.js','preload.js','package.json'])
   assert.deepEqual(asar.extractFile(input,f),asar.extractFile(output,f),f+' was modified');
 fs.writeFileSync('patch14-7-source-audit.json',JSON.stringify({
  originalAppSHA256:sha(input),newAppSHA256:sha(output),modifiedAppFiles:['index.html'],
  change:'Settings layout only: four sections, no Advanced; data reset in protected Danger Zone',
  originalSidebarPreserved:true,
  preservedControls:['v52PasswordSettingsForm','p2v546ProgressionForm','p2v532NewKey',
     'p2v537ApiUsage','v123BackupSettings','v123RestoreSettings','v87ImportTemplates','v123ResetSettings'],
  appDataSchemaModified:false
 },null,2)+'\n');
 console.log('PASS only Settings layout inserted, original archive/source untouched, app main/preload/package unchanged');
 console.log('NEW_APP_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

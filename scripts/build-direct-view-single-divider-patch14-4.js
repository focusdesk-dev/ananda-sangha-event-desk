'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const expectedSHA='24F788CED0E3616EDAA52A1A6566BA0B58CAD6555CE34D09A00087E525E1A4EC';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert.ok(fs.existsSync(input),'Released Patch14.1 app archive required');
 assert.equal(sha(input),expectedSHA,'Refusing any unverified base archive');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html');
 const before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert(before.includes("window.anandaExistingFamilyPatchVersion='14'"),'Patch14 saved-member feature missing');
 assert(before.includes("window.anandaThreeScreensPatchVersion='10'"),'Approved Event Record design missing');
 assert(!before.includes("window.anandaEventContextHeaderVersion='14.3'"),'Unexpected changed header, refusing build');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'Original Ananda module boundary changed');
 const fix=fs.readFileSync('scripts/approved-direct-event-single-divider-patch14-4.js','utf8');
 assert(fix.includes("window.anandaDirectEventSingleDividerVersion='14.4'"));
 const next=before.replace(marker,fix+'\n'+marker);
 assert.equal(next.replace(fix+'\n'+marker,marker),before,'Changes outside the two approved fixes');
 fs.writeFileSync(file,next,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(next),'Updated Event code mismatch');
 for(const f of ['main.js','package.json'])assert.deepEqual(asar.extractFile(output,f),asar.extractFile(input,f),f+' unexpectedly changed');
 fs.writeFileSync('patch14-4-change-report.json',JSON.stringify({
   baseline:'Released Patch14.1 — latest user-approved existing Record tab',
   baseSHA256:sha(input),updatedSHA256:sha(output),
   changedAppFiles:['index.html'],route:'VIEW to existing eventRecord',yellowDivider:'one below navigation tabs',
   sidebarModified:false,dataSchemaModified:false
 },null,2)+'\n');
 console.log('PASS: single additive app script; approved Event Record UI and all other modules untouched');
 console.log('NEW_ASAR_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

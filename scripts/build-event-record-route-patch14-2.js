'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const expectedSHA='24F788CED0E3616EDAA52A1A6566BA0B58CAD6555CE34D09A00087E525E1A4EC';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Patch14.1 released app.asar not supplied');
 assert.equal(hash(input),expectedSHA,'Refuse an unknown starting application');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html');
 const old=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert(old.includes("window.anandaExistingFamilyPatchVersion='14'"),'Existing family registration fix missing');
 assert(old.includes("window.anandaThreeScreensPatchVersion='10'"),'Approved event summary missing');
 assert(!old.includes("window.anandaEventRecordRouteVersion='14.2'"),'Route fix already exists');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(old.split(marker).length,2,'Cannot identify exact insertion boundary');
 const fix=fs.readFileSync('scripts/approved-event-record-route-patch14-2.js','utf8');
 assert(fix.includes("window.anandaEventRecordRouteVersion='14.2'"));
 const next=old.replace(marker,fix+'\n'+marker);
 assert.equal(next.replace(fix+'\n'+marker,marker),old,'Unexpected source modification');
 fs.writeFileSync(file,next,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(next));
 assert.deepEqual(asar.extractFile(output,'main.js'),asar.extractFile(input,'main.js'));
 assert.deepEqual(asar.extractFile(output,'package.json'),asar.extractFile(input,'package.json'));
 fs.writeFileSync('event-record-route-build-report.json',
  JSON.stringify({inputSHA256:hash(input),outputSHA256:hash(output),
    onlyModifiedAppFile:'index.html',sourceBytesBefore:Buffer.byteLength(old),
    sourceBytesAfter:Buffer.byteLength(next)},null,2)+'\n');
 console.log('PASS only index.html changed; app runtime, data interfaces and package unchanged');
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

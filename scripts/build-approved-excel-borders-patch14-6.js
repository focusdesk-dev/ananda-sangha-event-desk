'use strict';
// Repeatable isolated build from the EXACT published Patch14.5 app.asar.
// Change ONLY the approved Excel style generator, preserving all other code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const cp=require('node:child_process'),asar=require('@electron/asar');
const [,,inputArg,outputArg,dirArg]=process.argv;
const input=path.resolve(inputArg||''),output=path.resolve(outputArg||''),dir=path.resolve(dirArg||'');
const expectedSHA='BE8E5E71833718B645D7DC351F3D570B5EA7D06027958AD396F6963921D20EC6';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').toUpperCase();
async function main(){
 assert(fs.existsSync(input),'Published Patch14.5 app.asar required');
 assert.equal(sha(input),expectedSHA,'Refusing unverified Patch14.5 baseline');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 asar.extractAll(input,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const old=cp.execFileSync('git',['show','7fc9973e4a2d20e7fece23a4a42cc81f7bf249e7:scripts/approved-class-reports-xlsx-export-patch14-5.js'],{encoding:'utf8'}).replace(/\r\n/g,'\n');
 const replacement=fs.readFileSync('scripts/approved-class-reports-xlsx-export-patch14-5.js','utf8').replace(/\r\n/g,'\n');
 assert.equal(before.split(old).length,2,'Original approved Patch14.5 Excel exporter was modified unexpectedly');
 assert(replacement.includes("window.anandaClassReportsExcelStyleVersion='14.6'"));
 assert(!replacement.includes('</bottom/>'),'Invalid XML style closer still present');
 assert(replacement.includes('border(\\'medium\\''),'Table outline border missing');
 const after=before.replace(old,replacement);
 assert.equal(after.replace(replacement,old),before,'Unexpected update outside Excel style generator');
 fs.writeFileSync(file,after,'utf8');
 await asar.createPackage(dir,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(after));
 for(const f of ['main.js','package.json','preload.js'])
   assert.deepEqual(asar.extractFile(input,f),asar.extractFile(output,f),f+' unexpectedly changed');
 fs.writeFileSync('patch14-6-change-report.json',JSON.stringify({
   baselineSHA256:sha(input),updatedSHA256:sha(output),
   modifiedApplicationFile:'index.html',modifiedModule:'Class Reports XLSX styling only',
   fix:'valid Excel styles XML and dark bounded table',
   noChangesTo:'student records, data schema, registration, payment calculations, Classes or Events UI'
 },null,2)+'\n');
 console.log('PASS: exact Patch14.5 archive, Excel formatting-only change, other modules unchanged');
 console.log('NEW_SHA256='+sha(output));
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

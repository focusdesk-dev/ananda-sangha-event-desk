'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
const base='2A925ACF5306DDE18499B96688E60D4F5783599E376FBEFC5FED291C1AE68CE0';
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one unique patch marker');return s.replace(a,b)}
async function main(){
 assert.ok(fs.existsSync(old),'Missing Patch 5.2 input archive');
 assert.equal(sha256(old),base,'Refusing unknown Patch 5.2 input archive');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert.ok(before.includes("existingForEvent=addVolunteerForToday"),'Prior cross-event logic missing');
 const marker='  // PHASE2 BETA513 CURRENT FINAL';
 const addition="  // VOLUNTEER PATCH 5.3 INSTALLED: verified across-event registration UI marker.\n"+
 "  window.anandaVolunteerPatchVersion='5.3';\n"+
 "  document.title='Ananda Sangha Event Desk — Volunteer Patch 5.3';\n\n"+
 marker;
 const after=once(before,marker,addition);
 assert.equal(once(after,addition,marker),before,'Changes outside the explicit patch version marker');
 fs.writeFileSync(file,after,'utf8');await asar.createPackage(dir,out);
 assert.deepEqual(asar.extractFile(out,'index.html'),Buffer.from(after));
 assert.deepEqual(asar.extractFile(out,'main.js'),asar.extractFile(old,'main.js'),'Keyboard fix must be preserved');
 assert.equal(JSON.parse(asar.extractFile(out,'package.json').toString()).version,'2.0.0-beta.5.81.8');
 const meta={baseSha256:sha256(old),patchSha256:sha256(out),onlyChangedFile:'index.html',previousBytes:Buffer.byteLength(before),patchedBytes:Buffer.byteLength(after),verifyMarker:"window.anandaVolunteerPatchVersion='5.3'"};
 fs.writeFileSync('volunteer-5-3-hashes.json',JSON.stringify(meta,null,2)+'\n');
 console.log('PASS exact v5.2 base, unchanged frozen screen styling, preserved volunteer save fix, visible version marker',meta);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
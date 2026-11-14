'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
const baseline='FEC945AF6352BF22BEDA9FB75CB21A28EF235AFD24D1E23D3F739993E00ED95D';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function once(s,a,b){assert.equal(s.split(a).length,2,'Unexpected version marker count');return s.replace(a,b)}
async function main(){
 assert.ok(fs.existsSync(old),'Missing Patch 5.3 baseline');
 assert.equal(hash(old),baseline,'Refusing unverified Patch 5.3 baseline');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const oldMarker="window.anandaVolunteerPatchVersion='5.3'",newMarker="window.anandaVolunteerPatchVersion='5.4'";
 let after=once(before,oldMarker,newMarker);
 after=once(after,"document.title='Ananda Sangha Event Desk — Volunteer Patch 5.3'","document.title='Ananda Sangha Event Desk — Volunteer Patch 5.4'");
 assert.equal(once(once(after,"document.title='Ananda Sangha Event Desk — Volunteer Patch 5.4'","document.title='Ananda Sangha Event Desk — Volunteer Patch 5.3'"),newMarker,oldMarker),before,'Unexpected unrelated app source change');
 assert.ok(after.includes("existingForEvent=addVolunteerForToday"),'Cross-event fix must persist');
 fs.writeFileSync(file,after,'utf8');await asar.createPackage(dir,out);
 assert.deepEqual(asar.extractFile(out,'index.html'),Buffer.from(after));
 assert.deepEqual(asar.extractFile(out,'main.js'),asar.extractFile(old,'main.js'),'Keyboard recovery must remain intact');
 assert.equal(JSON.parse(asar.extractFile(out,'package.json').toString()).version,'2.0.0-beta.5.81.8');
 const meta={baseSha256:hash(old),patchSha256:hash(out),onlyChangedFile:'index.html',version:'5.4',previousBytes:Buffer.byteLength(before),patchedBytes:Buffer.byteLength(after)};
 fs.writeFileSync('volunteer-5-4-hashes.json',JSON.stringify(meta,null,2)+'\n');
 console.log('PASS exact Patch5.3 baseline, only 5.4 version markers, volunteer fix and frozen screens unchanged',meta);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const originalArchive=path.resolve(process.argv[2]||'');
const outputArchive=path.resolve(process.argv[3]||'');
const extract=path.resolve(process.argv[4]||'');
if(!fs.existsSync(originalArchive)||!outputArchive||!extract)
  throw Error('Usage: node build-unified-volunteers-patch5.js <patch4.asar> <patch5.asar> <workdir>');
const gitBlobSha=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
async function main(){
  if(fs.existsSync(extract))fs.rmSync(extract,{recursive:true,force:true});
  fs.mkdirSync(extract,{recursive:true});
  asar.extractAll(originalArchive,extract);
  const entry=path.join(extract,'index.html'),original=fs.readFileSync(entry);
  const normalized=original.toString('utf8').replace(/\r\n/g,'\n');
  const expectedPatch4GitSha='75af30791685b6293e2e83ca6b683091f1f2ab60';
  assert.equal(gitBlobSha(Buffer.from(normalized)),expectedPatch4GitSha,
   'This app.asar is not the verified 5.81.8 Alignment Patch 4; refusing Patch 5');
  const updated=fs.readFileSync(path.join(__dirname,'..','index.html'));
  const after=updated.toString('utf8').replace(/\r\n/g,'\n');
  const marker='<!-- Patch 5: Only Volunteer main content + existing-registration status, frozen sidebar untouched. -->';
  const start=after.indexOf(marker);
  const end=after.indexOf('<script id="frozen-checkin-copy-5817">',start);
  assert.ok(start>=0&&end>start&&after.includes('id="ananda-patch5-unified"'),'Volunteers/registration Patch 5 styles missing');
  const block=after.slice(start,end);
  assert.ok(block.includes('#v5VolunteerHub')&&block.includes('.v5-issue')&&block.includes('v5-existing-checkin'),'All three approved UI pieces missing');
  assert.ok(!/aside\s|\.nav-btn|\.brand-logo/.test(block),'Frozen sidebar must not be styled');
  const mainNew=after.indexOf('  // Patch 5: one VOLUNTEERS workflow');
  assert.ok(mainNew>0&&after.includes('function v5RenderHub()')&&after.includes('function v5FinishReverse()'),'Volunteer and reversible attendance logic missing');
  assert.ok(after.includes("check.textContent='✓ CHECK IN'")&&after.includes("'PRE-REGISTERED'")&&after.includes("'REGISTERED'"),'Required existing-registration direct Check-In missing');
  assert.ok(after.includes('v5Audit')&&after.includes('legacy:!!checkedBefore'),'Attendance provenance preservation missing');
  const oldAside=normalized.slice(normalized.indexOf('    aside{'),normalized.indexOf('    .brand{'));
  assert.ok(after.includes(oldAside),'Frozen sidebar style changed');
  assert.ok(after.includes('function v36AllAttendeeRows()'),'Attendee records were not preserved');
  require('node:vm').Script && new (require('node:vm').Script)(after.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'');
  const pkg=JSON.parse(fs.readFileSync(path.join(extract,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.81.8','Patch 5 applies only to 5.81.8');
  fs.writeFileSync(entry,updated);
  await asar.createPackage(extract,outputArchive);
  assert.deepEqual(asar.extractFile(outputArchive,'index.html'),updated);
  const report={baseSha256:sha256(originalArchive),patchSha256:sha256(outputArchive),
     oldIndexBytes:original.length,newIndexBytes:updated.length,
     packedBytes:fs.statSync(outputArchive).size,version:pkg.version};
  fs.writeFileSync(path.resolve('patch5-hashes.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS Patch 5: exact Patch 4 baseline verified; approved registration and consolidated volunteer logic present',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
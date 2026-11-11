'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const originalArchive=path.resolve(process.argv[2]||'');
const outputArchive=path.resolve(process.argv[3]||'');
const extract=path.resolve(process.argv[4]||'');
if(!fs.existsSync(originalArchive)||!outputArchive||!extract)
  throw Error('Usage: node build-checkin-action-patch4.js <patch3.asar> <patch4.asar> <workdir>');
const gitBlobSha=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
async function main(){
  if(fs.existsSync(extract))fs.rmSync(extract,{recursive:true,force:true});
  fs.mkdirSync(extract,{recursive:true});
  asar.extractAll(originalArchive,extract);
  const entry=path.join(extract,'index.html'),original=fs.readFileSync(entry);
  const normalized=original.toString('utf8').replace(/\r\n/g,'\n');
  const expectedPatch3GitSha='78fb19f05a37cb8bf5b06c9b96bc1887ac9f39a0';
  assert.equal(gitBlobSha(Buffer.from(normalized)),expectedPatch3GitSha,
   'This app.asar is not the verified 5.81.8 Header Patch 3; refusing Patch 4');
  const updated=fs.readFileSync(path.join(__dirname,'..','index.html'));
  const after=updated.toString('utf8').replace(/\r\n/g,'\n');
  const marker='<!-- Patch 4: align the secondary Undo / More actions in one fixed action column. No event behavior changed. -->';
  const start=after.indexOf(marker);
  const end=after.indexOf('<script id="frozen-checkin-copy-5817">',start);
  assert.ok(start>=0&&end>start&&after.includes('id="checkin-action-alignment-patch4"'),'Alignment-only patch missing');
  const prior=after.slice(0,start)+after.slice(end);
  assert.equal(prior,normalized,'Patch 4 must not modify any pre-existing code, controls, layout or data');
  const block=after.slice(start,end);
  assert.ok(block.includes('grid-template-columns:110px 60px!important')&&block.includes('align-items:center!important')&&block.includes('width:60px!important'),'Required Action-column alignment rules missing');
  assert.ok(!/localStorage|state\.|save\(|aside\s|\.nav-btn/.test(block),'Patch 4 must have no app data/sidebar logic');
  const pkg=JSON.parse(fs.readFileSync(path.join(extract,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.81.8','Patch 4 applies only to 5.81.8');
  fs.writeFileSync(entry,updated);
  await asar.createPackage(extract,outputArchive);
  assert.deepEqual(asar.extractFile(outputArchive,'index.html'),updated);
  const report={baseSha256:sha256(originalArchive),patchSha256:sha256(outputArchive),
     oldIndexBytes:original.length,newIndexBytes:updated.length,
     packedBytes:fs.statSync(outputArchive).size,version:pkg.version};
  fs.writeFileSync(path.resolve('patch4-hashes.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS Patch 4: exact Patch 3 baseline verified; only Action-column alignment CSS added',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
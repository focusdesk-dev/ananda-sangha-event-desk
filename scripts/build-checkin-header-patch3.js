'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const originalArchive=path.resolve(process.argv[2]||'');
const outputArchive=path.resolve(process.argv[3]||'');
const extract=path.resolve(process.argv[4]||'');
if(!fs.existsSync(originalArchive)||!outputArchive||!extract)
  throw Error('Usage: node build-checkin-header-patch3.js <patch2.asar> <patch3.asar> <workdir>');
const gitBlobSha=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
async function main(){
  if(fs.existsSync(extract))fs.rmSync(extract,{recursive:true,force:true});
  fs.mkdirSync(extract,{recursive:true});
  asar.extractAll(originalArchive,extract);
  const entry=path.join(extract,'index.html'),original=fs.readFileSync(entry);
  const normalized=original.toString('utf8').replace(/\r\n/g,'\n');
  const expectedPatch2GitSha='19e658571e60c42e19fc70dcd96c904a842c6956';
  assert.equal(gitBlobSha(Buffer.from(normalized)),expectedPatch2GitSha,
   'This app.asar is not the verified 5.81.8 Typography Patch 2; refusing Patch 3');
  const updated=fs.readFileSync(path.join(__dirname,'..','index.html'));
  const after=updated.toString('utf8').replace(/\r\n/g,'\n');
  const marker='<!-- Patch 3: approved Check-In header only. No other page or behavior changed. -->';
  const start=after.indexOf(marker);
  const end=after.indexOf('<script id="frozen-checkin-copy-5817">',start);
  assert.ok(start>=0&&end>start&&after.includes('id="checkin-header-caps-patch3"'),'Header-only patch missing');
  const prior=after.slice(0,start)+after.slice(end);
  assert.equal(prior,normalized,'Patch 3 must not modify any pre-existing code, controls, layout or data');
  const block=after.slice(start,end);
  assert.ok(block.includes('#pageTitle{text-transform:uppercase!important}')&&block.includes('#pageSubtitle{display:none!important}'),'Required two header changes missing');
  assert.ok(!/localStorage|state\.|save\(|aside\s|\.nav-btn/.test(block),'Patch 3 must have no app data/sidebar logic');
  const pkg=JSON.parse(fs.readFileSync(path.join(extract,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.81.8','Patch 3 applies only to 5.81.8');
  fs.writeFileSync(entry,updated);
  await asar.createPackage(extract,outputArchive);
  assert.deepEqual(asar.extractFile(outputArchive,'index.html'),updated);
  const report={baseSha256:sha256(originalArchive),patchSha256:sha256(outputArchive),
     oldIndexBytes:original.length,newIndexBytes:updated.length,
     packedBytes:fs.statSync(outputArchive).size,version:pkg.version};
  fs.writeFileSync(path.resolve('patch3-hashes.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS Patch 3: exact Patch 2 baseline verified; only approved title capitals and subtitle hiding were added',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
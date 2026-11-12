'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),output=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
const baseSha='42B01AF5726C7B6A6AB9B91ABF1148E76ED3F69341D2CD22085A1CB2091AB0F1';
const mainBlob='75d027853ae080b84b4b88c97557e91a171c0a84';
const htmlBlob='5a02fea1b1ecdc3049a94bcac17fdafffbb6cb4a';
const hashGit=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
async function main(){
  if(!fs.existsSync(old)||!output||!dir)throw Error('Usage: node scripts/build-keyboard-focus-patch.js <patch5.asar> <new.asar> <workdir>');
  assert.equal(sha256(old),baseSha,'Not the verified Fresh Patch 5 archive: refusal protects existing files');
  if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true,force:true});
  fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
  const app=path.join(dir,'main.js'),previous=fs.readFileSync(app,'utf8').replace(/\r\n/g,'\n');
  const index=fs.readFileSync(path.join(dir,'index.html'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(hashGit(Buffer.from(previous)),mainBlob,'Unexpected Electron main process code');
  assert.equal(hashGit(Buffer.from(index)),htmlBlob,'Approved Patch 5 HTML changed unexpectedly');
  const anchor="  mainWindow.webContents.on('before-input-event', (event, input) => {";
  assert.equal(previous.split(anchor).length,2,'Unique keyboard shortcut anchor missing');
  const snippet=fs.readFileSync(path.join(__dirname,'keyboard-focus-patch-snippet.txt'),'utf8');
  assert.ok(snippet.includes('PATCH 5.1 KEYBOARD FOCUS RECOVERY')&&snippet.includes("mainWindow.on('focus', anandaScheduleRendererFocus)"));
  assert.ok(snippet.includes("BrowserWindow.getFocusedWindow() !== mainWindow")&&snippet.includes("mainWindow.webContents.on('before-mouse-event'"));
  assert.ok(!snippet.includes('preventDefault(')&&!snippet.includes('localStorage'),'Focus fix must not intercept input or modify data');
  const patched=previous.replace(anchor,snippet+'\n'+anchor);
  assert.equal(patched.replace(snippet+'\n'+anchor,anchor),previous,'Focus fix would change unrelated code');
  new Function(patched);
  fs.writeFileSync(app,patched,'utf8');
  const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  assert.equal(pkg.version,'2.0.0-beta.5.81.8','Wrong app version');
  await asar.createPackage(dir,output);
  assert.deepEqual(asar.extractFile(output,'main.js'),Buffer.from(patched,'utf8'));
  assert.deepEqual(asar.extractFile(output,'index.html'),asar.extractFile(old,'index.html'));
  const report={baseSha256:sha256(old),patchSha256:sha256(output),version:pkg.version,
    onlyChangedFile:'main.js',previousMainBytes:Buffer.byteLength(previous),newMainBytes:Buffer.byteLength(patched)};
  fs.writeFileSync('keyboard-patch-hashes.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS: exact Fresh Patch5 baseline, keyboard-only change, syntax, archive and preserved HTML',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});

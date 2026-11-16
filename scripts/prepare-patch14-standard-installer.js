'use strict';
/**
 * Build a conventional Electron app from the exact released Patch13 ASAR,
 * applying only reviewed Patch14 JavaScript source.
 *
 * This is explicitly NOT the old C# self-extracting patcher.
 * It produces actual application sources for electron-builder NSIS packaging.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),
 assert=require('node:assert/strict'),asar=require('@electron/asar');
const input=path.resolve(process.argv[2]||'');
const expected='70F3424BEBCC9434D9D54B678EC69677A50C21A30BD7A0FFDC69EB4EE11BFC7F';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
async function main(){
 assert.ok(fs.existsSync(input),'Released verified Patch13 app.asar required');
 const baseBytes=fs.readFileSync(input);
 assert.equal(sha(baseBytes),expected,'STOP: Installed base SHA differs from released Patch13');
 const extracted=path.resolve('dist-secure-source');
 fs.rmSync(extracted,{recursive:true,force:true});fs.mkdirSync(extracted,{recursive:true});
 asar.extractAll(input,extracted);
 const manifest=JSON.parse(fs.readFileSync(path.join(extracted,'package.json'),'utf8'));
 const project=JSON.parse(fs.readFileSync('package.json','utf8'));
 assert.equal(manifest.version,'2.0.0-beta.5.81.8');
 assert.equal(manifest.main,'main.js');
 assert.equal(project.version,manifest.version);
 const before=fs.readFileSync(path.join(extracted,'index.html'),'utf8').replace(/\r\n/g,'\n');
 assert.ok(before.includes("window.anandaStudentVolunteerIntegrityVersion='13'"),
  'Exact baseline must include Patch13 integrity improvements');
 assert.ok(!before.includes("window.anandaExistingFamilyPatchVersion='14'"));
 const patch=fs.readFileSync('scripts/approved-existing-family-edit-patch14.js','utf8');
 assert.ok(patch.includes("window.anandaExistingFamilyPatchVersion='14'"));
 const mark='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(mark).length,2,'Unexpected source; do not patch unidentified script scope');
 const after=before.replace(mark,patch+'\n'+mark);
 assert.equal(after.replace(patch+'\n'+mark,mark),before,'Unrelated code was changed');
 fs.writeFileSync('index.html',after,'utf8');
 const targetFiles=['main.js','preload.js','logo-128.png','ananda-icon.ico',
  'qrcode-client.js','jsqr-client.js','omr-scanner.js'];
 const reports=[];
 for(const name of targetFiles){
   const file=path.join(extracted,name);
   assert.ok(fs.existsSync(file),'Missing release asset: '+name);
   const bytes=fs.readFileSync(file);
   fs.writeFileSync(name,bytes);
   reports.push({filename:name,sha256:sha(bytes),bytes:bytes.length});
 }
 // Conservative: Don't bundle any npm scripts, previous installers or
 // newly introduced executables inside the application asar.
 assert.ok(!after.includes('<script src="https://'),'Unexpected external script');
 const report={
   source:"exact released Patch13 app.asar plus reviewed Patch14 JS only",
   priorAsarSha256:expected,
   beforeIndexSha256:sha(Buffer.from(before,'utf8')),
   patch14ScriptSha256:sha(Buffer.from(patch,'utf8')),
   newIndexSha256:sha(Buffer.from(after,'utf8')),
   compiledAppVersion:manifest.version,
   retainedReleaseFiles:reports,
   packaging:"electron-builder standard NSIS Windows installer (not custom GZip patcher)",
   digitalSignature:"not signed - no valid certificate configured",
 };
 fs.writeFileSync('standard-patch14-source-integrity.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS original source integrity; only Patch14 JS inserted; original runtime and asset hashes retained',report);
}
main().catch(error=>{console.error(error.stack||String(error));process.exitCode=1});

'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),asar=require('@electron/asar');
const input=path.resolve(process.argv[2]||''),output=path.resolve(process.argv[3]||''),work=path.resolve(process.argv[4]||'');
const expected='70F3424BEBCC9434D9D54B678EC69677A50C21A30BD7A0FFDC69EB4EE11BFC7F';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
async function main(){
 assert.ok(fs.existsSync(input),'Missing released Patch13 app.asar');
 assert.equal(sha(input),expected,'Patch13 shipped archive mismatch');
 fs.rmSync(work,{recursive:true,force:true});fs.mkdirSync(work,{recursive:true});
 asar.extractAll(input,work);
 const index=path.join(work,'index.html'),original=fs.readFileSync(index,'utf8').replace(/\r\n/g,'\n');
 assert.ok(original.includes("window.anandaStudentVolunteerIntegrityVersion='13'"));
 assert.ok(!original.includes("window.anandaExistingFamilyPatchVersion='14'"));
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(original.split(marker).length,2,'Unknown app scope. Refusing to edit');
 const fix=fs.readFileSync('scripts/approved-existing-family-edit-patch14.js','utf8');
 assert.ok(fix.includes("window.anandaExistingFamilyPatchVersion='14'"));
 const revised=original.replace(marker,fix+'\n'+marker);
 assert.equal(revised.replace(fix+'\n'+marker,marker),original,'Unapproved content change');
 fs.writeFileSync(index,revised,'utf8');
 await asar.createPackage(work,output);
 assert.deepEqual(asar.extractFile(output,'index.html'),Buffer.from(revised));
 assert.deepEqual(asar.extractFile(output,'main.js'),asar.extractFile(input,'main.js'),'Desktop code changed');
 assert.equal(JSON.parse(asar.extractFile(output,'package.json').toString()).version,'2.0.0-beta.5.81.8');
 const report={baseSha256:sha(input),patchSha256:sha(output),onlyChangedFile:'index.html',
  version:'14',previousBytes:Buffer.byteLength(original),patchedBytes:Buffer.byteLength(revised)};
 fs.writeFileSync('frozen-patch14-hashes.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS Patch13 exact released SHA, one approved family patch insertion; main.js and app version unchanged',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exit(1)});

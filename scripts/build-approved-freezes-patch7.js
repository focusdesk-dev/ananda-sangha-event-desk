'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),asar=require('@electron/asar');
const old=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||''),dir=path.resolve(process.argv[4]||'');
const expectedBase='C70E85DE8F35621EF91BD51FE40D1329F3BAEADDA14327A3599F483AED8F075E';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const git=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
async function main(){
 assert.ok(fs.existsSync(old),'Missing verified Patch5.4 archive');
 assert.equal(sha(old),expectedBase,'Refuse unknown baseline; Patch6 must start from tested Patch5.4');
 fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});asar.extractAll(old,dir);
 const file=path.join(dir,'index.html'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 assert.ok(before.includes("window.anandaVolunteerPatchVersion='5.4'"),'Missing approved Patch5.4 marker');
 const code=fs.readFileSync('scripts/approved-frozen-event-badge-patch7.js','utf8');
 assert.ok(code.includes("window.anandaFrozenPatchVersion='6'"),'Approved Freeze6 implementation missing');
 const marker='    // PATCH 5 END (fresh build)\n\n})();\n</script>';
 assert.equal(before.split(marker).length,2,'Unexpected main application scope; no modifications made');
 const replacement=code+'\n'+marker;
 const after=before.replace(marker,replacement);
 assert.equal(after.replace(replacement,marker),before,'No other app content may be changed');
 fs.writeFileSync(file,after,'utf8');
 await asar.createPackage(dir,out);
 assert.deepEqual(asar.extractFile(out,'index.html'),Buffer.from(after));
 assert.deepEqual(asar.extractFile(out,'main.js'),asar.extractFile(old,'main.js'),'Desktop and keyboard code changed unexpectedly');
 assert.equal(JSON.parse(asar.extractFile(out,'package.json').toString()).version,'2.0.0-beta.5.81.8');
 const report={baseSha256:sha(old),patchSha256:sha(out),onlyChangedFile:'index.html',freeze1:true,freeze2:true,volunteerFix:true,version:'7',sourceSha1:git(Buffer.from(code)),previousBytes:Buffer.byteLength(before),patchedBytes:Buffer.byteLength(after)};
 fs.writeFileSync('frozen-patch7-hashes.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS exact 5.4 archive, one app scope insertion, original sidebar, Classes, data and keyboard source untouched',report);
}
main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
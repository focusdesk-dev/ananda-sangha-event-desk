// Patch 14.11: isolated serial-number attendance UI. Baseline 14.10 is not otherwise modified.
const fs=require('fs'), path=require('path'), assert=require('assert');
const p=path.join(__dirname,'..','index.html');
const original=fs.readFileSync(p,'utf8');
const anchor='  function p2v510WireAttendance(){';
assert(original.includes(anchor),'Attendance integration anchor not found');
assert(!original.includes('p14SerialAttendanceBar'),'Serial attendance patch already applied');
const patch=String.raw\`
  // PATCH 14.11 START -- serial-number entry only; do not edit frozen screens.
  (function installP14SerialAttendance(){
    const hub=document.getElementById('classAttendanceHub');
    if(!hub)return;
    const rootId='p14SerialAttendanceBar';
    let preview=null;
    const css=document.createElement('style');
    css.id='p14SerialAttendanceStyle';
    css.textContent='#'+rootId+'{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 16px;margin:12px 0;border:1px solid #f0d480;background:#fffaf0;border-radius:10px;font-size:13px;color:#143568}#'+rootId+' label{font-weight:750;white-space:nowrap}#p14SerialInput{flex:1;min-width:180px;padding:11px 13px;border:1px solid #bbcee6;border-radius:8px;font:inherit;background:white}#p14SerialPreview{border:0;background:#ffc329;color:#082d65;border-radius:8px;font-weight:750;padding:11px 18px;cursor:pointer}#p14SerialDialog{position:fixed;inset:0;background:#001b3b80;z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px}#p14SerialDialog[hidden]{display:none!important}#p14SerialDialog .p14-box{width:min(480px,100%);background:white;border-radius:12px;box-shadow:0 18px 48px #001a3659;overflow:hidden;color:#113567}#p14SerialDialog .p14-title{background:#083574;color:white;padding:18px 22px;font-size:18px;font-weight:750}#p14SerialDialog .p14-body{padding:20px 22px}#p14SerialDialog .p14-metrics{display:flex;gap:12px;margin:16px 0}#p14SerialDialog .p14-metrics span{flex:1;padding:14px;border-radius:9px;background:#edf5fb;text-align:center}#p14SerialDialog .p14-metrics b{display:block;font-size:30px}#p14SerialDialog .p14-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}#p14SerialDialog button{border-radius:8px;border:1px solid #bfd0e5;background:white;padding:11px 18px;font-weight:650;cursor:pointer}#p14SerialDialog #p14SerialSave{background:#ffc329;color:#082d65;border-color:#ffc329}';
    document.head.appendChild(css);
    const modal=document.createElement('div');
    modal.id='p14SerialDialog';modal.hidden=true;
    modal.innerHTML='<div class="p14-box" role="dialog" aria-modal="true" aria-label="Confirm serial number attendance"><div class="p14-title">Confirm Attendance</div><div class="p14-body"><div id="p14SerialContext"></div><div class="p14-metrics"><span><b id="p14SerialPresent">0</b>Present</span><span><b id="p14SerialAbsent">0</b>Absent</span></div><div id="p14SerialNumbers"></div><p id="p14SerialChanges" style="font-size:12px;color:#5b7089"></p><p style="font-size:12px;color:#5b7089">Only the selected class date will be updated. Other dates and Not Applicable records remain unchanged.</p><div class="p14-actions"><button type="button" id="p14SerialCancel">Cancel</button><button type="button" id="p14SerialSave">Confirm &amp; Save</button></div></div></div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;preview=null};
    modal.querySelector('#p14SerialCancel').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    function mount(){
      if(document.getElementById(rootId))return;
      const roster=hub.querySelector('#p2v58Roster');
      if(!roster||!roster.parentElement)return;
      const bar=document.createElement('div');bar.id=rootId;
      bar.innerHTML='<label for="p14SerialInput">MARK BY S.NO.</label><input id="p14SerialInput" type="text" autocomplete="off" placeholder="1, 2, 3, 4, 7, 10, 15, 20, 24"><span style="font-size:12px;color:#677c92">Separate serial numbers with commas</span><button id="p14SerialPreview" type="button">Preview</button>';
      roster.parentElement.insertBefore(bar,roster);
      bar.querySelector('#p14SerialPreview').onclick=showPreview;
    }
    function rosterEntries(date){
      const nodes=[...hub.querySelectorAll('#p2v58Roster .p2v58-row')];
      const entries=nodes.map(row=>{
        const number=Number((row.querySelector('.p2v58-no')?.textContent||'').trim());
        const id=row.querySelector('.p2v58-check')?.dataset.en;
        const en=state.classEnrollments.find(x=>x.id===id);
        return{number,en,name:(row.querySelector('.p2v58-name')?.textContent||'').trim()};
      }).filter(x=>Number.isSafeInteger(x.number)&&x.number>0&&x.en);
      if(!entries.length||new Set(entries.map(x=>x.number)).size!==entries.length)throw Error('Roster serial numbers are unavailable or duplicated');
      return entries.map(x=>({...x,eligible:typeof p2v5EnrollmentEligibleOn!=='function'||p2v5EnrollmentEligibleOn(x.en,date)}));
    }
    function showPreview(){
      const b=p2v58CurrentBatch(),date=p2v58Date;
      if(!b||!date){toast('Choose a batch and class date first');return}
      if(typeof p2v5IsEnded==='function'&&p2v5IsEnded(b)){toast('Ended batches cannot be edited');return}
      const input=document.getElementById('p14SerialInput').value.trim();
      if(!input||!/^\\s*\\d+(?:\\s*,\\s*\\d+)*\\s*$/.test(input)){toast('Enter serial numbers separated by commas');return}
      const tokens=input.split(',').map(x=>Number(x.trim()));
      if(tokens.some(x=>!Number.isSafeInteger(x)||x<1)){toast('Invalid serial number');return}
      const chosen=new Set(tokens),roster=rosterEntries(date),byNumber=new Map(roster.map(x=>[x.number,x]));
      const invalid=[...chosen].filter(n=>!byNumber.has(n));
      if(invalid.length){toast('Unknown serial number: '+invalid.join(', '));return}
      const unavailable=[...chosen].filter(n=>!byNumber.get(n).eligible);
      if(unavailable.length){toast('Not Applicable for this date: '+unavailable.join(', '));return}
      const applicable=roster.filter(x=>x.eligible),present=applicable.filter(x=>chosen.has(x.number));
      const changes=applicable.filter(x=>p2cAttendanceStatus(x.en,date)!==chosen.has(x.number)).length;
      preview={batchId:b.id,date,chosen,applicable,rosterIds:roster.map(x=>x.en.id).join('|')};
      document.getElementById('p14SerialContext').textContent=(p2CourseName(b)||'Class')+' · '+(b.name||'Batch')+' · '+fmt(date);
      document.getElementById('p14SerialPresent').textContent=present.length;
      document.getElementById('p14SerialAbsent').textContent=applicable.length-present.length;
      document.getElementById('p14SerialNumbers').textContent='Present (S.No.): '+[...chosen].sort((a,z)=>a-z).join(', ');
      document.getElementById('p14SerialChanges').textContent=changes+' saved attendance value(s) will change on this date. Existing values for this date will be replaced after confirmation.';
      modal.hidden=false;
    }
    modal.querySelector('#p14SerialSave').onclick=()=>{
      if(!preview)return;
      const b=p2v58CurrentBatch(),date=p2v58Date;
      if(!b||b.id!==preview.batchId||date!==preview.date||(typeof p2v5IsEnded==='function'&&p2v5IsEnded(b))){close();toast('Batch or date changed. Preview again.');return}
      let live;try{live=rosterEntries(date)}catch(e){close();toast('Roster changed. Preview again.');return}
      if(live.map(x=>x.en.id).join('|')!==preview.rosterIds){close();toast('Roster changed. Preview again.');return}
      // Apply one atomic batch update to the currently selected date only.
      for(const row of live){
        if(!row.eligible)continue;
        const value=preview.chosen.has(row.number);
        row.en.attendance=row.en.attendance||{};
        row.en.attendance[date]=value;
        p2v58Draft[row.en.id]=value;
      }
      close();save();if(typeof p2v58RenderRoster==='function')p2v58RenderRoster();toast('Serial-number attendance saved');
    };
    const obs=new MutationObserver(mount);obs.observe(hub,{childList:true,subtree:true});mount();
  })();
  // PATCH 14.11 END
\`;
const changed=original.replace(anchor,patch+'\\n'+anchor);
assert.strictEqual(changed.split('PATCH 14.11 START').length,2);
assert.strictEqual(changed.replace(patch+'\\n',''),original,'Only patch addition is permitted');
fs.writeFileSync(p,changed);
console.log('Serial attendance patch inserted; original application preserved');

from pathlib import Path

path=Path('src/index.html')
text=path.read_text(encoding='utf-8')

# Phase 2 beta.4B - issues 4-6
# Add an open-ended/manual session-date manager to the class workspace without
# disturbing the existing attendance/enrolment implementation (reserved for 4C).
marker='</body>'
if marker not in text:
    raise SystemExit('Could not locate body end for beta.4B')

script=r'''
<script>
/* PHASE2 BETA4B OPEN ENDED CLASS DATES */
(function(){
  const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const byId=id=>document.getElementById(id);
  const iso=d=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),x=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${x}`};
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
  const fmtLocal=s=>{if(!validDate(s))return s||'—';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`};
  const currentBatch=()=>state?.classBatches?.find?.(b=>b.id===state.activeClassBatchId)||null;
  const sortedDates=b=>[...new Set((b?.sessionDates||[]).filter(validDate))].sort();
  function saveBatch(b){
    if(!b)return;
    b.sessionDates=sortedDates(b);
    if(typeof save==='function')save();
    if(typeof p2RenderClassWorkspace==='function')p2RenderClassWorkspace();
    else if(typeof render==='function')render();
    setTimeout(ensureWorkspace,30);
  }
  function nextWeekday(baseIso,day){
    let base=validDate(baseIso)?new Date(baseIso+'T12:00:00'):new Date();
    let diff=(Number(day)-base.getDay()+7)%7;
    if(diff===0)diff=7;
    base.setDate(base.getDate()+diff);
    return iso(base);
  }
  function addDate(b,date){
    if(!b||!validDate(date))return false;
    b.sessionDates=sortedDates({...b,sessionDates:[...(b.sessionDates||[]),date]});
    if(!b.start)b.start=date;
    if(!b.status||String(b.status).toLowerCase()==='upcoming')b.status='Current';
    saveBatch(b);return true;
  }
  function ensureWorkspace(){
    const page=byId('classWorkspace');
    if(!page)return;
    const b=currentBatch();
    const old=byId('p2Beta4bDatesCard');
    if(!b){if(old)old.remove();return}
    if(old){renderCard(old,b);return}
    const card=document.createElement('div');
    card.id='p2Beta4bDatesCard';card.className='card';card.style.marginTop='18px';
    const banner=page.querySelector('.event-banner');
    if(banner&&banner.parentNode)banner.insertAdjacentElement('afterend',card);else page.prepend(card);
    renderCard(card,b);
  }
  function renderCard(card,b){
    if(b.defaultClassDay===undefined||b.defaultClassDay===null)b.defaultClassDay=0;
    const dates=sortedDates(b);
    const openEnded=!!b.openEnded||!b.end;
    card.innerHTML=`
      <div class="card-head"><div><h3>Class Dates &amp; Schedule</h3><div class="card-sub">Use a schedule when dates are known, or keep the class open-ended and add each class date as it is decided.</div></div></div>
      <div class="p2b-grid">
        <label class="p2b-check"><input type="checkbox" id="p2bOpenEnded" ${openEnded?'checked':''}> <span><strong>Open-ended / end date not known</strong><small>The class stays ongoing. You can add future dates one by one.</small></span></label>
        <label><span class="p2b-label">Default class day</span><select id="p2bDefaultDay">${DAY_NAMES.map((n,i)=>`<option value="${i}" ${Number(b.defaultClassDay)===i?'selected':''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="p2b-addrow">
        <div><span class="p2b-label">Next / manual class date</span><input id="p2bDateInput" type="date"></div>
        <button class="btn secondary" type="button" id="p2bNextClass">+ Next Class</button>
        <button class="btn" type="button" id="p2bAddDate">+ Add Class Date</button>
      </div>
      <div class="p2b-note" id="p2bSuggestion">Click + Next Class to suggest the next ${DAY_NAMES[Number(b.defaultClassDay)||0]}. You can edit the date before saving.</div>
      <div class="p2b-dates"><strong>Class dates (${dates.length})</strong>${dates.length?`<div class="p2b-datechips">${dates.map((d,i)=>`<span>${i+1}. ${fmtLocal(d)}</span>`).join('')}</div>`:'<div class="p2-empty" style="margin-top:10px">No class dates added yet.</div>'}</div>`;
    const open=byId('p2bOpenEnded');
    open.onchange=()=>{b.openEnded=open.checked;if(open.checked)b.end='';saveBatch(b)};
    const day=byId('p2bDefaultDay');
    day.onchange=()=>{b.defaultClassDay=Number(day.value);saveBatch(b)};
    byId('p2bNextClass').onclick=()=>{
      const ds=sortedDates(b);const base=ds.length?ds[ds.length-1]:(validDate(b.start)?b.start:'');
      const suggested=nextWeekday(base,Number(day.value));
      byId('p2bDateInput').value=suggested;
      byId('p2bSuggestion').textContent=`Suggested ${DAY_NAMES[Number(day.value)]}: ${fmtLocal(suggested)}. Edit it if this class will be on another day, then click + Add Class Date.`;
    };
    byId('p2bAddDate').onclick=()=>{
      const input=byId('p2bDateInput');
      if(!validDate(input.value)){alert('Please choose a class date.');input.focus();return}
      if((b.sessionDates||[]).includes(input.value)){alert('This class date is already added.');return}
      addDate(b,input.value);
    };
  }
  function makeEndDateOptional(){
    // The existing batch form may vary between Phase 2 builds. Find the date input
    // whose visible label contains "end" and allow it to stay blank.
    document.querySelectorAll('form').forEach(form=>{
      const labels=[...form.querySelectorAll('label')];
      labels.forEach(label=>{
        if(!/end\s*date|class\s*end|end$/i.test((label.textContent||'').trim()))return;
        const input=label.querySelector('input[type="date"]')||(()=>{const f=label.getAttribute('for');return f?byId(f):null})();
        if(input){input.required=false;input.dataset.beta4bOptionalEnd='1'}
      });
    });
  }
  const obs=new MutationObserver(()=>{makeEndDateOptional();const page=byId('classWorkspace');if(page&&(page.classList.contains('active')||getComputedStyle(page).display!=='none'))ensureWorkspace()});
  window.addEventListener('DOMContentLoaded',()=>{makeEndDateOptional();ensureWorkspace();obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']})});
  document.addEventListener('click',()=>setTimeout(()=>{makeEndDateOptional();ensureWorkspace()},25),true);
})();
</script>
'''
text=text.replace(marker,script+'\n'+marker,1)

css=r'''
<style>
/* PHASE2 BETA4B DATE UI */
#p2Beta4bDatesCard .p2b-grid{display:grid;grid-template-columns:minmax(300px,1fr) minmax(220px,320px);gap:14px;margin-top:8px}
#p2Beta4bDatesCard .p2b-check{display:flex;gap:10px;align-items:flex-start;border:1px solid #d8e3eb;border-radius:10px;padding:12px;background:#fbfdfe}
#p2Beta4bDatesCard .p2b-check small{display:block;color:#718396;margin-top:4px}
#p2Beta4bDatesCard .p2b-label{display:block;font-size:11px;text-transform:uppercase;color:#64788b;margin-bottom:6px;font-weight:700}
#p2Beta4bDatesCard select,#p2Beta4bDatesCard input[type="date"]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cddbe5;border-radius:9px;background:white}
#p2Beta4bDatesCard .p2b-addrow{display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:end;margin-top:14px}
#p2Beta4bDatesCard .p2b-note{font-size:12px;color:#687d91;margin-top:9px}
#p2Beta4bDatesCard .p2b-dates{margin-top:18px;border-top:1px solid #e2e9ee;padding-top:14px}
#p2Beta4bDatesCard .p2b-datechips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
#p2Beta4bDatesCard .p2b-datechips span{border:1px solid #d6e2eb;background:#f7fafc;border-radius:999px;padding:7px 10px;font-size:12px;color:#173f7d}
@media(max-width:800px){#p2Beta4bDatesCard .p2b-grid,#p2Beta4bDatesCard .p2b-addrow{grid-template-columns:1fr}}
</style>
'''
text=text.replace('</head>',css+'\n</head>',1)

required=['PHASE2 BETA4B OPEN ENDED CLASS DATES','PHASE2 BETA4B DATE UI','+ Next Class','+ Add Class Date','Open-ended / end date not known','defaultClassDay']
for m in required:
    if m not in text: raise SystemExit('Missing beta.4B marker: '+m)
path.write_text(text,encoding='utf-8',newline='\n')
print('APPLIED PHASE 2 BETA.4B ISSUES 4-6:',len(text.encode('utf-8')),'bytes')

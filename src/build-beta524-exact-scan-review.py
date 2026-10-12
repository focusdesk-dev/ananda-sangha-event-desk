from pathlib import Path

p=Path('src/index.html')
h=p.read_text(encoding='utf-8')
if 'PHASE2 BETA521 APPROVED A4 30' not in h:
    raise SystemExit('Approved 30-name attendance sheet missing')
if 'PHASE2 BETA524 EXACT SCAN REVIEW' in h:
    print('Beta 5.24 already applied')
    raise SystemExit(0)

# Make the printed QR physically larger without moving any attendance geometry.
h=h.replace(
    ".scanqr{position:absolute;left:202mm;top:11mm;width:21mm;text-align:center;z-index:15;background:#fff}.scanqr img{display:block;width:21mm;height:21mm;margin:0 auto}",
    ".scanqr{position:absolute;left:198mm;top:9mm;width:25mm;text-align:center;z-index:15;background:#fff}.scanqr img{display:block;width:25mm;height:25mm;margin:0 auto}",
    1
)

marker='\n\n    updateBackButton();'
if marker not in h:
    raise SystemExit('Renderer insertion marker missing')

patch=r'''
  // PHASE2 BETA524 EXACT SCAN REVIEW
  // The printed Sheet ID is now the authority during a scan review.
  // Never render the current 40-person class roster or old saved attendance while
  // reviewing a 30-name printed sheet.

  let p2v524ScanSession=null;

  function p2v524ClearSession(){
    p2v524ScanSession=null;
    p2v518ActiveRows=null;
    p2v518ActiveSnapshot=null
  }

  function p2v524LocalPosition(r,i){
    const n=Number(r?.sheetRow?.position||i+1);
    return Number.isFinite(n)&&n>0?n:i+1
  }
  function p2v524DisplayNumber(r,i){
    const local=p2v524LocalPosition(r,i),sheet=Number(p2v524ScanSession?.snapshot?.sheet||1);
    return (Math.max(1,sheet)-1)*30+local
  }

  const p2v524RenderRosterBase=p2v58RenderRoster;
  p2v58RenderRoster=function(){
    if(!p2v524ScanSession)return p2v524RenderRosterBase();
    const host=$('p2v58Roster');if(!host)return;
    const rows=p2v524ScanSession.rows||[],left=[],right=[];
    rows.forEach((r,i)=>{
      const pos=p2v524LocalPosition(r,i);
      (pos<=15?left:right).push({r,i,pos})
    });
    const rowHtml=item=>{
      const {r,i}=item,v=p2v58Draft[r.en.id],
        cls=v===true?' present':v===false?' absent':' pending',
        no=p2v524DisplayNumber(r,i);
      return '<label class="p2v58-row'+cls+'" data-search="'+esc(((r.p.name||'')+' '+(r.p.mobile||'')).toLowerCase())+'">'+
        '<span class="p2v58-no">'+String(no).padStart(2,'0')+'</span>'+
        '<span class="p2v58-name">'+esc(r.p.name||r.sheetRow?.name||'Unnamed')+'</span>'+
        '<input class="p2v58-check" type="checkbox" data-en="'+r.en.id+'" '+(v===true?'checked':'')+'>'+
        '<span class="p2v58-box"></span></label>'
    };
    host.innerHTML=rows.length
      ?'<div class="p2v58-namebar">PRINTED SHEET · '+esc(String(p2v524ScanSession.snapshot?.sheetId||''))+'</div>'+
       '<div class="p2v58-two"><div>'+left.map(rowHtml).join('')+'</div><div>'+right.map(rowHtml).join('')+'</div></div>'
      :'<div class="p2-empty">No students were stored in this printed sheet.</div>';
    host.querySelectorAll('.p2v58-check').forEach(x=>x.onchange=()=>{
      p2v58Draft[x.dataset.en]=x.checked?true:null;p2v58RenderRoster()
    });
    p2v58ApplySearch();p2v58UpdateTotals();p2v510AttendanceNotice()
  };

  function p2v524SyncSelectors(b,date){
    p2v58EnsurePage();
    p2v58Course=p2v58CourseKey(b);p2v58Batch=b.id;p2v58Date=String(date);p2v58UploadLocked=true;

    const cf=$('p2v58Course'),courses=p2v58CourseOptions();
    if(cf)cf.innerHTML=courses.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===p2v58Course?'selected':'')+'>'+esc(c.name)+'</option>').join('');

    const bf=$('p2v58Batch'),batches=p2v58FilteredBatches();
    if(bf)bf.innerHTML=batches.map(x=>'<option value="'+x.id+'" '+(String(x.id)===String(b.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('');

    // A valid frozen printed sheet remains scannable even if that date was later
    // removed from the editable class schedule.
    const scheduled=p2v58Dates(b).slice(),dates=scheduled.includes(String(date))?scheduled:[String(date),...scheduled];
    const df=$('p2v58Date');
    if(df)df.innerHTML=dates.map(d=>'<option value="'+d+'" '+(d===String(date)?'selected':'')+'>'+esc(fmt(d))+(scheduled.includes(d)?'':' · PRINTED SHEET')+'</option>').join('');

    const dateOnly=$('p2v58DateOnly');if(dateOnly)dateOnly.textContent=fmt(String(date));
    $('p2v58UploadPanel')?.classList.remove('hidden');
    p2v58LockSelectors(true)
  }

  function p2v524BlankCurrentFullRoster(){
    p2v524ClearSession();
    p2v58Draft={};
    p2v518CurrentRowsBase().forEach(r=>p2v58Draft[r.en.id]=null);
    p2v524RenderRosterBase()
  }

  // Clear the protected scan review only when the user explicitly leaves/edits it.
  ['p2v58Manual','p2v58Edit','p2v58Unlock'].forEach(id=>$ (id)?.addEventListener('click',()=>{p2v524ClearSession()},true));
  ['p2v58Course','p2v58Batch','p2v58Date'].forEach(id=>$ (id)?.addEventListener('change',()=>{p2v524ClearSession()},true));

  p2v511ApplyPhotoBlob=async function(blob,name='Attendance photo',attendancePayload=''){
    const status=$('p2v58UploadStatus');
    if(status)status.textContent='Reading printed Sheet ID, four A4 corners and pen marks...';

    let prep;
    try{prep=await p2v518Prepare(blob)}
    catch(e){
      p2v524BlankCurrentFullRoster();
      if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Photo analysis failed')+'</span>';
      return
    }

    const raw=attendancePayload||prep.raw||'',data=p2v58ParsePayload(raw);
    if(!data||Number(data.v)!==5||data.layout!==P2V521_LAYOUT||!data.sheetId){
      p2v524BlankCurrentFullRoster();
      if(status)status.innerHTML='<span class="bad">This is not a current 30-name printed attendance QR. Print a fresh sheet or choose the correct photo.</span>';
      return
    }

    const b=state.classBatches.find(x=>String(x.id)===String(data.batchId));
    if(!b){
      p2v524BlankCurrentFullRoster();
      if(status)status.innerHTML='<span class="bad">The batch stored in this printed sheet is not available in this database.</span>';
      return
    }

    const snap=state.attendanceSheetSnapshots?.[String(data.sheetId)];
    if(!snap||snap.layout!==P2V521_LAYOUT||String(snap.batchId)!==String(data.batchId)||String(snap.date)!==String(data.date)){
      p2v524BlankCurrentFullRoster();
      if(status)status.innerHTML='<span class="bad">The exact frozen roster for Sheet ID '+esc(String(data.sheetId))+' is not available. No current-class names were substituted.</span>';
      return
    }

    const mapped=p2v518RowsForSnapshot(snap);
    if(mapped.missing.length){
      p2v524ClearSession();
      p2v58Draft={};
      if(status)status.innerHTML='<span class="bad">This printed sheet contains '+mapped.missing.length+' student record'+(mapped.missing.length===1?'':'s')+' that no longer map safely. Nothing from old attendance was reused.</span>';
      const host=$('p2v58Roster');if(host)host.innerHTML='<div class="p2-empty">Scan stopped safely. Reprint this sheet from the current database.</div>';
      p2v58UpdateTotals();
      return
    }

    // IMPORTANT ORDER: establish the frozen sheet BEFORE touching the selectors/UI.
    // This prevents p2v58Render() from loading the full current class or old statuses.
    p2v518ActiveSnapshot=snap;
    p2v518ActiveRows=mapped.out;
    p2v524ScanSession={snapshot:snap,rows:mapped.out,data};
    p2v524SyncSelectors(b,String(data.date));

    // Every scan starts with a completely clean sheet draft. No previous green
    // ticks or red absences can leak into machine detection.
    p2v58Draft={};
    p2v518ActiveRows.forEach(r=>p2v58Draft[r.en.id]=null);

    const det=p2v521Detect(prep,p2v518ActiveRows.length);
    if(!det.ok){
      p2v58RenderRoster();
      p2v511ShowReview(0,Number(data.sheet||1),Number(data.totalSheets||1),det.reason);
      if(status)status.innerHTML='<span class="bad">'+esc(det.reason)+'</span>';
      return
    }

    let present=0;const detected=[];
    p2v518ActiveRows.forEach((r,i)=>{
      const hit=!!det.marks[i]?.present;
      p2v58Draft[r.en.id]=hit?true:null;
      if(hit){
        present++;
        detected.push(String(p2v524DisplayNumber(r,i)).padStart(2,'0')+' '+(r.p.name||r.sheetRow?.name||'Unnamed'))
      }
    });

    p2v58RenderRoster();
    p2v511ShowReview(
      present,Number(data.sheet||1),Number(data.totalSheets||1),
      'Sheet ID '+String(data.sheetId)+' · only the '+p2v518ActiveRows.length+' names actually printed on this sheet are being reviewed. Detected: '+(detected.length?detected.join(', '):'none')+'.'
    );
    if(status)status.innerHTML='<span class="good"><b>Sheet analysed ✓</b> '+present+' mark'+(present===1?'':'s')+' detected. Old attendance was ignored; review before MARK REMAINING ABSENT.</span>';
    $('p2v58Roster')?.scrollIntoView({behavior:'smooth',block:'start'})
  };

  p2v58HandleUploadedFile=async function(file){await p2v511ApplyPhotoBlob(file,file.name||'Uploaded sheet','')};
  p2v58HandleDataUrl=async function(dataUrl,name='Phone photo',attendancePayload=''){
    try{
      const blob=await (await fetch(dataUrl)).blob();
      await p2v511ApplyPhotoBlob(blob,name,attendancePayload)
    }catch(e){
      p2v524BlankCurrentFullRoster();
      const status=$('p2v58UploadStatus');
      if(status)status.innerHTML='<span class="bad">'+esc(e.message||'Attendance photo could not be analysed')+'</span>'
    }
  };
'''
h=h.replace(marker,'\n'+patch+marker,1)
p.write_text(h,encoding='utf-8')
print('BETA 5.24 EXACT FROZEN-SHEET REVIEW APPLIED')

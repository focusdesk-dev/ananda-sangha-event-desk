from pathlib import Path

p=Path('src/index.html')
html=p.read_text(encoding='utf-8')
if 'PHASE2 BETA517 ATTENDANCE GENIUS' not in html:
    raise SystemExit('Beta 5.17 attendance marker missing')
if 'PHASE2 BETA517 ATTENDANCE REPORT' in html:
    print('Beta 5.17 attendance report already applied')
    raise SystemExit(0)
marker='\n\n    updateBackButton();'
if marker not in html:
    raise SystemExit('Renderer insertion marker not found')

patch=r'''
  // PHASE2 BETA517 ATTENDANCE REPORT
  let p2v517AttReport={course:'',batch:'',date:''};
  function p2v517ReportBatches(){
    let bs=state.classBatches.slice().sort((a,z)=>String(z.start||'').localeCompare(String(a.start||'')));
    if(p2v517AttReport.course)bs=bs.filter(b=>String(b.courseId||p2CourseName(b))===p2v517AttReport.course);
    return bs
  }
  function p2v517NormalizeReport(){
    let bs=p2v517ReportBatches();if(!bs.length){p2v517AttReport.batch='';p2v517AttReport.date='';return null}
    if(!bs.some(b=>String(b.id)===String(p2v517AttReport.batch)))p2v517AttReport.batch=bs[0].id;
    const b=state.classBatches.find(x=>String(x.id)===String(p2v517AttReport.batch))||bs[0],dates=p2v5ValidDates(b);
    if(p2v517AttReport.date&&!dates.includes(p2v517AttReport.date))p2v517AttReport.date='';
    return b
  }
  function p2v517OpenAttendanceReport(panel){
    const b=p2v517NormalizeReport();
    if(!b){panel.innerHTML='<button id="p2v54BackHome" class="btn secondary">← Back to Class Reports</button><div class="p2-empty" style="margin-top:14px">No class batches yet.</div>';$('p2v54BackHome').onclick=()=>p2v54ClassReportHome(panel);return}
    const courses=[...new Map(state.classBatches.map(x=>[String(x.courseId||p2CourseName(x)),p2CourseName(x)])).entries()].sort((a,z)=>a[1].localeCompare(z[1])),bs=p2v517ReportBatches(),dates=p2v5ValidDates(b),
      ers=state.classEnrollments.filter(e=>e.batchId===b.id).map(en=>({en,p:p2v5Person(en)})).sort((a,z)=>(a.p.name||'').localeCompare(z.p.name||'',undefined,{sensitivity:'base'})),
      specific=!!p2v517AttReport.date;
    let present=0,absent=0,blank=0,rows;
    if(specific){
      rows=ers.map((r,i)=>{const v=p2cAttendanceStatus(r.en,p2v517AttReport.date);if(v===true)present++;else if(v===false)absent++;else blank++;return{...r,i,v}})
    }else{
      rows=ers.map((r,i)=>{const a=p2v53AttendanceSummary(b,r.en);present+=a.present;absent+=a.absent;blank+=a.blank;return{...r,i,a}})
    }
    panel.innerHTML='<div class="p2v54-banner"><div><h2>Attendance Report</h2><p>Class attendance by course, batch and session date.</p></div><div class="p2v54-banner-actions"><button id="p2v54BackHome" class="btn secondary">← Back to Class Reports</button><button id="p2v517ExportAttendance" class="btn">Export Excel</button></div></div>'+
      '<div class="p2v54-filterbar" style="grid-template-columns:1fr 1.15fr 1fr"><div><label>Course</label><select id="p2v517AttCourse"><option value="">All Courses</option>'+courses.map(c=>'<option value="'+esc(c[0])+'" '+(c[0]===p2v517AttReport.course?'selected':'')+'>'+esc(c[1])+'</option>').join('')+'</select></div>'+
      '<div><label>Batch</label><select id="p2v517AttBatch">'+bs.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===b.id?'selected':'')+'>'+esc(p2CourseName(x))+' — '+esc(x.name)+'</option>').join('')+'</select></div>'+
      '<div><label>Session Date</label><select id="p2v517AttDate"><option value="">All Sessions</option>'+dates.map(d=>'<option value="'+d+'" '+(d===p2v517AttReport.date?'selected':'')+'>'+esc(fmt(d))+'</option>').join('')+'</select></div></div>'+
      '<div class="p2v54-kpis" style="grid-template-columns:repeat(5,minmax(120px,1fr))"><div class="p2v54-kpi blue"><span>Students</span><b>'+ers.length+'</b></div><div class="p2v54-kpi green"><span>Present</span><b>'+present+'</b></div><div class="p2v54-kpi red"><span>Absent</span><b>'+absent+'</b></div><div class="p2v54-kpi amber"><span>Unmarked</span><b>'+blank+'</b></div><div class="p2v54-kpi blue"><span>Sessions</span><b>'+dates.length+'</b></div></div>'+
      '<div class="p2v54-table-card"><div class="p2v54-table-head"><h3>'+esc(p2CourseName(b))+' — '+esc(b.name)+(specific?' · '+esc(fmt(p2v517AttReport.date)):'')+'</h3></div><div class="p2v54-table-wrap"><table class="p2v54-table"><thead><tr><th>#</th><th>Name</th><th>Mobile</th>'+(specific?'<th>Status</th>':'<th>Present</th><th>Absent</th><th>Unmarked</th><th>Total</th><th>Attendance %</th>')+'</tr></thead><tbody>'+
      rows.map((r,i)=>specific?'<tr><td>'+(i+1)+'</td><td><strong>'+esc(r.p.name||'Unnamed')+'</strong></td><td>'+esc(r.p.mobile||'—')+'</td><td><span class="p2v54-pill '+(r.v===true?'green':r.v===false?'red':'amber')+'">'+(r.v===true?'Present':r.v===false?'Absent':'Unmarked')+'</span></td></tr>':
        '<tr><td>'+(i+1)+'</td><td><strong>'+esc(r.p.name||'Unnamed')+'</strong></td><td>'+esc(r.p.mobile||'—')+'</td><td>'+r.a.present+'</td><td>'+r.a.absent+'</td><td>'+r.a.blank+'</td><td>'+r.a.total+'</td><td>'+r.a.pct+'%</td></tr>').join('')+
      '</tbody></table></div></div>';
    $('p2v54BackHome').onclick=()=>p2v54ClassReportHome(panel);
    $('p2v517AttCourse').onchange=e=>{p2v517AttReport.course=e.target.value;p2v517AttReport.batch='';p2v517AttReport.date='';p2v517OpenAttendanceReport(panel)};
    $('p2v517AttBatch').onchange=e=>{p2v517AttReport.batch=e.target.value;p2v517AttReport.date='';p2v517OpenAttendanceReport(panel)};
    $('p2v517AttDate').onchange=e=>{p2v517AttReport.date=e.target.value;p2v517OpenAttendanceReport(panel)};
    $('p2v517ExportAttendance').onclick=()=>v51RequireAdmin(()=>{
      const exportRows=specific?rows.map(r=>({Name:r.p.name,Mobile:r.p.mobile||'',Course:p2CourseName(b),Batch:b.name,Date:p2v517AttReport.date,Status:r.v===true?'Present':r.v===false?'Absent':'Unmarked'})):
        rows.map(r=>({Name:r.p.name,Mobile:r.p.mobile||'',Course:p2CourseName(b),Batch:b.name,Present:r.a.present,Absent:r.a.absent,Unmarked:r.a.blank,Total:r.a.total,Attendance_Percent:r.a.pct}));
      p2Csv(exportRows,'Ananda_Attendance_Report_'+String(b.name||'Batch').replaceAll(' ','_')+(specific?'_'+p2v517AttReport.date:'')+'.csv')
    },'export the Attendance Report')
  }

  p2v54ClassReportHome=function(panel){
    p2v54ClassReportView='home';
    panel.innerHTML='<div class="card-head"><div><h3>Class Reports</h3><div class="card-sub">Choose a class report. Reports open on screen first and can be exported.</div></div></div><div class="p2v54-report-home">'+
      '<button id="p2v54BatchReport" class="p2v54-report-choice"><strong>01 · Batch Report</strong><small>Roster, attendance totals, outcome, payment and next-level status.</small></button>'+
      '<button id="p2v517AttendanceReport" class="p2v54-report-choice"><strong>02 · Attendance Report</strong><small>Attendance by course, batch and session date.</small></button>'+
      '<button id="p2v54StudentList" class="p2v54-report-choice"><strong>03 · Student Progress List</strong><small>All students and their current class progression.</small></button>'+
      '<button id="p2v54Followup" class="p2v54-report-choice"><strong>04 · Follow-up & Outreach</strong><small>Students needing progression, repeat class or Kriya follow-up.</small></button>'+
      '<button id="p2v54Annual" class="p2v54-report-choice"><strong>05 · Annual Class Summary</strong><small>Year-wise class batches, enrolments and completions.</small></button></div>';
    $('p2v54BatchReport').onclick=()=>p2v54OpenBatchReport(panel);$('p2v517AttendanceReport').onclick=()=>p2v517OpenAttendanceReport(panel);$('p2v54StudentList').onclick=()=>p2v54OpenStudentList(panel);$('p2v54Followup').onclick=()=>p2v54OpenFollowup(panel);$('p2v54Annual').onclick=()=>p2v54OpenAnnual(panel)
  };
'''

html=html.replace(marker,'\n'+patch+marker,1)
p.write_text(html,encoding='utf-8')
print('BETA 5.17 ATTENDANCE REPORT APPLIED')

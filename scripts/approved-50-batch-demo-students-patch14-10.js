  // Patch 14.10: One-click, reversible 50-student demo data in the currently
  // opened Level 1 batch ONLY. No unsolicited data changes at installation.
  // All test records have an explicit marker; identical names get distinct
  // non-routable 10-digit dummy phone numbers, never somebody else's identity.
  window.anandaLevel1DemoStudentsVersion='14.10';
  const v150Marker='ANANDA_DEMO_50_STUDENTS_V1';
  const v150First=['Aarav','Aanya','Aditya','Anaya','Arjun','Avni','Dev','Diya',
    'Ishaan','Isha','Kabir','Kavya','Krish','Meera','Nikhil','Riya',
    'Rohan','Sara','Tara','Vihaan','Aditi','Ansh','Bhavya','Gauri',
    'Harsh','Jiya','Kunal','Maya','Neel','Nisha','Om','Pihu',
    'Rashi','Samar'];
  const v150Last=['Sharma','Mehta','Kapoor','Gupta','Malhotra','Arora','Sethi',
    'Bansal','Khanna','Chopra','Jain','Verma','Kohli','Saxena'];
  function v150BatchIsLevel1(batch){
    return !!batch&&normName(p2CourseName(batch))===normName('Level 1');
  }
  function v150Rows(batch){
    return state.classEnrollments.filter(e=>e.__anandaDemoSet===v150Marker&&e.batchId===batch.id);
  }
  function v150DemoCandidates(batch){
    const students=[],enrolments=[];
    const amount=String(batch.courseFee??'').replace(/[,₹\s]/g,'');
    const fee=Number(amount);
    if(!amount||!Number.isFinite(fee)||fee<=0)
      throw Error('Set a positive course fee on this Level 1 batch first, so the PAID and UNPAID sample payments are valid.');
    const phones=new Set([
      ...state.students.map(s=>normMobile(s.mobile)),
      ...state.volunteers.map(v=>normMobile(v.mobile)),
      ...state.attendeeMaster.flatMap(a=>[normMobile(a.mobile),normMobile(a.personalMobile)]),
      ...state.kriyabans.map(k=>normMobile(k.mobile)),
      ...state.classEnrollments.map(e=>normMobile(e.personMobile))
    ].filter(Boolean));
    for(let i=0;i<50;i++){
      // First 32 entries = 16 same-name pairs, all with DISTINCT mobiles.
      // Last 18 entries = distinct names. All entries begin with TEST.
      const nameIndex=i<32?Math.floor(i/2):16+(i-32);
      const first=v150First[nameIndex],last=v150Last[nameIndex%v150Last.length];
      const phone=String(1000090000+i);
      if(!first||phones.has(phone))
        throw Error('Test phone '+phone+' already belongs to a record. No students were added.');
      const name='TEST '+first+' '+last;
      const personId=uid('qa50stu'),enrolmentId=uid('qa50enr');
      const student={
        id:personId,cloudId:uid('sync'),createdAt:new Date().toISOString(),
        name,mobile:phone,kriyaDate:'',kriyaYear:'',
        notes:'TEST DATA — one-click batch demo; removable together',
        __anandaDemoSet:v150Marker,__anandaDemoBatchId:batch.id,
        __anandaDemoMasterFirst:i<10
      };
      const paid=i<20;
      const mode=paid?['Cash','UPI','Bank Transfer','Card'][i%4]:'';
      const enrollment={
        id:enrolmentId,studentId:personId,batchId:batch.id,
        courseId:batch.courseId,courseName:p2CourseName(batch),level:'Level 1',
        enrolledAt:today(),attendance:{},outcome:'Enrolled',completionDate:'',
        progressedDate:'',paymentStatus:paid?'Paid':'Unpaid',
        paymentDate:paid?today():'',paymentMode:mode,
        feeAmount:String(fee),
        __anandaDemoSet:v150Marker,__anandaDemoBatchId:batch.id
      };
      students.push(student);enrolments.push(enrollment);
      phones.add(phone);
    }
    return{students,enrolments};
  }
  function v150SeedDemo(){
    const batch=p2ActiveBatch();
    if(!v150BatchIsLevel1(batch)){
      toast('Open your intended Level 1 batch first. Nothing was added.');
      return;
    }
    if(v150Rows(batch).length){
      toast('Test students already exist in this batch; no duplicates added.');
      return;
    }
    let generated;
    try{generated=v150DemoCandidates(batch)}
    catch(err){toast(String(err.message||err));return}
    // Refuse the operation if any previous demo people exist elsewhere.
    // NEVER auto-merge test phones with existing genuine Master identities.
    if(state.students.some(s=>s.__anandaDemoSet===v150Marker)){
      toast('Another demo set is present. Remove it from its original batch first.');
      return;
    }
    const previousStorage=localStorage.getItem(KEY);
    const previousStudents=state.students.slice();
    const previousEnrollments=state.classEnrollments.slice();
    try{
      // These first 10 were seeded into Master before their class enrolments,
      // exercising the Master-to-Class link with new and repeated names.
      state.students.push(...generated.students.slice(0,10));
      state.students.push(...generated.students.slice(10));
      state.classEnrollments.push(...generated.enrolments);
      if(v150Rows(batch).length!==50)throw Error('The 50 enrolments did not match the selected batch.');
      save();
      v150MountDemoAction();
      const persisted=JSON.parse(localStorage.getItem(KEY)||'{}');
      const got=(persisted.classEnrollments||[]).filter(e=>e.__anandaDemoSet===v150Marker&&e.batchId===batch.id);
      const masterIds=new Set((persisted.students||[]).filter(s=>s.__anandaDemoSet===v150Marker&&s.__anandaDemoBatchId===batch.id).map(s=>s.id));
      if(got.length!==50||masterIds.size!==50||got.some(e=>!masterIds.has(e.studentId)))
        throw Error('Could not verify all 50 linked records after saving');
      toast('50 TEST students saved in this Level 1 batch');
    }catch(err){
      // Restore both the in-memory app and persisted data after any failure.
      state.students=previousStudents;state.classEnrollments=previousEnrollments;
      if(previousStorage===null)localStorage.removeItem(KEY);
      else localStorage.setItem(KEY,previousStorage);
      try{renderAll()}catch{}
      toast('Test data was not added: '+String(err.message||err));
    }
  }
  function v150RemoveDemo(){
    const batch=p2ActiveBatch();
    if(!v150BatchIsLevel1(batch))return;
    const own=v150Rows(batch);
    if(!own.length)return;
    if(!window.confirm('Remove '+own.length+' TEST enrolments and their unlinked TEST Master records from this batch? Real students will not be changed.'))return;
    const previousStorage=localStorage.getItem(KEY);
    const previousStudents=state.students.slice(),previousEnrollments=state.classEnrollments.slice();
    const previousOutreach=state.outreach.slice();
    try{
      const ids=new Set(own.map(e=>e.id));
      const testStudentIds=new Set(state.students.filter(s=>s.__anandaDemoSet===v150Marker&&s.__anandaDemoBatchId===batch.id).map(s=>s.id));
      state.classEnrollments=state.classEnrollments.filter(e=>!ids.has(e.id));
      const retain=new Set(state.classEnrollments.map(e=>e.studentId));
      state.students=state.students.filter(s=>{
        if(!testStudentIds.has(s.id))return true;
        // If a TEST student was used in another batch or linked to genuine
        // records during manual testing, keep that Master record.
        return retain.has(s.id)||!!(s.volunteerId||s.attendeeId||s.kriyabanId||s.acharyaId);
      });
      const removedIds=new Set(previousStudents.filter(s=>testStudentIds.has(s.id)&&!state.students.some(y=>y.id===s.id)).map(s=>s.id));
      state.outreach=state.outreach.filter(o=>!removedIds.has(o.studentId));
      save();
      v150MountDemoAction();
      toast('Removed '+ids.size+' TEST enrolments; all real records preserved');
    }catch(err){
      state.students=previousStudents;state.classEnrollments=previousEnrollments;state.outreach=previousOutreach;
      if(previousStorage===null)localStorage.removeItem(KEY);
      else localStorage.setItem(KEY,previousStorage);
      try{renderAll()}catch{}
      toast('Could not remove test data: '+String(err.message||err));
    }
  }
  function v150MountDemoAction(){
    const batch=p2ActiveBatch(),enrolButton=$('p2EnrollStudent');
    if(!v150BatchIsLevel1(batch)||!enrolButton)return;
    // The frozen batch header has no .actions container. Keep the user-approved
    // header unchanged; put the optional demo-data action beside ENROL STUDENT.
    const actions=enrolButton.parentElement;
    if(!actions)return;
    let btn=actions.querySelector('#v150DemoButton');
    if(!btn){
      btn=document.createElement('button');
      btn.id='v150DemoButton';btn.type='button';
      btn.className='btn secondary small';
      enrolButton.insertAdjacentElement('afterend',btn);
    }
    const hasTest=v150Rows(batch).length>0;
    btn.textContent=hasTest?'REMOVE TEST STUDENTS':'ADD 50 TEST STUDENTS';
    btn.title=hasTest?'Remove only tagged demo records':'Add 50 fictional students to THIS open Level 1 batch (20 Paid, 30 Unpaid)';
    btn.onclick=hasTest?v150RemoveDemo:v150SeedDemo;
  }
  const v150ClassWorkspaceBase=p2RenderClassWorkspace;
  p2RenderClassWorkspace=function(){
    const result=v150ClassWorkspaceBase.apply(this,arguments);
    v150MountDemoAction();
    return result;
  };
  const v150SwitchPageBase=switchPage;
  switchPage=function(){
    const result=v150SwitchPageBase.apply(this,arguments);
    if(arguments[0]==='classWorkspace')v150MountDemoAction();
    return result;
  };
  if(document.getElementById('classWorkspace')?.classList.contains('active'))v150MountDemoAction();

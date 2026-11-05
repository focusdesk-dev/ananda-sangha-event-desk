'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
function check(label,ok){assert.ok(ok,label);console.log('PASS '+label)}
check('Review dialog has Accept and Cancel',html.includes('<button class="btn" type="submit">Accept</button>')&&html.includes('Notes (optional)'));
check('Review notes are optional',!html.includes('id="p2v557ReviewReason" required')&&!html.includes("if(!acharya||!reason)"));
check('Exception allows empty reason when properly approved',html.includes("!a.approvedBy)return false"));
check('Reviewer identity is attributed to authenticated admin',html.includes("approvedBy:'administrator'")&&html.includes("v51RequireAdmin(()=>{"));
check('Level 1 review uses eligible prior records rather than first match',html.includes('const candidates=p2StudentEnrollments(student.id).filter(e=>{'));
check('Acharya cannot be added as student by mobile match',html.includes("const acharyaConflict=state.acharyas.find"));
check('Student cannot be added as Acharya by mobile match',html.includes("const studentConflict=state.students.find"));
check('Enrolment rejects existing Acharya identities',html.includes('This person is already registered as an Acharya.'));
check('Free batch payment label is N.A.',html.includes("if(p2v563FreeBatch(b))return 'N.A.'"));
check('Free class does not demand a payment method',html.includes("const paid=!free&&$('p2v514PaymentStatus')?.value==='Paid'"));
check('Free class excluded from unpaid batch count',html.includes("p2v563PaymentLabel(r.en,r.b||b)==='Unpaid'"));
check('Student Wise search updates results without replacing input',html.includes("list.innerHTML=p2v526Search.trim()?matches.map(x=>")&&!html.includes("p2v520History='';p2v526StudentWise(body);"));
console.log('PASS 12 scoped Beta 5.63 source acceptance checks');

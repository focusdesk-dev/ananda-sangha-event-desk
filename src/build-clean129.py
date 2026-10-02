from pathlib import Path
import binascii, hashlib

path = Path('src/index.html')
text = path.read_bytes().decode('utf-8')

# 1) Linked volunteer is a reference only when family/guests register.
old = """  const v43RegistrationSubmitBefore=$('v36RegistrationForm').onsubmit;\n  $('v36RegistrationForm').onsubmit=function(event){const isNew=!v36RegistrationEditKey,type=$('v36RegistrationType').value,volunteerId=$('v36RegistrationVolunteer').value;v43RegistrationSubmitBefore(event);if(isNew&&type==='volunteer-family'&&volunteerId&&!$('v36RegistrationModal').classList.contains('open')){const volunteer=state.volunteers.find(item=>item.id===volunteerId);if(volunteer){ensureVolunteerRoster(volunteer,state.activeEventId,$('workingDate').value,'counter');save()}}};"""
new = """  const v43RegistrationSubmitBefore=$('v36RegistrationForm').onsubmit;\n  // A volunteer linked to family/guests is a reference only. Do not add that volunteer to the event roster automatically.\n  $('v36RegistrationForm').onsubmit=function(event){return v43RegistrationSubmitBefore.call(this,event)};"""
if old not in text: raise SystemExit('Could not patch linked-volunteer registration rule')
text = text.replace(old, new, 1)

# 2) Volunteer Participation means assigned or checked-in, not merely linked/registered.
old = "volunteerIds=new Set([...allEventVolunteerRegistrations().map(r=>r.volunteerId),...Object.entries(state.volunteerRosters).filter(([key])=>key.startsWith(ev.id+'|')).flatMap(([,ids])=>ids)]),checkedVolunteerIds="
new = "volunteerIds=new Set([...Object.entries(state.volunteerRosters).filter(([key])=>key.startsWith(ev.id+'|')).flatMap(([,ids])=>ids),...Object.entries(state.daily).filter(([key])=>key.startsWith(ev.id+'|')).flatMap(([,ids])=>ids)]),checkedVolunteerIds="
if old not in text: raise SystemExit('Could not patch Volunteer Participation record')
text = text.replace(old, new, 1)
old = "volunteerIds=new Set([...allEventVolunteerRegistrations().map(record=>record.volunteerId),...Object.entries(state.volunteerRosters).filter(([key])=>key.startsWith(event.id+'|')).flatMap(([,ids])=>ids)]),volunteers="
new = "volunteerIds=new Set([...Object.entries(state.volunteerRosters).filter(([key])=>key.startsWith(event.id+'|')).flatMap(([,ids])=>ids),...Object.entries(state.daily).filter(([key])=>key.startsWith(event.id+'|')).flatMap(([,ids])=>ids)]),volunteers="
if old not in text: raise SystemExit('Could not patch report Volunteer Participation')
text = text.replace(old, new, 1)

# 3) + opens Add/New and automatically puts the cursor in the useful first field.
old = """        const map={volunteers:'addVolunteer',attendeeMaster:'addAttendeeMaster',kriyabans:'addKriyaban',vips:'addVip',daily:'v48AddVolunteer',checkin:'v36NewRegistration',register:'v36NewRegistration'};\n        const button=$(map[page]);\n        if(button){button.click();return true}\n        return false;"""
new = """        const map={volunteers:'addVolunteer',attendeeMaster:'addAttendeeMaster',kriyabans:'addKriyaban',vips:'addVip',daily:'v48AddVolunteer',checkin:'v36NewRegistration',register:'v36NewRegistration'};\n        const focusMap={volunteers:'volunteerFirstName',attendeeMaster:'attendeeMasterName',kriyabans:'kriyabanName',vips:'vipName',daily:'volunteerFirstName',checkin:'v36MainName',register:'v36MainName'};\n        const button=$(map[page]);\n        if(button){const currentPage=page;button.click();setTimeout(()=>$(focusMap[currentPage])?.focus(),90);return true}\n        return false;"""
if old not in text: raise SystemExit('Could not patch Add shortcut focus')
text = text.replace(old, new, 1)

old = """        modal.querySelectorAll('.prod-permanent-add').forEach(button=>button.onclick=()=>{\n          modal.classList.remove('open');\n          switchPage(button.dataset.page);\n          setTimeout(()=>$(button.dataset.button)?.click(),30);\n        });"""
new = """        modal.querySelectorAll('.prod-permanent-add').forEach(button=>button.onclick=()=>{\n          modal.classList.remove('open');\n          switchPage(button.dataset.page);\n          const firstField={volunteers:'volunteerFirstName',attendeeMaster:'attendeeMasterName',kriyabans:'kriyabanName',vips:'vipName'}[button.dataset.page];\n          setTimeout(()=>{ $(button.dataset.button)?.click(); setTimeout(()=>$(firstField)?.focus(),70); },30);\n        });"""
if old not in text: raise SystemExit('Could not patch permanent chooser focus')
text = text.replace(old, new, 1)

# 4) Esc = Back; close an open modal first; do not steal Esc from an open suggestion list.
old = """      document.addEventListener('keydown',event=>{\n        if(event.defaultPrevented||event.isComposing)return;\n        const key=String(event.key||'').toLowerCase();\n        const code=String(event.code||'');\n        const keyCode=Number(event.keyCode||event.which||0);\n        const save=event.altKey&&!event.ctrlKey&&!event.metaKey&&key==='s';\n        const plus=!event.altKey&&!event.ctrlKey&&!event.metaKey&&(event.key==='+'||code==='NumpadAdd'||keyCode===107||((code==='Equal'||keyCode===187||event.key==='=')&&event.shiftKey));\n        if(!save&&!plus)return;\n        event.preventDefault();\n        event.stopImmediatePropagation();\n        runShortcut(save?'save':'add');\n      },true);"""
new = """      document.addEventListener('keydown',event=>{\n        if(event.defaultPrevented||event.isComposing)return;\n        const key=String(event.key||'').toLowerCase();\n        const code=String(event.code||'');\n        const keyCode=Number(event.keyCode||event.which||0);\n        if(key==='escape'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){\n          if(document.querySelector('.v43-suggestions:not(.hidden), #v50VipSuggestions:not(.hidden), #v86AttendeeSuggestions:not(.hidden)'))return;\n          const modals=[...document.querySelectorAll('.modal-backdrop.open')];\n          if(modals.length){\n            event.preventDefault();event.stopImmediatePropagation();\n            const modal=modals[modals.length-1];\n            const close=modal.querySelector('[data-close], .x, [id*=\"Close\"], [id*=\"Cancel\"]');\n            if(close&&typeof close.click==='function')close.click();else modal.classList.remove('open');\n            return;\n          }\n          const back=$('backButton');\n          if(back&&!back.classList.contains('hidden')){event.preventDefault();event.stopImmediatePropagation();back.click()}\n          return;\n        }\n        const save=event.altKey&&!event.ctrlKey&&!event.metaKey&&key==='s';\n        const plus=!event.altKey&&!event.ctrlKey&&!event.metaKey&&(event.key==='+'||code==='NumpadAdd'||keyCode===107||((code==='Equal'||keyCode===187||event.key==='=')&&event.shiftKey));\n        if(!save&&!plus)return;\n        event.preventDefault();\n        event.stopImmediatePropagation();\n        runShortcut(save?'save':'add');\n      },true);"""
if old not in text: raise SystemExit('Could not patch Esc/keyboard block')
text = text.replace(old, new, 1)

# 5) Volunteer Enter flow: first/last name -> mobile -> birthday.
marker = """      document.querySelectorAll('form button[type=\"submit\"]').forEach(button=>button.title='Save • Alt+S');"""
flow = """      const prodVolunteerFirst=$('volunteerFirstName'),prodVolunteerLast=$('volunteerLastName'),prodVolunteerMobile=$('volunteerMobile'),prodVolunteerBirthday=$('volunteerBirthday');\n      if(prodVolunteerFirst&&!prodVolunteerFirst.dataset.prodEnterFlow){\n        prodVolunteerFirst.dataset.prodEnterFlow='1';\n        prodVolunteerFirst.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();event.stopPropagation();const value=prodVolunteerFirst.value.trim();if(value.includes(' ')&&!prodVolunteerLast.value.trim()){const parts=value.split(/\\s+/);prodVolunteerFirst.value=parts.shift()||'';prodVolunteerLast.value=parts.join(' ');prodVolunteerMobile?.focus();return}if(prodVolunteerLast?.value.trim())prodVolunteerMobile?.focus();else prodVolunteerLast?.focus()});\n        prodVolunteerLast?.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();event.stopPropagation();prodVolunteerMobile?.focus()});\n        prodVolunteerMobile?.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.altKey||event.ctrlKey||event.metaKey)return;event.preventDefault();event.stopPropagation();prodVolunteerBirthday?.focus()});\n      }\n\n""" + marker
if marker not in text: raise SystemExit('Could not patch volunteer Enter flow')
text = text.replace(marker, flow, 1)

text = text.replace("document.title='ANANDA SANGHA GURGAON Event Desk — Production 1.0.127';", "document.title='ANANDA SANGHA GURGAON Event Desk — Production 1.0.129';", 1)

path.write_bytes(text.encode('utf-8'))
raw = path.read_bytes()
expected_size = 491414
expected_crc = 0xed7c3111
expected_sha = '4737255254f9f1d0951f5365944049d15c4c97434c1be16fbb8ed394bcaf72d9'
if len(raw) != expected_size: raise SystemExit(f'Clean HTML size mismatch: {len(raw)}')
if (binascii.crc32(raw) & 0xffffffff) != expected_crc: raise SystemExit('Clean HTML CRC mismatch')
if hashlib.sha256(raw).hexdigest() != expected_sha: raise SystemExit('Clean HTML SHA mismatch')
print('BUILT CLEAN 1.0.129 HTML:', len(raw), 'bytes')

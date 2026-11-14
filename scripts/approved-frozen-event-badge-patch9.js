  // PATCH 9 — Four event tabs, scoped check-in, single back, section title.
  // All DOM changes are scoped to event pages. Existing sidebar and Classes remain untouched.
  window.anandaFrozenPatchVersion='9';
  let v6BadgeFilter='all',v6BadgeQuery='',v6VolPickerQuery='',v6VolPickerOpen=false;
  let v6EventQuery='',v6EventStatus='all',v6EventTab='record';
  const v6EventPages=new Set(['events','eventWorkspace','eventRecord','daily','register','checkin','items']);
  const v6BadgeAvailable=v=>v?.badgeAvailable===true;

  function v6RegisteredVolunteerIds(eventId=state.activeEventId){
    if(!eventId)return[];
    ensureV36State();
    const ids=new Set((state.volunteerRegistrations||[]).filter(r=>r.eventId===eventId).map(r=>r.volunteerId));
    // Legacy registrations were stored as day rosters before master registrations existed.
    Object.entries(state.volunteerRosters||{}).forEach(([key,values])=>{
      if(key.startsWith(eventId+'|')&&Array.isArray(values))values.forEach(id=>ids.add(id));
    });
    return [...ids].filter(id=>state.volunteers.some(v=>v.id===id));
  }
  // An old day's print state must never undo a badge that was printed in a
  // different year; the volunteer master is authoritative.
  v72BadgeState=function(){
    const key=v72BadgeKey(),roster=v6RegisteredVolunteerIds(),printedIds=roster.filter(id=>
      v6BadgeAvailable(state.volunteers.find(v=>v.id===id)));
    const saved=state.badgePrint[key]||{};
    saved.printedIds=printedIds;saved.complete=printedIds.length===roster.length;
    saved.masterSeeded=true;state.badgePrint[key]=saved;
    return {key,roster,saved};
  };
  function v6SetBadge(id,available){
    const v=state.volunteers.find(v=>v.id===id);
    if(!v)return false;
    v.badgeAvailable=available;
    Object.values(state.badgePrint||{}).forEach(entry=>{
      if(!entry||!Array.isArray(entry.printedIds))return;
      entry.printedIds=available?[...new Set([...entry.printedIds,id])]:
        entry.printedIds.filter(value=>value!==id);
      entry.masterSeeded=true;entry.complete=false;
    });
    save();
    return true;
  }
  function v6BadgeRows(){
    return v6RegisteredVolunteerIds().map(id=>state.volunteers.find(v=>v.id===id))
      .filter(Boolean).sort((a,b)=>volName(a).localeCompare(volName(b),undefined,{sensitivity:'base'}));
  }
  function v6BadgeCounts(){
    const rows=v6BadgeRows(),available=rows.filter(v6BadgeAvailable).length;
    return {required:rows.length,available,toPrint:rows.length-available};
  }
  function v6VisibleBadgeRows(){
    const q=v6BadgeQuery.trim().toLowerCase();
    return v6BadgeRows().filter(v=>
      (v6BadgeFilter==='all'||(v6BadgeFilter==='available')===v6BadgeAvailable(v))&&
      (!q||[volName(v),v.mobile].join(' ').toLowerCase().includes(q)));
  }
  function v6BadgePanel(){
    const panel=$('v72BadgePanel');if(!panel)return;
    if(!$('v6BadgeRoot')){
      const root=document.createElement('div');
      root.id='v6BadgeRoot';
      panel.append(root);
    }
    const root=$('v6BadgeRoot');
    const counts=v6BadgeCounts();
    const rows=v6VisibleBadgeRows();
    root.innerHTML='<div class="v6-badge-counters">'+
      '<div class="v6-badge-counter"><strong id="v6Required">'+counts.required+'</strong><span>REQUIRED</span></div>'+
      '<div class="v6-badge-counter"><strong id="v6Available">'+counts.available+'</strong><span>AVAILABLE</span></div>'+
      '<div class="v6-badge-counter v6-badge-pending"><strong id="v6ToPrint">'+counts.toPrint+'</strong><span>TO PRINT</span></div></div>'+
      '<div class="v6-badge-tools"><div id="v6BadgeFilters" class="v6-badge-filters">'+
        [['all','ALL'],['available','AVAILABLE'],['print','TO PRINT']].map(pair=>
          '<button type="button" data-filter="'+pair[0]+'" class="'+(v6BadgeFilter===pair[0]?'active':'')+'">'+pair[1]+'</button>').join('')+
      '</div><div class="v6-badge-actions">'+
        '<button type="button" id="v6PrintBadges" class="btn secondary">▣ PRINT</button>'+
        '<button type="button" id="v6ExportBadges" class="btn secondary">⇩ EXPORT</button>'+
      '</div></div>'+
      '<input type="search" class="search" id="v6BadgeSearch" placeholder="Search name or mobile" value="'+esc(v6BadgeQuery)+'">'+
      '<div class="v6-badge-table"><table><thead><tr><th>VOLUNTEER</th><th>BADGE STATUS</th></tr></thead><tbody>'+
      (rows.length?rows.map(v=>
        '<tr data-volunteer-id="'+esc(v.id)+'"><td><strong>'+esc(volName(v))+'</strong><small>'+esc(v.mobile||'')+'</small></td>'+
        '<td><label class="v6-badge-label"><input type="checkbox" class="v6-badge-check" data-id="'+esc(v.id)+'" '+
        (v6BadgeAvailable(v)?'checked':'')+'><span>'+
        (v6BadgeAvailable(v)?'Badge Available':'To Print')+'</span></label></td></tr>').join(''):
        '<tr><td colspan="2" class="v6-badge-empty">No registered volunteers match this list.</td></tr>')+
      '</tbody></table></div>';
    root.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{
      v6BadgeFilter=button.dataset.filter;v6BadgePanel();
    });
    root.querySelectorAll('.v6-badge-check').forEach(input=>input.onchange=()=>{
      v6SetBadge(input.dataset.id,input.checked);v6BadgePanel();
    });
    const search=$('v6BadgeSearch');
    search.oninput=()=>{const start=search.selectionStart;v6BadgeQuery=search.value;v6BadgePanel();
      const fresh=$('v6BadgeSearch');fresh?.focus();fresh?.setSelectionRange(start,start)};
    $('v6ExportBadges').onclick=()=>{
      const rows=[['Event','Event day','Volunteer','Mobile','Badge Status']].concat(
        v6BadgeRows().map(v=>[activeEvent()?.name||'',$('workingDate').value,volName(v),v.mobile||'',
          v6BadgeAvailable(v)?'Available':'To Print']));
      download('ananda-badge-preparation-'+($('workingDate').value||'event')+'.csv',csv(rows),'text/csv;charset=utf-8');
    };
    $('v6PrintBadges').onclick=()=>v6OpenPrintFlow();
  }
  function v6OpenPrintFlow(){
    const pending=v6BadgeRows().filter(v=>!v6BadgeAvailable(v));
    if(!pending.length){toast('No registered volunteer badges to print');return}
    let modal=$('v6PrintConfirm');
    if(!modal){
      modal=document.createElement('div');modal.id='v6PrintConfirm';modal.className='modal-backdrop';
      modal.innerHTML='<div class="modal" style="max-width:620px">'+
        '<div class="modal-head"><h3>PRINT NAME BADGES</h3>'+
        '<button id="v6ClosePrint" class="x" type="button">×</button></div>'+
        '<p id="v6PrintSummary" class="card-sub"></p>'+
        '<div id="v6PrintNames" style="max-height:240px;overflow:auto;margin:12px 0"></div>'+
        '<p style="font-size:12px;color:#46536b">After printing, confirm the physical badges are ready. Only then are they permanently marked Available for future years.</p>'+
        '<div class="actions" style="margin-top:17px;gap:9px">'+
        '<button id="v6PrintOpenDialog" class="btn secondary" type="button">OPEN PRINT DIALOG</button>'+
        '<button id="v6PrintMarkAvailable" class="btn" type="button">MARK PRINTED & AVAILABLE</button>'+
        '<button id="v6PrintCancel" class="btn ghost" type="button">CANCEL</button>'+
        '</div></div>';
      document.body.append(modal);
      const close=()=>modal.classList.remove('open');
      $('v6ClosePrint').onclick=$('v6PrintCancel').onclick=close;
    }
    $('v6PrintSummary').textContent=pending.length+' BADGE(S) TO PRINT FOR '+(activeEvent()?.name||'EVENT');
    $('v6PrintNames').innerHTML=pending.map(v=>'<div style="padding:7px 10px;border-bottom:1px solid #ddd">'+
      esc(volName(v))+' · '+esc(v.mobile||'')+'</div>').join('');
    modal.classList.add('open');
    $('v6PrintOpenDialog').onclick=async()=>{
      const html='<!doctype html><html><head><meta charset="utf-8"><title>Badges to Print</title>'+
        '<style>body{font:16px Arial;padding:20px}li{padding:12px;border-bottom:1px solid #ddd}</style>'+
        '</head><body><h2>'+esc(activeEvent()?.name||'Event')+' — BADGES TO PRINT</h2><ol>'+
        pending.map(v=>'<li>'+esc(volName(v))+' · '+esc(v.mobile||'')+'</li>').join('')+'</ol></body></html>';
      if(window.anandaDesktop?.printHtml){
        const response=await window.anandaDesktop.printHtml(html);
        if(!response?.ok)toast(response?.error||'Printing could not be opened');
      }else{
        const popup=window.open('','_blank','width=700,height=700');
        if(!popup){toast('Allow printing pop-ups');return}
        popup.document.write(html);popup.document.close();popup.focus();popup.print();
      }
    };
    $('v6PrintMarkAvailable').onclick=()=>{
      if(!confirm('Confirm '+pending.length+' name badges have been physically printed and are available for all future events?'))return;
      pending.forEach(v=>{v.badgeAvailable=true});
      save();modal.classList.remove('open');v6BadgePanel();
      toast(pending.length+' badges permanently available across all events and years');
    };
  }

  const v6BadgeRenderBefore=renderItems;
  renderItems=function(){
    const result=v6BadgeRenderBefore.apply(this,arguments);
    v6BadgePanel();
    v6UpdateLayout();
    return result;
  };

  function v6VolunteerPicker(){
    let modal=$('v6VolunteerPicker');
    if(!modal){
      modal=document.createElement('div');modal.id='v6VolunteerPicker';
      modal.className='modal-backdrop';
      modal.innerHTML='<div class="modal v6-vol-modal">'+
        '<div class="modal-head"><h3>ADD VOLUNTEER TO EVENT</h3><button type="button" class="x" id="v6CloseVolunteer">×</button></div>'+
        '<input id="v6MasterSearch" class="search" type="search" placeholder="Search Volunteer Master by name or mobile">'+
        '<div id="v6MasterVolunteerList"></div>'+
        '<div class="v6-picker-footer"><button id="v6AddNewMaster" type="button" class="btn secondary">ADD NEW VOLUNTEER</button>'+
        '<button id="v6DismissPicker" type="button" class="btn ghost">CANCEL</button></div></div>';
      document.body.append(modal);
      $('v6CloseVolunteer').onclick=$('v6DismissPicker').onclick=()=>{
        modal.classList.remove('open');v6VolPickerOpen=false;
      };
      $('v6AddNewMaster').onclick=()=>{
        modal.classList.remove('open');v6VolPickerOpen=false;
        $('v48AddVolunteer')?.click();
      };
      $('v6MasterSearch').oninput=e=>{v6VolPickerQuery=e.target.value;v6PaintVolunteerPicker()};
    }
    v6VolPickerOpen=true;v6VolPickerQuery='';
    $('v6MasterSearch').value='';
    modal.classList.add('open');v6PaintVolunteerPicker();$('v6MasterSearch').focus();
  }
  function v6PaintVolunteerPicker(){
    const host=$('v6MasterVolunteerList');if(!host)return;
    const query=v6VolPickerQuery.toLowerCase().trim(),registered=new Set(v6RegisteredVolunteerIds());
    const list=state.volunteers.filter(v=>!query||[volName(v),v.mobile].join(' ').toLowerCase().includes(query))
      .sort((a,b)=>volName(a).localeCompare(volName(b),undefined,{sensitivity:'base'})).slice(0,80);
    host.innerHTML=list.length?list.map(v=>
      '<div class="v6-picker-row"><div><strong>'+esc(volName(v))+'</strong><small>'+esc(v.mobile||'')+'</small></div>'+
      (registered.has(v.id)?'<span class="v6-already">REGISTERED</span>':
      '<div><button class="btn secondary v6-assign-only" type="button" data-id="'+esc(v.id)+'">SAVE VOLUNTEER</button>'+
      '<button class="btn v6-assign-checkin" type="button" data-id="'+esc(v.id)+'">SAVE & CHECK IN TODAY</button></div>')+
      '</div>').join(''):'<div class="v6-picker-empty">No match. Select ADD NEW VOLUNTEER below.</div>';
    host.querySelectorAll('.v6-assign-only,.v6-assign-checkin').forEach(button=>button.onclick=()=>{
      const volunteer=state.volunteers.find(v=>v.id===button.dataset.id);
      const event=activeEvent(),date=$('workingDate').value;
      if(!volunteer||!event||!date){toast('Select an event and event day');return}
      // One permanent person, one registration per event. Each event has its
      // own separate attendance; assigning alone never checks in.
      if(button.classList.contains('v6-assign-checkin')){
        v36RosterOnly=false;
        ensureVolunteerCheckin(volunteer,event.id,date,'counter');
      }else{
        ensureVolunteerRoster(volunteer,event.id,date,'counter');
      }
      $('v6VolunteerPicker').classList.remove('open');v6VolPickerOpen=false;
      save();v5RenderVolunteerUI();
      toast(volName(volunteer)+(button.classList.contains('v6-assign-checkin')?' checked in':' registered for this event'));
    });
  }
  const v6InitVolunteerPicker=()=>{
    const add=$('v5AddVolunteer');
    if(add)add.onclick=v6VolunteerPicker;
  };
  v6InitVolunteerPicker();

  function v6EventsShell(){
    let nav=$('v6EventTabs');
    if(nav)return nav;
    nav=document.createElement('div');nav.id='v6EventTabs';
    const target=document.querySelector('main .topbar')||document.querySelector('.topbar');
    target?.insertAdjacentElement('afterend',nav);
    const tabs=[['record','EVENT RECORD'],['volunteers','VOLUNTEERS'],['attendees','ATTENDEES'],
      ['items','BADGE & SCARF']];
    nav.innerHTML=tabs.map(pair=>'<button type="button" class="v6-event-tab" data-v6-tab="'+pair[0]+'">'+pair[1]+'</button>').join('');
    nav.querySelectorAll('button').forEach(button=>button.onclick=()=>{
      const name=button.dataset.v6Tab;v6EventTab=name;
      if(name==='record')switchPage('eventWorkspace');
      else if(name==='volunteers')switchPage('daily');
      else if(name==='attendees')switchPage('register');
      else if(name==='items')switchPage('items');
      v6UpdateLayout();
    });
    return nav;
  }
  function v6RenderEventList(){
    if(p2v510EventView!=='open')return;
    const list=$('eventList'),card=list?.closest('.card');
    if(!card)return;
    let tools=$('v6EventToolbar');
    if(!tools){
      tools=document.createElement('div');tools.id='v6EventToolbar';
      tools.innerHTML='<input id="v6EventSearch" class="search" type="search" placeholder="Search event by name">'+
      '<select id="v6EventFilter"><option value="all">All Events</option><option value="active">Active</option>'+
      '<option value="upcoming">Upcoming</option><option value="planned">Planned</option>'+
      '<option value="completed">Completed</option></select>';
      list.parentElement.insertBefore(tools,list);
      $('v6EventSearch').oninput=e=>{v6EventQuery=e.target.value;v6PaintEvents()};
      $('v6EventFilter').onchange=e=>{v6EventStatus=e.target.value;v6PaintEvents()};
    }
    $('v6EventSearch').value=v6EventQuery;
    $('v6EventFilter').value=v6EventStatus;
    v6PaintEvents();
  }
  function v6PaintEvents(){
    const host=$('eventList');if(!host)return;
    const events=state.events.filter(ev=>
      (!v6EventQuery||[ev.name,ev.venue,eventDateText(ev)].join(' ').toLowerCase().includes(v6EventQuery.toLowerCase()))&&
      (v6EventStatus==='all'||v6EventStatus===v6EventStatusOf(ev)))
      .slice().sort((a,b)=>String(eventDates(b)[0]||'').localeCompare(String(eventDates(a)[0]||'')));
    host.innerHTML='<div class="v6-event-table"><table><thead><tr>'+
      '<th>EVENT NAME</th><th>EVENT DAY</th><th>VENUE</th><th>STATUS</th><th></th></tr></thead><tbody>'+
      (events.length?events.map(ev=>{
        const status=v6EventStatusOf(ev);
        return '<tr><td><strong>'+esc(ev.name)+'</strong></td><td>'+
        esc(eventDateText(ev))+'</td><td>'+esc(ev.venue||'—')+'</td><td>'+
        '<span class="v6-event-status v6-event-'+status+'">'+status.toUpperCase()+'</span></td>'+
        '<td><button class="btn secondary v6-open-event" type="button" data-id="'+esc(ev.id)+'">VIEW</button></td></tr>';
      }).join(''):'<tr><td colspan="5" class="v6-no-events">No events match your search.</td></tr>')+
      '</tbody></table></div>';
    host.querySelectorAll('.v6-open-event').forEach(button=>button.onclick=()=>{
      state.activeEventId=button.dataset.id;save();switchPage('eventWorkspace');
    });
  }
  // Avoid any accidental interaction with the filter state function.
  function v6EventStatusOf(ev){
    if(ev.status&&['active','upcoming','planned','completed','cancelled'].includes(String(ev.status).toLowerCase()))
      return String(ev.status).toLowerCase();
    const days=eventDates(ev),day=new Date().toISOString().slice(0,10);
    if(!days.length)return'planned';
    if(day<days[0])return'upcoming';
    if(day>days[days.length-1])return'completed';
    return'active';
  }

  const v6RenderEventsBefore=renderEvents;
  renderEvents=function(){
    const result=v6RenderEventsBefore.apply(this,arguments);
    v6RenderEventList();
    return result;
  };
  const v6PageSwitchBefore=switchPage;
  switchPage=function(id){
    if(id==='events'&&p2v510EventView==='landing')p2v510EventView='open';
    const result=v6PageSwitchBefore.apply(this,arguments);
    if(id==='events'){
      if(p2v510EventView!=='create'&&p2v510EventView!=='edit'){
        p2v510EventView='open';
        p2v510RenderEventView();
        renderEvents();
      }
    }
    v6InitVolunteerPicker();
    v6UpdateLayout();
    return result;
  };
  function v6UpdateLayout(){
    const nav=v6EventsShell();
    const relevant=v6EventPages.has(page),printing=page==='items'&&v82BadgeMode==='printing';
    nav.classList.toggle('hidden',!relevant||printing||page==='events'||p2v510EventView==='create'||p2v510EventView==='edit');
    document.body.classList.toggle('v6-event-area',relevant);
    document.body.classList.toggle('v6-badge-mode',printing);
    if(relevant){
      const t=$('pageTitle');if(t)t.textContent=printing?'BADGE PREPARATION':page==='events'?'EVENTS':String(activeEvent()?.name||'EVENT').toUpperCase();
      $('pageSubtitle')?.classList.add('hidden');
      const chip=$('workingDateChip');
      if(chip)chip.classList.toggle('hidden',page==='events');
      if(page==='events'){
        let button=$('v6NewEvent');
        if(!button){
          button=document.createElement('button');button.id='v6NewEvent';
          button.className='btn';button.type='button';button.textContent='+ NEW EVENT';
          const where=document.querySelector('.topbar .actions')||document.querySelector('.topbar');
          where?.appendChild(button);
        }
        button.hidden=false;
        button.onclick=()=>{resetEventForm();p2v510EventView='create';p2v510RenderEventView();v6UpdateLayout()};
      }else if($('v6NewEvent'))$('v6NewEvent').hidden=true;
      if(page==='events'&&p2v510EventView!=='open')$('v6EventToolbar')?.classList.add('hidden');
      else $('v6EventToolbar')?.classList.remove('hidden');
    }else if($('v6NewEvent'))$('v6NewEvent').hidden=true;
    const current=page==='events'||page==='eventRecord'?'record':page==='daily'?'volunteers':
      page==='register'||page==='checkin'?'attendees':page==='items'?'items':'record';
    nav.querySelectorAll('.v6-event-tab').forEach(button=>
      button.classList.toggle('active',button.dataset.v6Tab===current));
    let back=$('v6BadgeBack');
    if(!back){
      back=document.createElement('button');back.id='v6BadgeBack';back.type='button';
      back.className='btn ghost';back.textContent='← BACK';
      const where=document.querySelector('.topbar .actions')||document.querySelector('.topbar');
      where?.appendChild(back);
      back.onclick=()=>{v82BadgeMode='issue';renderItems();v6UpdateLayout()};
    }
    back.hidden=!printing;
    if(printing){
      v6BadgePanel();
      const panel=$('v72BadgePanel');panel?.classList.remove('hidden');
    }
  }
  const v6BadgeModeBefore=v82ApplyBadgeMode;
  v82ApplyBadgeMode=function(){const result=v6BadgeModeBefore.apply(this,arguments);v6UpdateLayout();return result};
  v6EventsShell();
  v6UpdateLayout();
  document.head.insertAdjacentHTML('beforeend','<style id="v6-frozen-event-badge-css">'+
  'body.v6-event-area .topbar{border-bottom:4px solid #ffba12!important;margin-bottom:21px!important;padding-bottom:16px!important}'+
  'body.v6-event-area #pageTitle{color:#092c65!important;font-size:31px!important;font-weight:750!important;text-transform:uppercase!important}'+
  'body.v6-event-area #pageSubtitle{display:none!important}'+
  '#v6EventTabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;border-bottom:4px solid #ffba12;padding:0 0 14px;margin-bottom:24px}'+
  '#v6EventTabs.hidden{display:none!important}'+
  '#v6EventTabs .v6-event-tab{min-height:53px;white-space:nowrap;background:#fff;color:#092a5a;border:1px solid #cddbed;border-radius:30px;font-size:14px;font-weight:750}'+
  '#v6EventTabs .v6-event-tab.active{background:#082f69!important;color:white;border-color:#082f69}'+
  '#v6NewEvent{min-height:44px;background:#082f69;color:#fff;border-radius:11px;font-weight:750;padding:12px 24px}'+
  '#v6NewEvent[hidden],#v6BadgeBack[hidden]{display:none!important}'+
  'body.v6-event-area:has(#events.page.active) #v578EventSearch{display:none!important}'+
  '#v6EventToolbar{display:grid;grid-template-columns:minmax(230px,1fr) 245px;gap:18px;margin:0 0 20px}'+
  '#v6EventToolbar.hidden{display:none!important}'+
  '#v6EventToolbar input,#v6EventToolbar select{min-height:48px;padding:9px 17px;border:1px solid #ccd9e9;border-radius:12px;background:#fff;color:#122b50}'+
  '#eventList .v6-event-table{background:#fff;border:1px solid #e0e8f1;border-radius:16px;overflow:hidden}'+
  '#eventList .v6-event-table table{width:100%;border-collapse:collapse}'+
  '#eventList .v6-event-table th{background:#eaf0f8;color:#2b3647;font-size:13px;padding:17px;text-align:left}'+
  '#eventList .v6-event-table td{border-top:1px solid #dde5ec;padding:16px;font-size:13px}'+
  '#eventList .v6-event-table td strong{color:#111b2b;font-size:14px}'+
  '#eventList .v6-open-event{border-radius:12px;min-width:95px}'+
  '#eventList .v6-event-status{display:inline-block;border-radius:30px;padding:9px 15px;font-weight:650;background:#e8f0fc;color:#102f61}'+
  '#eventList .v6-event-active{background:#d7f7e1;color:#17663e}'+
  '#eventList .v6-event-planned,#eventList .v6-event-completed{background:#eff0f3;color:#4e5563}'+
  '#eventList .v6-event-cancelled{background:#fde4e4;color:#9a3030}'+
  'body.v6-event-area #eventWorkspace .quick-actions{gap:13px}'+
  'body.v6-event-area #eventWorkspace .quick{border-radius:13px;border:1px solid #d2dfec;background:#fff;color:#092e6a}'+
  'body.v6-event-area:has(#daily.page.active) #daily .v5-layout{margin-top:16px}'+
  'body.v6-event-area:has(#daily.page.active) #daily #v5VolunteersUI .v5-table-card{border-radius:13px}'+
  'body.v6-event-area:has(#checkin.page.active) #checkin .card,body.v6-event-area:has(#register.page.active) #register .card,body.v6-event-area:has(#items.page.active) #items .card,body.v6-event-area:has(#eventRecord.page.active) #eventRecord .card{border:1px solid #d3dfec;border-radius:14px;background:#fff}'+
  'body.v6-badge-mode #v82BadgeHub{display:none!important}'+
  'body.v6-badge-mode #items #v72BadgePanel{display:block!important;background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important}'+
  'body.v6-badge-mode #v72BadgePanel > :not(#v6BadgeRoot){display:none!important}'+
  'body:not(.v6-badge-mode) #v6BadgeRoot{display:none!important}'+
  '#v6BadgeRoot .v6-badge-counters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px;margin:4px 0 23px}'+
  '#v6BadgeRoot .v6-badge-counter{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:136px;border:1px solid #cbdcf0;border-radius:17px;background:#eaf3ff;color:#0c326c}'+
  '#v6BadgeRoot .v6-badge-pending{background:#fff6dc;border-color:#f5db95}'+
  '#v6BadgeRoot .v6-badge-counter strong{font-size:59px;line-height:1.1}'+
  '#v6BadgeRoot .v6-badge-counter span{font-size:15px;font-weight:750;margin-top:6px}'+
  '#v6BadgeRoot .v6-badge-tools{display:flex;justify-content:space-between;align-items:center;gap:22px;margin:0 0 21px}'+
  '#v6BadgeRoot .v6-badge-filters{display:grid;grid-template-columns:repeat(3,140px);border:1px solid #ccd9e9;border-radius:40px;overflow:hidden}'+
  '#v6BadgeRoot .v6-badge-filters button{background:#fff;color:#143260;border:0;min-height:46px;font-size:13px;font-weight:750}'+
  '#v6BadgeRoot .v6-badge-filters button.active{background:#073a7b;color:#fff;border-radius:40px}'+
  '#v6BadgeRoot .v6-badge-actions{display:flex;gap:13px}'+
  '#v6BadgeRoot .v6-badge-actions .btn{min-width:130px;min-height:45px;border-radius:12px}'+
  '#v6BadgeRoot #v6BadgeSearch{width:100%;min-height:47px;border:1px solid #cbd7e6;border-radius:11px;margin-bottom:20px;padding:11px 16px}'+
  '#v6BadgeRoot .v6-badge-table{background:#fff;border:1px solid #d6e1ee;border-radius:15px;overflow:hidden}'+
  '#v6BadgeRoot table{border-collapse:collapse;width:100%}'+
  '#v6BadgeRoot th{background:#eaf0f8;text-align:left;font-size:13px;color:#465063;padding:16px 22px}'+
  '#v6BadgeRoot td{border-top:1px solid #dfe7f2;padding:13px 22px}'+
  '#v6BadgeRoot td strong{display:block;font-size:15px;color:#111b2f}'+
  '#v6BadgeRoot td small{display:block;margin-top:4px;font-size:12px;color:#697382}'+
  '#v6BadgeRoot .v6-badge-label{display:inline-flex;align-items:center;gap:17px;cursor:pointer;color:#0c326c;font-weight:650}'+
  '#v6BadgeRoot .v6-badge-label input{height:22px;width:22px;accent-color:#0b3978}'+
  '#v6VolunteerPicker .v6-vol-modal{max-width:720px}'+
  '#v6VolunteerPicker #v6MasterSearch{width:100%;margin:14px 0;border-radius:9px}'+
  '#v6VolunteerPicker #v6MasterVolunteerList{max-height:360px;overflow:auto}'+
  '#v6VolunteerPicker .v6-picker-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-bottom:1px solid #dfe8f1}'+
  '#v6VolunteerPicker .v6-picker-row strong,#v6VolunteerPicker .v6-picker-row small{display:block}'+
  '#v6VolunteerPicker .v6-picker-row small{color:#708097;margin-top:3px}'+
  '#v6VolunteerPicker .v6-picker-row .btn{font-size:11px;margin-left:6px;padding:9px 10px}'+
  '#v6VolunteerPicker .v6-picker-footer{display:flex;justify-content:space-between;margin-top:18px}'+
  '#v6VolunteerPicker .v6-already{color:#25734b;font-size:12px;font-weight:750}'+
  '@media(max-width:1100px){#v6EventTabs .v6-event-tab{font-size:11px}#v6BadgeRoot .v6-badge-filters{grid-template-columns:repeat(3,100px)}}'+
  '</style>');


  // Approved follow-up Freeze 1: keep event navigation INSIDE a selected event.
  // Freeze 2: remove the redundant details area, not the data or check-in provenance.
  function v7ApprovedRefresh(){
    const isEvent=page!=='events' && v6EventPages.has(page) && !!activeEvent();
    const nav=$('v6EventTabs');
    if(nav)nav.classList.toggle('hidden',!isEvent||(page==='items'&&v82BadgeMode==='printing'));
    // Reuse the original Back button in the existing topbar-controls.
    // Do not introduce a second Back button or move the frozen sidebar.
    const back=$('backButton');
    if(back){
      if(isEvent){
        back.classList.remove('hidden');
        back.hidden=false;
        back.textContent='← BACK TO EVENTS';
      }else if(page==='events'){
        back.classList.add('hidden');
      }
      if(!back.dataset.v9EventBack){
        back.dataset.v9EventBack='1';
        back.addEventListener('click',event=>{
          if(page==='events'||!v6EventPages.has(page)||!activeEvent())return;
          event.preventDefault();event.stopImmediatePropagation();
          p2v510EventView='open';switchPage('events');
        },true);
      }
    }
    const t=$('pageTitle');
    if(t&&isEvent){
      const section=page==='daily'?'VOLUNTEERS':page==='register'||page==='checkin'?'ATTENDEES':
        page==='items'?'BADGE & SCARF':'EVENT RECORD';
      t.textContent=String(activeEvent().name||'EVENT').toUpperCase()+' – '+section;
    }
    if(t&&page==='events')t.textContent='EVENTS';
    // Badge printing retains its existing return action within Badge & Scarf;
    // it must not create another Back button in the event header.
    const badgeReturn=$('v6BadgeBack');
    if(badgeReturn&&page==='items'&&v82BadgeMode==='printing'){
      const badgePanel=$('v72BadgePanel');
      if(badgePanel && badgeReturn.parentElement!==badgePanel)badgePanel.prepend(badgeReturn);
      badgeReturn.textContent='← BADGE & SCARF';
    }
    const detail=$('v5VolunteerDetail');
    if(detail)detail.hidden=true;
    document.querySelectorAll('.topbar button').forEach(b=>{
      if((b.textContent||'').trim().toUpperCase().includes('MASTER LOCK'))
        b.style.display=page==='daily'?'none':'';
    });
  }
  const v7LayoutPrevious=v6UpdateLayout;
  v6UpdateLayout=function(){
    const value=v7LayoutPrevious.apply(this,arguments);
    v7ApprovedRefresh();return value;
  };
  const v7RenderVolunteerPrevious=v5RenderVolunteerUI;
  v5RenderVolunteerUI=function(){
    const value=v7RenderVolunteerPrevious.apply(this,arguments);
    v7ApprovedRefresh();return value;
  };
  document.head.insertAdjacentHTML('beforeend','<style id="v7-approved-volunteers-css">'+
    '.topbar-controls #backButton{white-space:nowrap!important;flex-shrink:0}'+
    'body.v6-event-area .topbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important}'+
    'body.v6-event-area #pageTitle{font-size:clamp(22px,2.4vw,30px)!important;line-height:1.25!important;overflow-wrap:anywhere!important}'+
    'body.v6-event-area #v6EventTabs{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:9px!important}'+
    'body.v6-event-area:has(#daily.page.active) #daily .v5-layout{display:block!important;grid-template-columns:minmax(0,1fr)!important}'+
    'body.v6-event-area:has(#daily.page.active) #v5VolunteerDetail{display:none!important}'+
    'body.v6-event-area:has(#daily.page.active) #v5VolunteerTable{width:100%!important;table-layout:fixed!important}'+
    'body.v6-event-area:has(#daily.page.active) #v5VolunteerTable tr > :nth-child(6){display:none!important}'+
    'body.v6-event-area:has(#daily.page.active) #v5VolunteerTable th,body.v6-event-area:has(#daily.page.active) #v5VolunteerTable td{padding:13px 10px!important;white-space:normal!important}'+
    'body.v6-event-area:has(#daily.page.active) #v5VolunteersUI{max-width:100%!important;min-width:0!important}'+
    '</style>');
  v7ApprovedRefresh();

  // Freeze 2 correction: double-click CHECKED IN to undo only the active
  // event/day check-in. Never clear registration, an unrelated day, or issued items.
  document.addEventListener('dblclick',function v8UndoVolunteerCheckin(event){
    const button=event.target.closest?.('#v5VolunteerTable .v5-check.checked');
    if(!button||page!=='daily'||!activeEvent())return;
    event.preventDefault();event.stopImmediatePropagation();
    const id=button.dataset.id,eventId=state.activeEventId,date=v5CurrentDate();
    if(!id||!eventId||!date)return;
    const allocation=v5Allocation('volunteer',id,eventId,date);
    // Badge/scarf issue is independent check-in evidence: keep it checked in.
    if((allocation.badgeIssued&&!allocation.badgeReturned)||
       (allocation.scarfIssued&&!allocation.scarfReturned)){
      toast('Badge or scarf is issued; reverse its issue first to remove check-in.');
      return;
    }
    const registration=(state.volunteerRegistrations||[]).find(
      r=>r.eventId===eventId&&r.volunteerId===id);
    if(registration)registration.checkins=(registration.checkins||[]).filter(d=>d!==date);
    const key=eventId+'|'+date;
    state.daily[key]=(state.daily[key]||[]).filter(value=>value!==id);
    allocation.v5ManualCheckin=false;
    allocation.v5LegacyCheckin=false;
    allocation.v5AutoCheckin=false;
    allocation.v5AutoAt=null;
    save();v5RenderVolunteerUI();
  },true);

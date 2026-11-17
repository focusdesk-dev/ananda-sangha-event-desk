  // PATCH 14.7 — Settings information architecture ONLY.
  // Approved design: four sections, no Advanced Settings, one protected
  // Data & Backup Danger Zone, version below; preserve every existing DOM id,
  // event handler, storage key, classes rule and frozen left sidebar.
  window.anandaSettingsRamsVersion='14.7';
  (function v147InstallSettings(){
    const settings=document.getElementById('settings');
    if(!settings||document.getElementById('v147SettingsHome'))return;
    const securityForm=document.getElementById('v52PasswordSettingsForm');
    const securityCard=securityForm?.closest('.card');
    const oldSecurityGrid=securityCard?.parentElement;
    const securityExplain=securityCard?.nextElementSibling;
    const progression=document.getElementById('p2v546ProgressionCard');
    const ai=document.getElementById('p2v532AiSettings');
    const usage=document.getElementById('p2v537UsageCard');
    const data=document.getElementById('v123DataCard');
    const reset=document.getElementById('v123ResetSettings');
    const templates=document.getElementById('v87ImportTemplates');
    if(!securityCard||!oldSecurityGrid||!progression||!ai||!usage||!data||!reset||!templates)
      throw Error('Settings 14.7: required existing control is missing; refusing layout change');

    const sectionSVG={
      security:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/>',
      progression:'<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 3 10 3 12 0v-5"/><path d="M22 9v7"/>',
      ai:'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4m6-4v4m-6 14v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/><path d="M9 14V10m0 2h2m3-2v4"/>',
      data:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 18 2 18 0V5M3 12c0 3 18 3 18 0"/>'
    };
    const headings=[
      ['v147Security','security','SECURITY','Administrator password and access'],
      ['v147Progression','progression','COURSE PROGRESSION','Minimum attendance and eligibility rules'],
      ['v147Ai','ai','AI ATTENDANCE','Connection, API key and usage'],
      ['v147Data','data','DATA & BACKUP','Backups, restore and data location']
    ];
    const home=document.createElement('div');
    home.id='v147SettingsHome';
    home.setAttribute('aria-label','Settings sections');
    for(const [id,icon,title,desc] of headings){
      const section=document.createElement('details');
      section.id=id;section.className='v147-setting';
      const summary=document.createElement('summary');
      summary.innerHTML='<span class="v147-setting-icon" aria-hidden="true"><svg width="25" height="25" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6">'+sectionSVG[icon]+'</svg></span>'+
        '<span class="v147-setting-title"><strong>'+title+'</strong><small>'+desc+'</small></span>'+
        '<span class="v147-setting-chevron" aria-hidden="true">›</span>';
      const body=document.createElement('div');
      body.className='v147-setting-body';body.id=id+'Content';
      section.append(summary,body);
      home.append(section);
      section.addEventListener('toggle',()=>{
        if(!section.open)return;
        for(const other of home.querySelectorAll(':scope > details.v147-setting'))
          if(other!==section)other.open=false;
      });
    }
    // All original forms and buttons are MOVED, not recreated: event handlers,
    // validation and administrator authorization remain exactly as before.
    home.querySelector('#v147SecurityContent').append(securityCard);
    const oldWarning=securityExplain?.querySelector('.security-warning');
    if(oldWarning){
      oldWarning.className='v147-password-note';
      securityCard.append(oldWarning);
    }
    if(securityExplain&&securityExplain!==securityCard)securityExplain.remove();
    home.querySelector('#v147ProgressionContent').append(progression);
    home.querySelector('#v147AiContent').append(ai);
    const usageToggle=document.createElement('details');
    usageToggle.id='v147UsageToggle';usageToggle.className='v147-optional';
    usageToggle.innerHTML='<summary>Usage & estimated cost</summary>';
    usageToggle.append(usage);
    home.querySelector('#v147AiContent').append(usageToggle);
    const beforeCredits=ai.querySelector('.security-warning');
    if(beforeCredits){
      const note=document.createElement('details');
      note.className='v147-optional';note.id='v147AiAdvice';
      note.innerHTML='<summary>Before using paid AI</summary>';
      beforeCredits.classList.remove('security-warning');
      note.append(beforeCredits);
      home.querySelector('#v147AiContent').append(note);
    }

    home.querySelector('#v147DataContent').append(data);
    // Import templates remain accessible, but are not a competing top-level card.
    const importToggle=document.createElement('details');
    importToggle.id='v147ImportToggle';importToggle.className='v147-optional';
    importToggle.innerHTML='<summary>Import templates</summary>';
    importToggle.append(templates);
    home.querySelector('#v147DataContent').append(importToggle);
    const danger=document.createElement('details');
    danger.id='v147DangerZone';danger.className='v147-danger';
    danger.innerHTML='<summary>Danger zone</summary>'+
      '<div class="v147-danger-inner"><strong>Reset all application data</strong>'+
      '<p>Deletes student, class, attendance, event and master records on this computer. This cannot be undone. Back up your data first.</p>'+
      '<p>Requires the existing administrator password and a final confirmation.</p>'+
      '<div id="v147DangerActions" class="actions"></div></div>';
    danger.querySelector('#v147DangerActions').append(reset);
    reset.classList.remove('ghost');reset.classList.add('danger');
    home.querySelector('#v147DataContent').append(danger);
    const automaticNote=data.querySelector('.security-warning');
    if(automaticNote){automaticNote.classList.remove('security-warning');automaticNote.classList.add('v147-backup-note')}
    const versionBadge=data.querySelector('.pill.green');
    const savedVersion=(versionBadge?.textContent||'').trim();
    if(versionBadge)versionBadge.remove();
    const footer=document.createElement('footer');
    footer.className='v147-settings-footer';
    footer.textContent='ANANDA SANGHA EVENT DESK'+(savedVersion?' · '+savedVersion:'');
    home.append(footer);
    // Remove only the now-empty original Settings grid. The frozen sidebar
    // and its labels, layout, styles and navigation are never touched.
    if(oldSecurityGrid.children.length===0)oldSecurityGrid.remove();
    settings.append(home);
  })();
  document.head.insertAdjacentHTML('beforeend', '<style id="v147-settings-style">'+
    '#settings #v147SettingsHome{max-width:1120px;margin:4px auto 38px;display:grid;gap:15px}'+
    '#settings .v147-setting{border:1px solid #d7e1ec;border-radius:12px;background:#fff;'+
      'overflow:visible;box-shadow:0 1px 3px rgba(12,42,82,.025)}'+
    '#settings .v147-setting>summary{display:flex;align-items:center;gap:19px;min-height:112px;'+
      'padding:21px 25px;cursor:pointer;list-style:none;color:#0c2b5b}'+
    '#settings .v147-setting>summary::-webkit-details-marker,#settings .v147-optional>summary::-webkit-details-marker,'+
      '#settings .v147-danger>summary::-webkit-details-marker{display:none}'+
    '#settings .v147-setting>summary:hover{background:#f8fbff}'+
    '#settings .v147-setting>summary:focus-visible,#settings .v147-optional>summary:focus-visible,'+
      '#settings .v147-danger>summary:focus-visible{outline:2px solid #103b79;outline-offset:-3px}'+
    '#settings .v147-setting-icon{width:61px;height:61px;flex:0 0 61px;border-radius:11px;'+
      'background:#f1f4f8;color:#102e62;display:flex;align-items:center;justify-content:center}'+
    '#settings .v147-setting-title{display:grid;gap:6px;min-width:0;flex:1}'+
    '#settings .v147-setting-title strong{font-size:20px;font-weight:760;letter-spacing:-.02em}'+
    '#settings .v147-setting-title small{font-size:14px;font-weight:400;color:#4b5c75}'+
    '#settings .v147-setting-chevron{font-size:31px;line-height:1;font-weight:300;transition:transform .15s}'+
    '#settings .v147-setting[open]>.v147-setting-body{border-top:1px solid #e0e7f0;'+
      'padding:0 22px 22px}'+
    '#settings .v147-setting[open]>.v147-setting-body>.card{margin:0!important;'+
      'padding:20px 0 0;border:0;box-shadow:none;border-radius:0}'+
    '#settings .v147-setting[open]>.v147-setting-body>.card:first-child{margin-top:0!important}'+
    '#settings .v147-setting[open]>.v147-setting-body>.card .card-head{margin-bottom:10px}'+
    '#settings .v147-optional{margin-top:13px;border:1px solid #e1e7ee;border-radius:9px;background:#fcfdff}'+
    '#settings .v147-optional>summary{cursor:pointer;font-weight:650;padding:15px 17px;'+
      'color:#103b70;list-style:none}'+
    '#settings .v147-optional>summary:after{content:"›";float:right;font-size:23px;line-height:.65}'+
    '#settings .v147-optional[open]{padding-bottom:12px}'+
    '#settings .v147-optional>.card{margin:0!important;border:0!important;box-shadow:none!important}'+
    '#settings .v147-optional>.security-warning,#settings .v147-optional>.note,'+
      '#settings #v147AiAdvice>div{margin:4px 16px 10px!important;font-size:13px;line-height:1.6;color:#43526a}'+
    '#settings .v147-danger{margin-top:22px;border:1px solid #dbacaa;border-radius:9px;'+
      'background:#fffafa;overflow:hidden}'+
    '#settings .v147-danger>summary{font-size:14px;font-weight:700;cursor:pointer;'+
      'padding:15px 18px;list-style:none;color:#913d36}'+
    '#settings .v147-danger>summary:after{content:"›";float:right;font-size:22px;line-height:.7}'+
    '#settings .v147-danger[open]>.v147-danger-inner{border-top:1px solid #edd3d3;'+
      'padding:18px;color:#4d3f44;font-size:13px}'+
    '#settings .v147-danger-inner p{margin:7px 0;line-height:1.55}'+
    '#settings .v147-danger-inner .btn.danger{margin-top:12px;background:#953c34!important;'+
      'color:#fff!important;border-color:#953c34!important}'+
    '#settings .v147-password-note{margin-top:15px;color:#4d5c71;font-size:12px;line-height:1.55}'+
    '#settings .v147-backup-note{margin-top:17px;padding:11px 0;color:#4d6179;font-size:13px}'+
    '#settings .v147-settings-footer{text-align:right;font-size:11px;letter-spacing:.02em;'+
      'color:#778397;padding:10px 5px 0;border-top:1px solid #e4ebf3;margin-top:6px}'+
    '@media(max-width:850px){#settings .v147-setting>summary{padding:15px 17px;min-height:88px;gap:12px}'+
      '#settings .v147-setting-icon{width:47px;height:47px;flex-basis:47px}'+
      '#settings .v147-setting-title strong{font-size:16px}'+
      '#settings .v147-setting-title small{font-size:12px}'+
      '#settings .v147-setting[open]>.v147-setting-body{padding:0 14px 17px}}'+
    '</style>');

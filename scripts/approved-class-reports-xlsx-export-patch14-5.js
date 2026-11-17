  // PATCH 14.5 — Approved CLASS REPORTS Excel exports only.
  // No new data store, no payment mutation, and no change to frozen Classes UI.
  // Generates the compact 3-row-header, A4 landscape XLSX from LIVE class data.
  window.anandaClassReportsExportVersion='14.5';

  function v145Money(raw){
    if(raw===null||raw===undefined||String(raw).trim()==='')return null;
    const n=Number(String(raw).replace(/[,₹\s]/g,''));
    return Number.isFinite(n)&&n>=0?n:null;
  }
  function v145Payments(item){
    const en=item.en,b=item.b;
    const original=v145Money(b.courseFee);
    const fee=original===null?v145Money(en.feeAmount):original;
    const repeat=en.paymentStatus==='Waived — Repeat';
    const free=original===0||en.paymentStatus==='N.A.'||repeat;
    const status=repeat?'WAIVED — REPEAT':free?'N.A.':
      en.paymentStatus==='Paid'?'PAID':fee===null?'FEE NOT SET':'PENDING';
    const due=repeat||free?0:fee;
    const paid=status==='PAID'?due===null?'':due:0;
    const balance=status==='PAID'||free?0:due===null?'':due;
    return {fee:due===null?'':due,paid,balance,status,
      mode:status==='PAID'?String(en.paymentMode||'').toUpperCase():'',
      date:status==='PAID'?String(en.paymentDate||''):'',
      receipt:status==='PAID'?String(en.receiptNo||en.paymentReceiptNo||en.receiptNumber||''):''};
  }
  function v145Date(value){
    const s=String(value||'').trim();
    if(!s)return '';
    const d=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(d)return d[3]+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(d[2])-1]+' '+d[1];
    return s;
  }
  function v145ExportContext(items,filters){
    const select=id=>document.getElementById(id);
    const chosen=id=>select(id)?.selectedOptions?.[0]?.textContent?.trim()||'ALL';
    const batchIds=[...new Set(items.map(x=>String(x.b.id)))];
    const batch=batchIds.length===1?state.classBatches.find(b=>String(b.id)===batchIds[0]):null;
    return {
      course:chosen('v574Course').toUpperCase(),
      batch:chosen('v574Batch').toUpperCase(),
      year:chosen('v574Year').toUpperCase(),
      start:batch?v145Date(batch.start).toUpperCase():'MULTIPLE BATCHES',
      group:String(filters.group||'All'),
      search:String(filters.search||'')
    };
  }
  function v145LiveRows(rows){
    // Eligible-for-next-course is a progress prospect, not a registration.
    // Never export a phantom registration into a payment or enrolment list.
    const seen=new Set(),out=[];
    for(const item of rows){
      if(item.type!=='enrolled'||!item.en||!item.b)continue;
      if(seen.has(item.en.id))continue;
      seen.add(item.en.id);
      out.push(item);
    }
    return out;
  }
  function v145Cell(letter,row,value,style){
    const ref=letter+row;
    return typeof value==='number'&&Number.isFinite(value)
      ?'<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>'
      :'<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+v51Xml(value==null?'':value)+'</t></is></c>';
  }
  function v145Sheet(spec,items,ctx){
    const cols=spec.widths.length,end=v51ExcelColumn(cols-1);
    const head=[
      ['S.NO.','STUDENT NAME','MOBILE NUMBER','REGISTRATION STATUS','REGISTERED ON','REMARKS'],
      ['S.NO.','STUDENT NAME','MOBILE NUMBER','COURSE FEE (₹)','PAID (₹)','BALANCE (₹)','PAYMENT STATUS','MODE','PAYMENT DATE','RECEIPT NO.'],
      ['S.NO.','STUDENT NAME','MOBILE NUMBER','REGISTRATION','FEE (₹)','PAID (₹)','BALANCE (₹)','PAYMENT','MODE','PAYMENT DATE']
    ][spec.index];
    const meta='COURSE: '+ctx.course+'     |     BATCH: '+ctx.batch+'     |     YEAR: '+ctx.year+'     |     START: '+ctx.start;
    const title='ANANDA SANGHA GURGAON   |   '+spec.heading;
    const xmlRows=[];
    function fullRow(rowNumber,values,types){
      const cells=[];
      for(let i=0;i<cols;i++){
        const letter=v51ExcelColumn(i),val=values[i]??'';
        let style=0;
        if(rowNumber===1)style=1;
        else if(rowNumber===2)style=2;
        else if(rowNumber===3)style=3;
        else {
          style=rowNumber%2?5:4;
          if(i===0)style=rowNumber%2?10:9;
          if(types?.currency?.includes(i))style=rowNumber%2?12:11;
          if(i===types?.statusIndex){
            style=/^PAID$/.test(types.status)?6:
              /^PENDING$/.test(types.status)?7:8;
          }
        }
        // Table header: navy medium boundary. Body: dark grid with medium
        // left/right/bottom outside edges; data and payment values unchanged.
        if(rowNumber===3)style+=13; // second style block, borderId=2
        else if(rowNumber>=4){
          const last=rowNumber===items.length+3;
          const firstCol=i===0,lastCol=i===cols-1;
          const borderId=last?(firstCol?6:lastCol?7:5):
            firstCol?3:lastCol?4:1;
          style+=(borderId-1)*13;
        }
        cells.push(v145Cell(letter,rowNumber,val,style));
      }
      const height=rowNumber===1?29:rowNumber===2?25:rowNumber===3?27:22;
      return '<row r="'+rowNumber+'" ht="'+height+'" customHeight="1">'+cells.join('')+'</row>';
    }
    xmlRows.push(fullRow(1,[title]));
    xmlRows.push(fullRow(2,[meta]));
    xmlRows.push(fullRow(3,head));
    const merges=['A1:'+end+'1','A2:'+end+'2'];
    if(spec.index===0)merges.push('F3:H3');
    items.forEach((x,i)=>{
      const p=x.p||{},en=x.en||{},payment=v145Payments(x),register=v145Date(en.enrolledAt||en.registrationDate||'');
      const values=spec.index===0
        ?[i+1,p.name||'',p.mobile||'','REGISTERED',register,'']
        :spec.index===1
          ?[i+1,p.name||'',p.mobile||'',payment.fee,payment.paid,payment.balance,payment.status,payment.mode,v145Date(payment.date),payment.receipt]
          :[i+1,p.name||'',p.mobile||'','REGISTERED',payment.fee,payment.paid,payment.balance,payment.status,payment.mode,v145Date(payment.date)];
      const row=i+4;
      if(spec.index===0)merges.push('F'+row+':H'+row);
      xmlRows.push(fullRow(row,values,{
        currency:spec.index===0?[]:spec.index===1?[3,4,5]:[4,5,6],
        statusIndex:spec.index===1?6:spec.index===2?7:-1,
        status:payment.status
      }));
    });
    const widths=spec.widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join('');
    const total=Math.max(4,items.length+3);
    const mergeXml='<mergeCells count="'+merges.length+'">'+merges.map(ref=>'<mergeCell ref="'+ref+'"/>').join('')+'</mergeCells>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'+
      '<dimension ref="A1:'+end+total+'"/>'+
      '<sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
      '<sheetFormatPr defaultRowHeight="15"/><cols>'+widths+'</cols>'+
      '<sheetData>'+xmlRows.join('')+'</sheetData>'+mergeXml+
      '<printOptions horizontalCentered="1"/>'+
      '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.15" footer="0.15"/>'+
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'+
      '</worksheet>';
  }
  function v145Styles(){
    const font=(color,bold,size)=>'<font>'+(bold?'<b/>':'')+'<sz val="'+size+'"/><color rgb="FF'+color+'"/><name val="Calibri"/></font>';
    const fonts=[
      font('16345D',false,10),font('FFFFFF',true,15),font('123B6D',true,10),
      font('FFFFFF',true,10),font('183760',false,10),
      font('146B3A',true,10),font('775408',true,10),font('52657C',true,10)
    ];
    const fill=color=>'<fill><patternFill patternType="solid"><fgColor rgb="FF'+color+'"/><bgColor indexed="64"/></patternFill></fill>';
    const fills=['<fill><patternFill patternType="none"/></fill>','<fill><patternFill patternType="gray125"/></fill>',
      fill('12376F'),fill('E9F0F8'),fill('F4F7FB'),fill('FFFFFF'),fill('DEF2E5'),fill('FFF1C6'),fill('EEF1F4')];
    // Patch 14.6: valid Office Open XML, with dark column/row gridlines and
    // a stronger outer border on the table. The old "</bottom/>" was invalid
    // XML and caused Excel to discard EVERY fill/font/border style.
    const edge=(side,weight='thin',color='FF52657A')=>
      '<'+side+' style="'+weight+'"><color rgb="'+color+'"/></'+side+'>';
    const border=(left,right,top,bottom)=>
      '<border>'+edge('left',left)+edge('right',right)+
      edge('top',top)+edge('bottom',bottom)+'<diagonal/></border>';
    const borders=[
      '<border><left/><right/><top/><bottom/><diagonal/></border>',
      border('thin','thin','thin','thin'),                    // 1 body grid
      border('medium','medium','medium','medium'),            // 2 navy headers
      border('medium','thin','thin','thin'),                 // 3 left outer edge
      border('thin','medium','thin','thin'),                 // 4 right outer edge
      border('thin','thin','thin','medium'),                 // 5 bottom edge
      border('medium','thin','thin','medium'),               // 6 bottom-left
      border('thin','medium','thin','medium')                // 7 bottom-right
    ];
    const xf=(f,fl,nf=0,align='left',borderId=1)=>
      '<xf numFmtId="'+nf+'" fontId="'+f+'" fillId="'+fl+'" borderId="'+borderId+
      '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"'+
      (nf?' applyNumberFormat="1"':'')+
      '><alignment horizontal="'+align+'" vertical="center"/></xf>';
    const base=[
      [0,5,0,'left'],[1,2,0,'left'],[2,3,0,'left'],[3,2,0,'left'],
      [4,4,0,'left'],[4,5,0,'left'],[5,6,0,'left'],[6,7,0,'left'],
      [7,8,0,'left'],[4,4,0,'right'],[4,5,0,'right'],
      [4,4,164,'right'],[4,5,164,'right']
    ];
    // Each 13-style block corresponds to border IDs 1..7.
    const styles=[];
    for(let borderId=1;borderId<=7;borderId++)
      for(const def of base)styles.push(xf(def[0],def[1],def[2],def[3],borderId));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="₹#,##0"/></numFmts>'+
      '<fonts count="'+fonts.length+'">'+fonts.join('')+'</fonts>'+
      '<fills count="'+fills.length+'">'+fills.join('')+'</fills>'+
      '<borders count="'+borders.length+'">'+borders.join('')+'</borders>'+
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
      '<cellXfs count="'+styles.length+'">'+styles.join('')+'</cellXfs>'+
      '</styleSheet>';
  }
  function v145BuildExportWorkbook(allRows,filters,kind){
    const rows=v145LiveRows(allRows);
    if(!rows.length){toast('No registered students in this selection');return null;}
    const ctx=v145ExportContext(rows,filters);
    const specs=[
      {index:0,name:'Registration Check',heading:'REGISTRATION CHECKLIST',widths:[9,24,16,21,12,17,15,19]},
      {index:1,name:'Payment List',heading:'PAYMENT STATUS LIST',widths:[8,22,16,15,13,14,17,11,17,14]},
      {index:2,name:'Registration + Payment',heading:'REGISTRATION & PAYMENT LIST',widths:[8,22,16,18,12,13,13,14,15,17]}
    ].filter(spec=>kind==='all'||Number(kind)===spec.index);
    const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      specs.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
    const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    const book='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
      '<sheets>'+specs.map((s,i)=>'<sheet name="'+v51Xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
    const bookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      specs.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
      '<Relationship Id="rId'+(specs.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const files=[{name:'[Content_Types].xml',data:types},{name:'_rels/.rels',data:rels},
      {name:'xl/workbook.xml',data:book},{name:'xl/_rels/workbook.xml.rels',data:bookRels},
      {name:'xl/styles.xml',data:v145Styles()},
      ...specs.map((spec,i)=>({name:'xl/worksheets/sheet'+(i+1)+'.xml',data:v145Sheet(spec,rows,ctx)}))];
    return {blob:v51Zip(files),rows:rows.length,types:specs.length};
  }
  function v145OpenClassReportExportMenu(button,getRows,getFilters,exportCsv){
    const old=document.getElementById('v145ClassExportMenu');
    if(old){old.remove();return;}
    const menu=document.createElement('div');
    menu.id='v145ClassExportMenu';
    menu.setAttribute('role','menu');
    menu.innerHTML=[
      ['0','REGISTRATION CHECKLIST'],
      ['1','PAYMENT LIST'],
      ['2','REGISTRATION & PAYMENT'],
      ['all','ALL THREE SHEETS'],
      ['csv','COMPLETE CLASS REPORT (CSV)']
    ].map(([key,label])=>'<button type="button" role="menuitem" data-kind="'+key+'">'+label+'</button>').join('');
    button.parentElement.style.position='relative';
    button.parentElement.appendChild(menu);
    button.setAttribute('aria-expanded','true');
    const close=()=>{menu.remove();button.setAttribute('aria-expanded','false')};
    menu.querySelectorAll('button[data-kind]').forEach(item=>item.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const kind=item.dataset.kind;
      close();
      v51RequireAdmin(()=>{
        if(kind==='csv'){exportCsv();return;}
        // Resolve records AFTER authorization, from the latest saved state.
        const generated=v145BuildExportWorkbook(getRows(),getFilters(),kind);
        if(!generated)return;
        const now=new Date(),stamp=now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0');
        const suffix=kind==='all'?'All_Lists':kind==='0'?'Registration_Checklist':kind==='1'?'Payment_List':'Registration_and_Payment';
        v51DownloadBlob('Ananda_Class_Reports_'+suffix+'_'+stamp+'.xlsx',generated.blob);
        toast(generated.rows+' records exported to Excel');
      },'export the Class Reports list');
    });
    setTimeout(()=>document.addEventListener('click',event=>{
      if(!menu.isConnected||menu.contains(event.target)||event.target===button)return;
      close();
    },{once:true}),0);
  }
  document.head.insertAdjacentHTML('beforeend','<style id="v145-class-export-menu-css">'+
    '#classReportsHub #v145ClassExportMenu{position:absolute;z-index:80;right:0;top:calc(100% + 5px);'+
    'min-width:260px;max-width:min(330px,95vw);padding:5px;border:1px solid #cedbea;border-radius:10px;'+
    'background:white;box-shadow:0 9px 28px rgba(7,34,75,.19)}'+
    '#classReportsHub #v145ClassExportMenu button{display:block;width:100%;border:0!important;'+
    'border-radius:6px!important;background:white!important;color:#10376d!important;text-align:left;'+
    'padding:11px 12px;font-weight:700;font-size:12px;cursor:pointer}'+
    '#classReportsHub #v145ClassExportMenu button:hover,#classReportsHub #v145ClassExportMenu button:focus{'+
    'background:#eaf2fc!important}'+
    '</style>');

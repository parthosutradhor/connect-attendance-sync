(() => {
  const PATH = '/app/exam-controller/attendance/entry';
  const fields = () => [...document.querySelectorAll('mat-form-field')];
  const field = name => fields().find(e => e.querySelector('mat-label')?.textContent.replace(/\*/g, '').trim() === name);
  const value = name => field(name)?.querySelector('.mat-mdc-select-min-line')?.textContent.trim() || '';
  const classField = () => field('Class') || field('Date');
  function context() {
    const raw = ['Semester','Academic Degree','Course','Section'].map(value);
    raw.push(classField()?.querySelector('.mat-mdc-select-min-line')?.textContent.trim() || '');
    if (raw.some(v => !v)) throw new Error('Select semester, degree, course, section, and class date first.');
    return {key:JSON.stringify(raw),course:AttendanceCore.course(raw[2]),date:AttendanceCore.date(raw[4]),section:raw[3],semester:raw[0],className:raw[4]};
  }
  function roster() {
    const table = [...document.querySelectorAll('table')].find(t => /Student ID/.test(t.querySelector('thead')?.textContent || '') && /Student Name/.test(t.textContent));
    if (!table) throw new Error('Wait for the student list to load.');
    const rows = [...table.querySelectorAll('tbody tr')].map(row => {
      const cells = row.querySelectorAll('td');
      const radios = [...row.querySelectorAll('input[type=radio]')];
      const radio = label => radios.find(r => [...(r.labels || [])].some(l => l.textContent.trim() === label));
      const p = radio('Present'), a = radio('Absent');
      const id = cells[0]?.textContent.trim();
      if (!/^\d{6,12}$/.test(id || '') || !p || !a || p.disabled || a.disabled) throw new Error('A student row is unsupported or locked. No changes made.');
      return {id,name:cells[1]?.textContent.trim() || '',p,a,current:p.checked ? 'P' : a.checked ? 'A' : '',row};
    });
    if (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('The roster is empty or contains duplicate IDs.');
    return rows;
  }
  let host, root, launch, notice, busy = false;
  const css = `:host{font:14px/1.5 system-ui,sans-serif;color:#182c42;display:block;margin:8px 0 22px}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #d6e0e8;background:white;color:#244256;border-radius:9px;padding:10px 15px;font-weight:650}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #67b9a8;outline-offset:2px}.primary{background:#155d50;color:white;border-color:#155d50}.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}:host > .bar{justify-content:flex-end}.note{font-size:12px;color:#617588;margin-top:8px;text-align:right}dialog{color:#182c42;border:1px solid #dce6ec;border-radius:20px;padding:0;width:min(960px,94vw);max-height:90vh;max-height:90dvh;overflow:hidden;box-shadow:0 25px 100px #122c4550}dialog[open]{display:flex;flex-direction:column}dialog > header,dialog > .tools,dialog > .status,dialog > .foot{flex-shrink:0}dialog::backdrop{background:#10253699;backdrop-filter:blur(3px)}header{padding:16px 28px 12px;background:#f4f8f7}h2{font-size:24px;letter-spacing:-.7px;margin:2px 0 4px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:2px;color:#28705f}.sub{color:#617588;font-size:13px}.stats{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 0}.stat{background:white;border:1px solid #dde7e5;border-radius:10px;padding:8px 14px;flex:1;min-width:100px;display:flex;align-items:center;gap:8px}.stat b{font-size:21px;line-height:1.2}.stat span{font-size:11px;color:#617588;white-space:nowrap}.tools{padding:16px 28px;display:flex;gap:10px}input[type=search]{border:1px solid #cbd8e2;border-radius:8px;padding:10px;flex:1;min-width:80px}select{border:1px solid #cad7e0;border-radius:7px;padding:7px;background:white;color:#182c42}.scroll{flex:1 1 auto;min-height:0;max-height:38vh;overflow:auto;overscroll-behavior:contain;padding:0 28px}table{border-collapse:collapse;width:100%;font-size:13px}th{text-align:left;background:#f4f7fa;color:#617588;font-size:11px;position:sticky;top:0}td,th{padding:12px 10px;border-bottom:1px solid #e6edf2}td small{display:block;color:#758699}.error{color:#a54c20;font-size:12px}.pill{background:#edf5f2;border-radius:5px;padding:3px 7px;white-space:nowrap}.foot{padding:10px 28px;border-top:1px solid #e5ebf0}.foot p{margin:0 0 8px}.foot button{padding:8px 14px}.foot .bar{justify-content:flex-end}.status{padding:0 28px 12px;color:#526b7b}.status:empty{display:none}progress{width:100%;accent-color:#155d50} .changed{background:#f1faf7}@media(max-width:600px){header,.tools{padding:16px}.foot{padding:10px 16px}header{padding-top:12px;padding-bottom:10px}.scroll{padding:0 8px}th,td{padding:8px 4px}.stat{padding:8px}h2{font-size:22px}}`;
  function el(tag, text, cls) { const e=document.createElement(tag); if(text !== undefined)e.textContent=text; if(cls)e.className=cls; return e; }
  function button(text, action, cls) { const b=el('button',text,cls); b.type='button'; b.onclick=action; return b; }
  const label = status => status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Unmarked';
  async function start() {
    if(busy)return;
    let ctx, rows;
    try { ctx=context(); rows=roster(); } catch(e){notice.textContent=e.message;return;}
    busy=true; launch.disabled=true;
    const dialog=el('dialog');
    const header=el('header'); header.append(el('div','DATABASE → CONNECT','eyebrow'),el('h2','Review attendance'));
    header.append(el('div',`${ctx.semester} · ${ctx.course} · Section ${ctx.section}`,'sub'),el('div',ctx.className,'sub'));
    const stats=el('div',undefined,'stats');header.append(stats);
    const tools=el('div',undefined,'tools');const search=el('input'); search.type='search';search.placeholder='Search student name or ID';search.setAttribute('aria-label','Search students');
    const filter=el('select');filter.setAttribute('aria-label','Filter results');[['all','All students'],['changes','Changes only'],['present','Present Only'],['absent','Absent Only'],['errors','Lookup errors']].forEach(([v,t])=>{const o=el('option',t);o.value=v;filter.append(o);});tools.append(search,filter);
    const scroll=el('div',undefined,'scroll'), table=el('table'),thead=el('thead'),tr=el('tr');['Student ID','Student Name','Current','Database','Apply as'].forEach(t=>tr.append(el('th',t)));thead.append(tr);const tbody=el('tbody');table.append(thead,tbody);scroll.append(table);
    const status=el('div','Reading database…','status');status.setAttribute('role','status');const progress=el('progress');progress.max=rows.length;progress.value=0;status.append(progress);
    const foot=el('div',undefined,'foot');const actions=el('div',undefined,'bar');
    let closed=false, finished=false, applied=false;
    const close=()=>{closed=true;dialog.close();dialog.remove();busy=false;launch.disabled=false;launch.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const apply=button('Apply reviewed changes',applyChanges,'primary');apply.disabled=true;
    actions.append(button('Cancel',close),apply);foot.append(actions);dialog.append(header,tools,scroll,status,foot);root.append(dialog);dialog.showModal();
    const items=rows.map(r=>({...r,result:null,target:'',error:'',done:false}));
    function summary(){
      stats.replaceChildren();
      [[items.length,'STUDENTS'],[items.filter(i=>i.target==='P').length,'PRESENT'],[items.filter(i=>i.target==='A').length,'ABSENT'],[items.filter(i=>i.target && i.target!==i.current).length,'CHANGES'],[items.filter(i=>i.error).length,'ERRORS']].forEach(([n,t])=>{const s=el('div',undefined,'stat');s.append(el('b',String(n)),el('span',t));stats.append(s);});
    }
    function render(){
      summary();tbody.replaceChildren();
      for(const item of items){
        if(!`${item.id} ${item.name}`.toLowerCase().includes(search.value.toLowerCase()))continue;
        if(filter.value==='errors'&&!item.error)continue;
        if(filter.value==='present'&&(item.target||item.current)!=='P')continue;
        if(filter.value==='absent'&&(item.target||item.current)!=='A')continue;
        if(filter.value==='changes'&&(!item.target||item.target===item.current))continue;
        const row=el('tr');if(item.target&&item.target!==item.current)row.className='changed';
        const studentId=el('td',item.id);const student=el('td',item.name);const current=el('td',label(item.current));const db=el('td');db.append(el('span',item.error||(!item.done?'Waiting…':label(item.result)),item.error?'error':'pill'));
        const edit=el('td'),select=el('select');select.setAttribute('aria-label',`Attendance for ${item.id}`);
        [['','Keep current'],['P','Present'],['A','Absent']].forEach(([v,t])=>{const o=el('option',t);o.value=v;select.append(o);});select.value=item.target;select.disabled=!finished||applied;select.onchange=()=>{item.target=select.value;summary();row.className=item.target&&item.target!==item.current?'changed':'';if(filter.value!=='all')render();};edit.append(select);row.append(studentId,student,current,db,edit);tbody.append(row);
      }
    }
    search.oninput=render;filter.onchange=render;render();
    let index=0,complete=0;
    await Promise.all(Array.from({length:4},async()=>{
      while(index<items.length&&!closed){
        const item=items[index++];
        try{const result=await chrome.runtime.sendMessage({type:'lookup',id:item.id,date:ctx.date,course:ctx.course});if(result?.error)throw new Error(result.error);if(!['P','A'].includes(result?.status))throw new Error('No valid API response.');item.result=result.status;item.target=result.status;}
        catch(e){item.error=e.message;}
        item.done=true;complete++;if(!closed){progress.value=complete;render();}
      }
    }));
    if(closed)return;finished=true;status.textContent='';apply.disabled=false;render();
    async function applyChanges(){
      apply.disabled=true;
      try{
        if(location.pathname!==PATH||context().key!==ctx.key)throw new Error('The selected class changed. Close this review and sync again.');
        const now=roster();
        if(now.length!==items.length||now.some((r,i)=>r.id!==items[i].id||r.current!==items[i].current||r.p!==items[i].p))throw new Error('The roster or attendance changed during review. Close and sync again.');
        let count=0;
        for(const item of items){
          if(!item.target||item.target===item.current)continue;
          const radio=item.target==='P'?item.p:item.a;
          radio.click();
          if(!radio.checked)throw new Error('A control could not be updated. Check the page before saving.');
          count++;
        }
        applied=true;render();status.textContent=`${count} attendance changes applied to the page. Save or Update in Connect to commit them.`;notice.textContent=status.textContent;actions.replaceChildren(button('Done',close,'primary'));
      }catch(e){status.textContent=e.message;}
    }
  }
  function mount(){
    if(location.pathname!==PATH){host?.remove();return;}
    const anchor=classField();if(!anchor)return;
    if(host?.isConnected)return;
    host=el('div');host.id='connect-attendance-sync';root=host.attachShadow({mode:'closed'});const style=el('style',css);const bar=el('div',undefined,'bar');launch=button('↻  Sync using Database API',start,'primary');bar.append(launch,button('Settings',()=>chrome.runtime.sendMessage({type:'settings'})));notice=el('div','Preview database results, adjust, then apply.','note');notice.setAttribute('role','status');root.append(style,bar,notice);anchor.after(host);
  }
  let pending=false;new MutationObserver(()=>{if(!pending){pending=true;setTimeout(()=>{pending=false;mount();},200);}}).observe(document.body,{childList:true,subtree:true});mount();
})();

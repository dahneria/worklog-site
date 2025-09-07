/* Premium worklog JS - localStorage based */
const KEY = 'neria_premium_worklog_v1';
const RULES = { base:40, otMult:1.25, regPerDay:8 };

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

function toMin(t){ const [hh,mm]=t.split(':').map(Number); return hh*60+mm; }
function diffHours(s,e){ let d=(toMin(e)-toMin(s))/60; if(d<0) d+=24; return +d.toFixed(2); }
function calcPay(hours){ const reg=Math.min(hours,RULES.regPerDay); const ot=Math.max(0,hours-RULES.regPerDay); const pay=reg*RULES.base + ot*(RULES.base*RULES.otMult); return {hours,reg,ot,pay:+pay.toFixed(2)}; }

function uid(){ return 'id-'+Math.random().toString(36).slice(2,9); }

function addEntry(date,start,end,note=''){ const hours=diffHours(start,end); const c=calcPay(hours); const row={ id:uid(), date:date, start, end, note, hours:c.hours, overtime:c.ot, pay:c.pay }; const data=load(); data.push(row); data.sort((a,b)=>b.date.localeCompare(a.date)); save(data); return row; }
function updateEntry(id, date, start, end, note){
  const data = load();
  const entryIndex = data.findIndex(x => x.id === id);
  if (entryIndex === -1) return;
  const hours = diffHours(start, end);
  const c = calcPay(hours);
  data[entryIndex] = {
    ...data[entryIndex],
    date,
    start,
    end,
    note,
    hours: c.hours,
    overtime: c.ot,
    pay: c.pay
  };
  save(data);
}
function removeEntry(id){ const data=load().filter(x=>x.id!==id); save(data); }
function clearAll(){ if(confirm('לרוקן את כל היומן?')){ localStorage.removeItem(KEY); render(); } }

function formatN(n){ return Number(n).toFixed(2); }
function formatMoney(n){ return formatN(n)+' ₪'; }

/* UI */
document.addEventListener('DOMContentLoaded', ()=>{
  const dateEl=document.getElementById('date');
  const startEl=document.getElementById('start');
  const endEl=document.getElementById('end');
  const noteEl=document.getElementById('note');
  const entryIdEl=document.getElementById('entryId');
  const addBtn=document.getElementById('add');
  const previewHours=document.getElementById('pvHours');
  const previewOt=document.getElementById('pvOt');
  const previewPay=document.getElementById('pvPay');
  const tblBody=document.querySelector('#tbl tbody');
  const totalHoursEl=document.getElementById('totalHours');
  const totalOtEl=document.getElementById('totalOt');
  const totalPayEl=document.getElementById('totalPay');
  const monthSel=document.getElementById('month');
  const searchEl=document.getElementById('search');

  // defaults
  const today=new Date(); dateEl.valueAsDate=today; startEl.value='09:00'; endEl.value='17:00';

  function refreshPreview(){ if(!startEl.value||!endEl.value) return; const h=diffHours(startEl.value,endEl.value); const c=calcPay(h); previewHours.textContent=formatN(c.hours); previewOt.textContent=formatN(c.ot); previewPay.textContent=formatMoney(c.pay); }
  startEl.addEventListener('input', refreshPreview); endEl.addEventListener('input', refreshPreview);

  function populateMonths(data){
    const months=Array.from(new Set(data.map(r=>r.date.slice(0,7)))).sort().reverse();
    monthSel.innerHTML = '<option value="">-- כל החודשים --</option>' + months.map(m=>`<option value="${m}">${m}</option>`).join('');
  }

  function paint(){
    const rows=load();
    populateMonths(rows);
    const m=monthSel.value;
    const q=searchEl.value.trim().toLowerCase();
    const filtered = rows.filter(r=> (m? r.date.slice(0,7)===m : true) && (q? (r.date.includes(q) || r.note.toLowerCase().includes(q) || r.start.includes(q) || r.end.includes(q)) : true) );
    tblBody.innerHTML='';
    if(filtered.length===0){ tblBody.innerHTML = `<tr><td colspan="8" class="empty">אין רשומות</td></tr>`; totalHoursEl.textContent='0.00'; totalOtEl.textContent='0.00'; totalPayEl.textContent='0 ₪'; return; }
    filtered.forEach(r=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${r.date}</td><td>${r.start}</td><td>${r.end}</td><td>${formatN(r.hours)}</td><td>${formatN(r.overtime)}</td><td>${formatMoney(r.pay)}</td><td>${r.note||''}</td><td class="row-actions"><button class="btn btn-ghost" data-action="edit" data-id="${r.id}">✏️</button><button class="btn btn-ghost" data-action="delete" data-id="${r.id}">🗑️</button></td>`;
      tblBody.appendChild(tr);
    });
    
    document.querySelectorAll('button[data-action="delete"]').forEach(b=> b.addEventListener('click', ()=>{ if(confirm('למחוק רשומה?')){ removeEntry(b.dataset.id); paint(); } }));
    document.querySelectorAll('button[data-action="edit"]').forEach(b=> b.addEventListener('click', ()=>{
      const entryId = b.dataset.id;
      const data = load();
      const entry = data.find(x => x.id === entryId);
      if (entry) {
        dateEl.value = entry.date;
        startEl.value = entry.start;
        endEl.value = entry.end;
        noteEl.value = entry.note;
        entryIdEl.value = entry.id;
        addBtn.textContent = 'עדכן משמרת';
        refreshPreview();
      }
    }));
    
    const tH = filtered.reduce((s,x)=>s+x.hours,0); const tO = filtered.reduce((s,x)=>s+x.overtime,0); const tP = filtered.reduce((s,x)=>s+x.pay,0);
    totalHoursEl.textContent = formatN(tH); totalOtEl.textContent = formatN(tO); totalPayEl.textContent = formatMoney(tP);
  }

  addBtn.addEventListener('click', ()=>{
    if(!dateEl.value || !startEl.value || !endEl.value){ alert('נא למלא תאריך, כניסה ויציאה'); return; }
    const entryId = entryIdEl.value;
    if (entryId) {
      updateEntry(entryId, dateEl.value, startEl.value, endEl.value, noteEl.value);
      alert('עודכן בהצלחה');
    } else {
      addEntry(dateEl.value, startEl.value, endEl.value, noteEl.value);
      alert('נשמר בהצלחה');
    }
    noteEl.value='';
    entryIdEl.value='';
    addBtn.textContent='שמור משמרת';
    paint();
  });

  monthSel.addEventListener('change', paint);
  searchEl.addEventListener('input', paint);

  // seed data from seed.json if present and no data yet
  fetch('seed.json').then(r=>r.json()).then(seed=>{
    if(load().length===0 && Array.isArray(seed)){
      seed.forEach(s=>{ s.id = s.id || uid(); });
      save(seed);
      paint();
    } else paint();
  }).catch(()=> paint());
});

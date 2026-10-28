const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = 'unihealthVisitorRecords_v1';
let visitors = [];
try { visitors = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (!Array.isArray(visitors)) visitors=[]; } catch { visitors=[]; }
let lastCreated = null;
let toastTimer;
function toast(message, error=false){ const el=$('#toast'); el.textContent=message; el.classList.toggle('error',error); el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3000); }
function saveRecords(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors)); } catch(e) { toast('Browser storage is unavailable. Records may not persist.',true); } }
function escapeHTML(value){ return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(date){ if(!date)return '—'; const d=new Date(date+'T00:00:00'); return Number.isNaN(d.getTime())?date:d.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}); }
function formatTime(time){ if(!time)return '—'; const [h,m]=time.split(':').map(Number); const d=new Date(); d.setHours(h||0,m||0,0,0); return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }
function renderRecords(){
 const query=$('#searchVisitors').value.trim().toLowerCase(); const status=$('#statusFilter').value;
 const filtered=visitors.filter(v=>{const hay=[v.name,v.phone,v.passId,v.patient,v.department,v.purpose].join(' ').toLowerCase(); return hay.includes(query)&&(status==='all'||v.status===status);});
 const tbody=$('#visitorRows');
 if(!filtered.length){ tbody.innerHTML=`<tr><td colspan="7" class="empty-cell">${visitors.length?'No matching visitor records. Try another search or filter.':'No visitors registered yet. Create a visitor pass above to see records here.'}</td></tr>`; }
 else { tbody.innerHTML=filtered.slice().reverse().map(v=>`<tr>
 <td><span class="visitor-name">${escapeHTML(v.name)}</span><span class="visitor-phone">${escapeHTML(v.phone)}</span></td>
 <td><span class="pass-pill">${escapeHTML(v.passId)}</span></td><td>${escapeHTML(v.patient)}<span class="visitor-phone">${escapeHTML(v.relationship)}</span></td>
 <td>${escapeHTML(v.department)}<span class="visitor-phone">${escapeHTML(v.purpose)}</span></td>
 <td>${escapeHTML(formatDate(v.date))}<span class="visitor-phone">${escapeHTML(formatTime(v.time))}</span></td>
 <td><span class="status-pill ${v.status==='Inside'?'status-inside':'status-out'}">${escapeHTML(v.status)}</span></td>
 <td>${v.status==='Inside'?`<button class="checkout-button" data-checkout="${escapeHTML(v.passId)}">Check out ↗</button>`:'<span class="visitor-phone">Exit recorded</span>'}</td></tr>`).join(''); }
 $('#recordCount').textContent=`${visitors.length} registration${visitors.length===1?'':'s'}`;
 $('#activeCount').textContent=visitors.filter(v=>v.status==='Inside').length;
}
function showPass(v){
 lastCreated=v; $('#passId').textContent=v.passId;
 $('#passDetails').innerHTML=`<div><span>VISITOR</span>${escapeHTML(v.name)}</div><div><span>VISITING</span>${escapeHTML(v.patient)}</div><div><span>DEPARTMENT</span>${escapeHTML(v.department)}</div><div><span>DATE & TIME</span>${escapeHTML(formatDate(v.date))} · ${escapeHTML(formatTime(v.time))}</div>`;
 $('#passResult').hidden=false; $('#visitorForm').hidden=true; $('#passResult').scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('#visitorForm').addEventListener('submit', e=>{
 e.preventDefault();
 const name=$('#visitorName').value.trim(), phone=$('#visitorPhone').value.trim(), patient=$('#patientName').value.trim();
 if(name.length<2||patient.length<2){toast('Please enter the visitor and patient names.',true);return;}
 if(!/^[0-9]{10}$/.test(phone)){toast('Enter a valid 10-digit phone number.',true);return;}
 const date=$('#visitDate').value, time=$('#visitTime').value;
 if(!date||!time){toast('Please choose the visit date and time.',true);return;}
 const today=new Date(); today.setHours(0,0,0,0); const selected=new Date(date+'T00:00:00');
 if(selected<today){toast('Please select today or a future visit date.',true);return;}
 const serial=Date.now().toString().slice(-6);
 const v={name,phone,patient,relationship:$('#relationship').value,department:$('#department').value,purpose:$('#purpose').value,date,time,passId:'UH-'+serial,status:'Inside',createdAt:new Date().toISOString(),checkoutAt:null};
 visitors.push(v); saveRecords(); renderRecords(); showPass(v); toast('Visitor registered successfully.');
});
$('#closePass').addEventListener('click',()=>{ $('#passResult').hidden=true; $('#visitorForm').hidden=false; });
$('#newVisitor').addEventListener('click',()=>{ $('#passResult').hidden=true; $('#visitorForm').hidden=false; $('#visitorForm').reset(); setDefaultDate(); $('#visitorName').focus(); });
$('#downloadPass').addEventListener('click',()=>{
 if(!lastCreated)return; const v=lastCreated;
 const content=`UNIHEALTH — VISITOR PASS\nPass ID: ${v.passId}\nVisitor: ${v.name}\nPhone: ${v.phone}\nVisiting: ${v.patient}\nRelationship: ${v.relationship}\nDepartment: ${v.department}\nPurpose: ${v.purpose}\nDate: ${formatDate(v.date)}\nTime: ${formatTime(v.time)}\nStatus: ${v.status}\n\nStudent project demo only.`;
 const blob=new Blob([content],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${v.passId}-visitor-pass.txt`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast('Visitor pass details downloaded.');
});
$('#visitorRows').addEventListener('click',e=>{
 const btn=e.target.closest('[data-checkout]'); if(!btn)return;
 const v=visitors.find(x=>x.passId===btn.dataset.checkout); if(!v)return;
 if(confirm(`Record check-out for ${v.name} (${v.passId})?`)){v.status='Checked out';v.checkoutAt=new Date().toISOString();saveRecords();renderRecords();toast('Visitor check-out recorded.');}
});
$('#searchVisitors').addEventListener('input',renderRecords); $('#statusFilter').addEventListener('change',renderRecords);
$('#clearRecords').addEventListener('click',()=>{if(!visitors.length){toast('There are no records to clear.');return;} if(confirm('Delete all demo visitor records from this browser?')){visitors=[];saveRecords();renderRecords();$('#passResult').hidden=true;$('#visitorForm').hidden=false;toast('Demo records cleared.');}});
$('#exportCsv').addEventListener('click',()=>{
 if(!visitors.length){toast('No records to export yet.',true);return;}
 const cols=['passId','name','phone','patient','relationship','department','purpose','date','time','status','createdAt','checkoutAt'];
 const csv=[cols.join(','),...visitors.map(v=>cols.map(k=>`"${String(v[k]??'').replace(/"/g,'""')}"`).join(','))].join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='unihealth-visitor-log.csv';a.click();URL.revokeObjectURL(url);toast('Visitor log exported as CSV.');
});
function setDefaultDate(){const el=$('#visitDate'); if(!el.value){const now=new Date();el.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;el.min=el.value;}}
setDefaultDate(); renderRecords();
// Hero slider: changes photo and caption; controls work without external libraries.
const slides=[
 {src:'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=88',alt:'Doctor caring for a patient',title:'Care, connected.',sub:'One team. One experience.'},
 {src:'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=88',alt:'Healthcare professional in a modern clinical setting',title:'People come first.',sub:'Support at every step.'},
 {src:'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=88',alt:'Medical professional ready to help',title:'A warmer welcome.',sub:'Every visit matters.'}
]; let slide=0;
function showSlide(n){slide=(n+slides.length)%slides.length;const s=slides[slide],img=$('#heroPhoto');img.style.opacity='.25';setTimeout(()=>{img.src=s.src;img.alt=s.alt;img.style.opacity='1';},140);$('.photo-caption b').textContent=s.title;$('.photo-caption small').textContent=s.sub;$('#slideIndex').textContent=String(slide+1).padStart(2,'0');$('#slideProgress').style.width=((slide+1)/slides.length*100)+'%';}
$('#prevHero').addEventListener('click',()=>showSlide(slide-1));$('#nextHero').addEventListener('click',()=>showSlide(slide+1));
let slideInterval=setInterval(()=>showSlide(slide+1),6500);
$('#prevHero').addEventListener('click',()=>{clearInterval(slideInterval);slideInterval=setInterval(()=>showSlide(slide+1),6500);});
$('#nextHero').addEventListener('click',()=>{clearInterval(slideInterval);slideInterval=setInterval(()=>showSlide(slide+1),6500);});
// Doctor carousel controls and card selection.
let doctorOffset=0;
function moveDoctors(dir){const track=$('#doctorTrack');const cards=$$('.doctor-card',track);if(!cards.length)return;const gap=parseFloat(getComputedStyle(track).columnGap)||18;const cardWidth=cards[0].getBoundingClientRect().width+gap;const visible=Math.max(1,Math.floor(track.parentElement.getBoundingClientRect().width/cardWidth));const max=Math.max(0,cards.length-visible);doctorOffset=Math.max(0,Math.min(max,doctorOffset+dir));track.style.transform=`translateX(${-doctorOffset*cardWidth}px)`;}
$('#doctorPrev').addEventListener('click',()=>moveDoctors(-1));$('#doctorNext').addEventListener('click',()=>moveDoctors(1));window.addEventListener('resize',()=>{doctorOffset=0;$('#doctorTrack').style.transform='translateX(0)';});
$$('[data-book]').forEach(btn=>btn.addEventListener('click',()=>{const name=btn.dataset.book;$('#patientName').value=$('#patientName').value||'';$('#department').value=({ 'Dr. Emily Carter':'Cardiology','Dr. Arjun Mehta':'Neurology','Dr. Maya Sharma':'Paediatrics','Dr. Daniel Lee':'Orthopaedics'})[name]||'';$('#register').scrollIntoView({behavior:'smooth'});$('#patientName').focus();toast(`${name} selected as your preferred specialist. Enter the patient/person name to continue.`);}));
$$('[data-doctor]').forEach(btn=>btn.addEventListener('click',()=>toast(`${btn.dataset.doctor} · Example specialist profile for this student demo.`)));
$('#navBook').addEventListener('click',e=>{e.preventDefault();$('#register').scrollIntoView({behavior:'smooth'});});
$('#mobileMenu').addEventListener('click',()=>$('#navLinks').classList.toggle('open'));$$('#navLinks a').forEach(a=>a.addEventListener('click',()=>$('#navLinks').classList.remove('open')));
// Subtle reveal animation on sections, with a fallback when reduced motion is enabled.
if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.12});
 $$('.feature-card,.doctor-card,.register-panel,.section-heading').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
}

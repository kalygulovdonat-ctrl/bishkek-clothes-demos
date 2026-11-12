// Админка магазина: вход, дашборд со статистикой, управление товарами.
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

module.exports = function renderAdmin(store, authed) {
  const slug = esc(store.slug);
  const acc = esc(store.accent || '#3ddc97');
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="color-scheme" content="dark">
<title>Админка — ${esc(store.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0d0f13;--card:#161920;--card2:#1c2029;--line:#262b35;--ink:#f1f3f6;--muted:#9aa2b0;--acc:${acc};--red:#ff5a52;--wa:#1fa855;--blue:#5cc8ff}
*{box-sizing:border-box;margin:0}
html,body{background:var(--bg);color:var(--ink);font:15px/1.5 "Manrope",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1040px;margin:0 auto;padding:18px 16px 70px}
header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;flex-wrap:wrap}
h1{font-size:21px;font-weight:800}h1 small{display:block;color:var(--muted);font-size:13px;font-weight:600}
h2{font-size:17px;font-weight:800;margin-bottom:12px}
a{color:var(--acc)}
.tabs{display:flex;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:5px;margin-bottom:18px;width:max-content}
.tabs button{background:transparent;color:var(--muted);padding:9px 16px;border-radius:10px}
.tabs button.on{background:var(--acc);color:#111}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:14px}
label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}
input,textarea{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:10px;color:var(--ink);padding:11px 12px;font:inherit}
input:focus,textarea:focus{outline:2px solid var(--acc);outline-offset:-1px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{font:inherit;font-weight:800;border:0;border-radius:10px;padding:11px 16px;cursor:pointer}
.btn{background:var(--acc);color:#111}.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}.danger{background:transparent;color:var(--red);border:1px solid #4a2523}
.err{color:var(--red);margin-top:8px;min-height:1em}.ok{color:#3ddc84}
.muted{color:var(--muted);font-size:13px}
/* Дашборд */
.period{display:flex;gap:6px}.period button{padding:7px 12px;font-size:13px;background:var(--card2);color:var(--muted)}.period button.on{background:var(--ink);color:#111}
.kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
@media(min-width:760px){.kpis{grid-template-columns:repeat(5,1fr)}}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px}
.kpi b{display:block;font-size:26px;font-weight:800;line-height:1.1}
.kpi span{color:var(--muted);font-size:12.5px;font-weight:700}
.kpi.hl{background:linear-gradient(160deg,${acc}33,transparent 70%),var(--card);border-color:${acc}66}
.kpi.hl b{color:var(--acc)}
.chart{width:100%;height:200px;display:block}
.legend{display:flex;gap:14px;font-size:12.5px;color:var(--muted);margin-top:8px;flex-wrap:wrap}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.grid2{display:grid;gap:14px}@media(min-width:760px){.grid2{grid-template-columns:1.4fr 1fr}}
table{width:100%;border-collapse:collapse}
td,th{padding:9px 6px;border-top:1px solid var(--line);text-align:left;font-size:14px}
th{color:var(--muted);font-weight:700;font-size:12.5px;border-top:0}
td.n,th.n{text-align:right;white-space:nowrap}
.pt{display:flex;align-items:center;gap:10px}.pt img,.pt .ph{width:38px;height:38px;border-radius:8px;object-fit:cover;background:var(--card2);flex-shrink:0}
.bar{height:8px;border-radius:4px;background:var(--card2);overflow:hidden;margin-top:6px}.bar i{display:block;height:100%;background:var(--acc)}
.tips li{margin:0 0 8px 18px}
.empty{color:var(--muted);text-align:center;padding:26px 10px}
/* Товары */
.pick{display:flex;gap:12px;align-items:center;margin-top:6px}
.pick img{width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
.toolbar{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}.toolbar input{flex:1;min-width:160px}
.list{display:grid;gap:10px}
.item{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px}
.item img,.item .noimg{width:64px;height:64px;border-radius:10px;object-fit:cover;background:var(--card2)}
.item b{display:block}.item small{color:var(--muted)}
.item .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.item .acts button{padding:8px 10px;font-size:13px}
.off{opacity:.55}
.check{display:flex;align-items:center;gap:8px;margin-top:12px}.check input{width:auto}
.stat-mini{font-size:12px;color:var(--muted)}
@media(max-width:560px){.row{grid-template-columns:1fr}.item{grid-template-columns:56px 1fr}.item .acts{grid-column:1/-1;justify-content:flex-start}}
</style></head>
<body><div class="wrap">
<header><h1>${esc(store.name)}<small>Панель управления сайтом</small></h1>
<div><a href="/${slug}/" target="_blank">Открыть сайт ↗</a>${authed ? ' &nbsp; <button class="ghost" id="logout">Выйти</button>' : ''}</div></header>

${authed ? `
<div class="tabs"><button class="on" data-tab="dash">Дашборд</button><button data-tab="prod">Товары</button></div>

<section id="dash">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <h2 style="margin:0">Статистика сайта</h2>
    <div class="period"><button data-d="7">7 дней</button><button data-d="30" class="on">30 дней</button><button data-d="90">90 дней</button></div>
  </div>
  <div class="kpis" id="kpis"></div>
  <div class="card"><h2>Посещения и заявки по дням</h2><svg class="chart" id="chart" viewBox="0 0 600 200" preserveAspectRatio="none"></svg>
    <div class="legend"><span><i style="background:var(--card2);border:1px solid var(--line)"></i>Просмотры</span><span><i style="background:var(--blue)"></i>Посетители</span><span><i style="background:var(--acc)"></i>Заявки (заказ, WhatsApp, звонок)</span></div></div>
  <div class="grid2">
    <div class="card"><h2>Популярные товары</h2><div id="top"></div></div>
    <div>
      <div class="card"><h2>Откуда приходят</h2><div id="refs"></div></div>
      <div class="card"><h2>Устройства</h2><div id="dev"></div></div>
      <div class="card"><h2>Каталог</h2><div id="cat"></div></div>
    </div>
  </div>
</section>

<section id="prod" hidden>
<div class="card" id="formCard">
  <h2 id="formTitle">Добавить товар</h2>
  <form id="f" autocomplete="off">
    <label>Название *</label><input name="title" maxlength="120" required placeholder="Например: Куртка оверсайз">
    <div class="row">
      <div><label>Цена, сом</label><input name="price" type="number" min="0" inputmode="numeric" placeholder="2990"></div>
      <div><label>Старая цена (для скидки)</label><input name="old_price" type="number" min="0" inputmode="numeric" placeholder="необязательно"></div>
    </div>
    <div class="row">
      <div><label>Категория</label><input name="category" maxlength="40" list="cats" placeholder="Куртки"><datalist id="cats"></datalist></div>
      <div><label>Размеры</label><input name="sizes" maxlength="80" placeholder="S, M, L, XL"></div>
    </div>
    <label>Описание</label><textarea name="description" rows="3" maxlength="600" placeholder="Ткань, цвет, посадка"></textarea>
    <label>Фото</label>
    <div class="pick"><img id="prev" alt="" hidden><input type="file" id="file" accept="image/*"></div>
    <label class="check"><input type="checkbox" name="in_stock" checked> Есть в наличии</label>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn" type="submit" id="save">Добавить</button><button class="ghost" type="button" id="cancel" hidden>Отмена</button></div>
    <div class="err" id="ferr"></div>
  </form>
</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px"><h2 style="margin:0">Товары <small id="count" class="muted"></small></h2></div>
<div class="toolbar"><input id="q" placeholder="Поиск по названию или категории"></div>
<div class="list" id="list"></div>
</section>
` : `
<div class="card" style="max-width:380px">
  <h2>Вход для владельца</h2>
  <form id="login"><label>Пароль</label><input type="password" name="password" required autocomplete="current-password">
  <button class="btn" style="margin-top:12px;width:100%">Войти</button><div class="err" id="lerr"></div></form>
</div>`}
</div>
<script>
const SLUG=${JSON.stringify(store.slug)}, API='/api/'+SLUG;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n||0).toLocaleString('ru-RU');
async function call(method,url,body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка');return j}
${authed ? `
// ---------- Вкладки ----------
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));$('#dash').hidden=b.dataset.tab!=='dash';$('#prod').hidden=b.dataset.tab!=='prod';if(b.dataset.tab==='dash')loadStats()});

// ---------- Дашборд ----------
let days=30, stats=null;
document.querySelectorAll('.period button').forEach(b=>b.onclick=()=>{days=+b.dataset.d;document.querySelectorAll('.period button').forEach(x=>x.classList.toggle('on',x===b));loadStats()});
async function loadStats(){try{stats=await call('GET',API+'/stats?days='+days);drawStats()}catch(e){$('#kpis').innerHTML='<div class="kpi">'+esc(e.message)+'</div>'}}
function drawStats(){
  const s=stats, leads=s.orders+s.wa+s.calls, conv=s.visitors?Math.round(leads/s.visitors*1000)/10:0;
  $('#kpis').innerHTML=[['Просмотры сайта',num(s.views)],['Посетители',num(s.visitors)],['Просмотры товаров',num(s.product_views)],['Заявки',num(leads),1],['Конверсия',conv.toString().replace('.',',')+'%']]
    .map(([t,v,h])=>'<div class="kpi'+(h?' hl':'')+'"><b>'+v+'</b><span>'+t+'</span></div>').join('');
  // График: столбцы — просмотры, линия — посетители, точки — заявки
  const d=s.daily, W=600,H=200,P=22, max=Math.max(1,...d.map(x=>x.views)), bw=(W-P)/d.length;
  let g='';for(let i=0;i<=3;i++){const y=P+(H-2*P)*i/3;g+='<line x1="0" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="#262b35" stroke-width="1"/>'}
  g+='<text x="4" y="14" fill="#9aa2b0" font-size="11">'+num(max)+'</text>';
  d.forEach((x,i)=>{const h=(H-2*P)*x.views/max, X=i*bw+P/2;g+='<rect x="'+(X+bw*.15)+'" y="'+(H-P-h)+'" width="'+(bw*.7)+'" height="'+Math.max(h,x.views?2:0)+'" rx="2" fill="#2a303c"><title>'+x.day+': '+x.views+' просм.</title></rect>';if(x.leads)g+='<circle cx="'+(X+bw/2)+'" cy="'+(H-P-(H-2*P)*Math.min(x.leads,max)/max)+'" r="4" fill="var(--acc)"><title>'+x.day+': '+x.leads+' заявок</title></circle>'});
  g+='<polyline fill="none" stroke="#5cc8ff" stroke-width="2" points="'+d.map((x,i)=>(i*bw+P/2+bw/2)+','+(H-P-(H-2*P)*x.visitors/max)).join(' ')+'"/>';
  const step=Math.ceil(d.length/6);d.forEach((x,i)=>{if(i%step===0)g+='<text x="'+(i*bw+P/2+bw/2)+'" y="'+(H-5)+'" fill="#9aa2b0" font-size="11" text-anchor="middle">'+x.day.slice(8)+'.'+x.day.slice(5,7)+'</text>'});
  $('#chart').innerHTML=g;
  const tmax=Math.max(1,...s.products.map(p=>p.views));
  $('#top').innerHTML=s.products.length?'<table><tr><th>Товар</th><th class="n">Просмотры</th><th class="n">Заказы</th></tr>'+s.products.map(p=>'<tr><td><div class="pt">'+(p.image?'<img src="'+esc(p.image)+'" alt="">':'<div class="ph"></div>')+'<div>'+esc(p.title)+'<div class="bar"><i style="width:'+Math.round(p.views/tmax*100)+'%"></i></div></div></div></td><td class="n">'+num(p.views)+'</td><td class="n"><b>'+num(p.orders)+'</b></td></tr>').join('')+'</table>':'<div class="empty">Пока нет данных. Когда покупатели начнут открывать товары, здесь появится рейтинг.</div>';
  const rsum=s.refs.reduce((a,r)=>a+r.c,0)||1;
  const rname=r=>!r?'Прямые заходы и мессенджеры':/instagram/.test(r)?'Instagram':/google/.test(r)?'Google':/2gis/.test(r)?'2ГИС':/yandex/.test(r)?'Яндекс':/t\\.me|telegram/.test(r)?'Telegram':r;
  $('#refs').innerHTML=s.refs.length?s.refs.map(r=>'<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>'+esc(rname(r.ref))+'</span><b>'+Math.round(r.c/rsum*100)+'%</b></div><div class="bar"><i style="width:'+Math.round(r.c/rsum*100)+'%"></i></div></div>').join(''):'<div class="empty">Нет данных</div>';
  const dsum=s.devices.reduce((a,r)=>a+r.c,0)||1, dm=s.devices.find(x=>x.device==='mobile');
  $('#dev').innerHTML=s.devices.length?'<div style="display:flex;justify-content:space-between"><span>📱 Телефон</span><b>'+Math.round((dm?dm.c:0)/dsum*100)+'%</b></div><div class="bar"><i style="width:'+Math.round((dm?dm.c:0)/dsum*100)+'%"></i></div><div style="display:flex;justify-content:space-between;margin-top:10px"><span>💻 Компьютер</span><b>'+(100-Math.round((dm?dm.c:0)/dsum*100))+'%</b></div>':'<div class="empty">Нет данных</div>';
  const c=s.catalog, tips=[];if(c.no_price)tips.push('У '+c.no_price+' товаров нет цены — с ценой заказывают чаще');if(c.no_photo)tips.push('У '+c.no_photo+' товаров нет фото');if(c.total<8)tips.push('Добавьте больше товаров — каталог выглядит живее');
  $('#cat').innerHTML='<div style="display:flex;justify-content:space-between"><span>Всего товаров</span><b>'+c.total+'</b></div><div style="display:flex;justify-content:space-between;margin-top:6px"><span>Скрыто</span><b>'+c.hidden+'</b></div>'+(tips.length?'<ul class="tips muted" style="margin-top:12px">'+tips.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'');
}

// ---------- Товары ----------
let items=[],editing=null,imageData=undefined;
const fmt=n=>n==null?'':num(n)+' сом';
function draw(){
  const q=$('#q').value.trim().toLowerCase();
  const shown=items.filter(i=>!q||(i.title+' '+(i.category||'')).toLowerCase().includes(q));
  const pv=new Map((stats&&stats.products||[]).map(p=>[p.id,p]));
  $('#count').textContent=items.length?('· '+items.length):'';
  $('#cats').innerHTML=[...new Set(items.map(i=>i.category).filter(Boolean))].map(c=>'<option value="'+esc(c)+'">').join('');
  $('#list').innerHTML=shown.length?shown.map(i=>{const st=pv.get(i.id);return '<div class="item'+(i.in_stock?'':' off')+'">'+(i.image?'<img src="'+esc(i.image)+'" alt="">':'<div class="noimg"></div>')+
   '<div><b>'+esc(i.title)+'</b><small>'+[fmt(i.price),i.category,i.sizes,i.in_stock?'':'скрыт'].filter(Boolean).map(esc).join(' · ')+'</small>'+(st?'<div class="stat-mini">👁 '+st.views+' · 🛒 '+st.orders+'</div>':'')+'</div>'+
   '<div class="acts"><button class="ghost" data-edit="'+i.id+'">Изменить</button><button class="ghost" data-stock="'+i.id+'">'+(i.in_stock?'Скрыть':'Показать')+'</button><button class="danger" data-del="'+i.id+'">Удалить</button></div></div>'}).join('')
   :'<p class="muted">'+(items.length?'Ничего не найдено':'Пока нет товаров. Добавьте первый — он сразу появится на сайте.')+'</p>';
}
async function load(){items=await call('GET',API+'/products');draw()}
$('#q').oninput=draw;
function shrink(file){return new Promise((ok,bad)=>{const img=new Image();img.onload=()=>{const k=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.85));URL.revokeObjectURL(img.src)};img.onerror=()=>bad(new Error('Не удалось открыть фото'));img.src=URL.createObjectURL(file)})}
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{imageData=await shrink(f);$('#prev').src=imageData;$('#prev').hidden=false}catch(err){$('#ferr').textContent=err.message}};
function reset(){editing=null;imageData=undefined;$('#f').reset();$('#prev').hidden=true;$('#formTitle').textContent='Добавить товар';$('#save').textContent='Добавить';$('#cancel').hidden=true;$('#ferr').textContent=''}
$('#cancel').onclick=reset;
$('#f').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const body=Object.fromEntries(fd);body.in_stock=fd.get('in_stock')==='on';if(imageData!==undefined)body.image=imageData;
  $('#save').disabled=true;$('#ferr').textContent='';
  try{if(editing)await call('PUT',API+'/products/'+editing,body);else await call('POST',API+'/products',body);reset();await load();$('#ferr').innerHTML='<span class="ok">Сохранено — уже на сайте</span>'}catch(err){$('#ferr').textContent=err.message}finally{$('#save').disabled=false}};
$('#list').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del){const it=items.find(i=>i.id==b.dataset.del);if(!confirm('Удалить «'+it.title+'»? Вернуть будет нельзя.'))return;await call('DELETE',API+'/products/'+it.id);load()}
  if(b.dataset.stock){const it=items.find(i=>i.id==b.dataset.stock);await call('PUT',API+'/products/'+it.id,{...it,in_stock:!it.in_stock,image:undefined});load()}
  if(b.dataset.edit){const it=items.find(i=>i.id==b.dataset.edit);editing=it.id;imageData=undefined;const f=$('#f');for(const k of ['title','price','old_price','category','sizes','description'])f.elements[k].value=it[k]??'';f.elements.in_stock.checked=!!it.in_stock;
    if(it.image){$('#prev').src=it.image;$('#prev').hidden=false}else $('#prev').hidden=true;$('#formTitle').textContent='Изменить товар';$('#save').textContent='Сохранить';$('#cancel').hidden=false;$('#formCard').scrollIntoView({behavior:'smooth'})}};
$('#logout').onclick=async()=>{await call('POST',API+'/logout');location.reload()};
loadStats().then(load);
` : `
$('#login').onsubmit=async e=>{e.preventDefault();$('#lerr').textContent='';try{await call('POST',API+'/login',{password:e.target.password.value});location.reload()}catch(err){$('#lerr').textContent=err.message}};
`}
</script></body></html>`;
};

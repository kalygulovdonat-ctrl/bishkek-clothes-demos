// Админка магазина: вход, список товаров, добавить / изменить / удалить.
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

module.exports = function renderAdmin(store, authed) {
  const slug = esc(store.slug);
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="color-scheme" content="dark">
<title>Админка — ${esc(store.name)}</title>
<style>
:root{--bg:#0f1115;--card:#181b21;--line:#2a2f38;--ink:#f1f2f4;--muted:#9aa1ad;--acc:${esc(store.accent || '#ffb627')};--red:#ff5a52}
*{box-sizing:border-box;margin:0}
html,body{background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:18px 16px 60px}
header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px;flex-wrap:wrap}
h1{font-size:20px}h1 small{display:block;color:var(--muted);font-size:13px;font-weight:500}
a{color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px}
label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}
input,textarea,select{width:100%;background:#0f1115;border:1px solid var(--line);border-radius:10px;color:var(--ink);padding:11px 12px;font:inherit}
input:focus,textarea:focus{outline:2px solid var(--acc);outline-offset:-1px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:11px 16px;cursor:pointer}
.btn{background:var(--acc);color:#111}.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}.danger{background:transparent;color:var(--red);border:1px solid #4a2523}
.err{color:var(--red);margin-top:8px;min-height:1em}.ok{color:#3ddc84}
.pick{display:flex;gap:12px;align-items:center;margin-top:6px}
.pick img{width:84px;height:84px;object-fit:cover;border-radius:10px;background:#0f1115;border:1px solid var(--line)}
.list{display:grid;gap:10px}
.item{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px}
.item img,.item .noimg{width:64px;height:64px;border-radius:10px;object-fit:cover;background:#0f1115}
.item b{display:block}.item small{color:var(--muted)}
.item .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.item .acts button{padding:8px 10px;font-size:13px}
.off{opacity:.55}
.check{display:flex;align-items:center;gap:8px;margin-top:12px}.check input{width:auto}
@media(max-width:560px){.row{grid-template-columns:1fr}.item{grid-template-columns:56px 1fr}.item .acts{grid-column:1/-1;justify-content:flex-start}}
</style></head>
<body><div class="wrap">
<header><h1>${esc(store.name)}<small>Управление товарами</small></h1>
<div><a href="/${slug}/" target="_blank">Открыть сайт ↗</a>${authed ? ' &nbsp; <button class="ghost" id="logout">Выйти</button>' : ''}</div></header>

${authed ? `
<div class="card" id="formCard">
  <h2 id="formTitle" style="font-size:17px">Добавить товар</h2>
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
<h2 style="font-size:17px;margin:20px 0 10px">Товары <small id="count" style="color:var(--muted);font-weight:500"></small></h2>
<div class="list" id="list"></div>
` : `
<div class="card" style="max-width:380px">
  <h2 style="font-size:17px">Вход для владельца</h2>
  <form id="login"><label>Пароль</label><input type="password" name="password" required autocomplete="current-password">
  <button class="btn" style="margin-top:12px;width:100%">Войти</button><div class="err" id="lerr"></div></form>
</div>`}
</div>
<script>
const SLUG=${JSON.stringify(store.slug)}, API='/api/'+SLUG;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function call(method,url,body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,credentials:'same-origin'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка');return j}
${authed ? `
let items=[],editing=null,imageData=undefined;
const fmt=n=>n==null?'':Number(n).toLocaleString('ru-RU')+' сом';
function draw(){
  $('#count').textContent=items.length?('· '+items.length):'';
  $('#cats').innerHTML=[...new Set(items.map(i=>i.category).filter(Boolean))].map(c=>'<option value="'+esc(c)+'">').join('');
  $('#list').innerHTML=items.length?items.map(i=>'<div class="item'+(i.in_stock?'':' off')+'">'+(i.image?'<img src="'+esc(i.image)+'" alt="">':'<div class="noimg"></div>')+
   '<div><b>'+esc(i.title)+'</b><small>'+[fmt(i.price),i.category,i.sizes,i.in_stock?'':'нет в наличии'].filter(Boolean).map(esc).join(' · ')+'</small></div>'+
   '<div class="acts"><button class="ghost" data-edit="'+i.id+'">Изменить</button><button class="ghost" data-stock="'+i.id+'">'+(i.in_stock?'Скрыть':'Показать')+'</button><button class="danger" data-del="'+i.id+'">Удалить</button></div></div>').join('')
   :'<p style="color:var(--muted)">Пока нет товаров. Добавьте первый — он сразу появится на сайте.</p>';
}
async function load(){items=await call('GET',API+'/products');draw()}
// Сжимаем фото в браузере: до 1600px по большей стороне, JPEG
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
load();
` : `
$('#login').onsubmit=async e=>{e.preventDefault();$('#lerr').textContent='';try{await call('POST',API+'/login',{password:e.target.password.value});location.reload()}catch(err){$('#lerr').textContent=err.message}};
`}
</script></body></html>`;
};

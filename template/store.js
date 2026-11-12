// Витрина магазина одежды. Факты — из stores.json (s), тексты — из content (c), товары — из базы (items).
// Пустые данные = блок не выводится.
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const num = n => Number(n).toLocaleString('ru-RU');
const tel = p => 'tel:' + String(p).replace(/[^\d+]/g, '');
const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

const THEMES = {
  noir:  { bg: '#0c0c0d', surface: '#151517', ink: '#f4f1ec', muted: '#a3a09a', line: '#26262a', accent: '#e9d8b4' },
  rose:  { bg: '#120c10', surface: '#1c1419', ink: '#f7eef2', muted: '#b29fa8', line: '#2e2229', accent: '#ff7aa8' },
  navy:  { bg: '#030d28', surface: '#0a1738', ink: '#f3f5fb', muted: '#9ba7c6', line: '#1a2a52', accent: '#ff4b2b' },
  ocean: { bg: '#0a0f17', surface: '#111a26', ink: '#eef4fb', muted: '#98a6b8', line: '#1d2a3b', accent: '#5cc8ff' }
};
const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.5.4.1.1.1.6-.1 1.2z"/></svg>';
const ICON_PHONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
const ICON_IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';
const STARS = '<span class="stars" aria-hidden="true">★★★★★</span>';

function hoursText(h) {
  const v = Object.values(h || {});
  if (!v.some(Boolean)) return null;
  return v.every(x => x && x === v[0]) ? `ежедневно ${v[0].replace('-', '–')}` : null;
}

module.exports = function renderStore(s, c, items) {
  const T = { ...THEMES[s.theme] || THEMES.noir };
  if (s.accent) T.accent = s.accent;
  const n = parseInt(T.accent.slice(1), 16);
  T.onAccent = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150 ? '#111' : '#fff';
  const wa = s.whatsapp ? `https://wa.me/${esc(s.whatsapp)}` : null;
  const hours = hoursText(s.hours);
  const visible = items.filter(i => i.in_stock);
  const cats = [...new Set(visible.map(i => i.category).filter(Boolean))];
  const praise = (c.praise || []).filter(Boolean).slice(0, 3);
  const reviews = (c.reviews || []).filter(r => r && r.text);
  const photos = (s.photos || []).filter(p => p && p !== s.hero);
  const delivery = (s.attrs || []).includes('Доставка');
  const orderText = it => `Здравствуйте! Хочу заказать: ${it.title}${it.price ? ` — ${num(it.price)} сом` : ''}${it.sizes ? ` (размеры: ${it.sizes})` : ''}. Увидел на вашем сайте.`;

  const card = it => `<article class="p" data-cat="${esc(it.category || '')}" data-id="${it.id}" id="p${it.id}">
  <div class="ph" data-open="${it.id}" role="button" tabindex="0" aria-label="Подробнее: ${esc(it.title)}">${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.title)}" loading="lazy">` : '<div class="noimg"></div>'}${it.old_price && it.price && it.old_price > it.price ? `<span class="sale">−${Math.round((1 - it.price / it.old_price) * 100)}%</span>` : ''}</div>
  <div class="pi">
    ${it.category ? `<div class="pc">${esc(it.category)}</div>` : ''}
    <h3 data-open="${it.id}">${esc(it.title)}</h3>
    ${it.description ? `<p class="pd">${esc(it.description)}</p>` : ''}
    ${it.sizes ? `<div class="sz">${esc(it.sizes).split(/\s*,\s*/).map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    <div class="pr">${it.price ? `<b>${num(it.price)} сом</b>` : '<b class="ask">цена по запросу</b>'}${it.old_price && it.price && it.old_price > it.price ? `<s>${num(it.old_price)}</s>` : ''}</div>
    ${wa ? `<a class="btn btn-main sm" data-order="${it.id}" href="${wa}?text=${encodeURIComponent(orderText(it))}" target="_blank" rel="noopener">${ICON_WA}<span>Заказать</span></a>` : s.phone ? `<a class="btn btn-main sm" href="${tel(s.phone)}">${ICON_PHONE}<span>Позвонить</span></a>` : ''}
  </div></article>`;

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark"><meta name="theme-color" content="${T.bg}">
<title>${esc(s.name)} — ${esc(s.niche || 'магазин одежды')}, Бишкек</title>
<meta name="description" content="${esc(c.tagline || '')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700;800${s.logoFont === 'script' ? '&family=Kaushan+Script' : ''}&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--bg:${T.bg};--surface:${T.surface};--ink:${T.ink};--muted:${T.muted};--line:${T.line};--accent:${T.accent};--on-accent:${T.onAccent};--wa:#1fa855;--r:18px;--head:"Unbounded",system-ui,sans-serif}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
html,body{overflow-x:hidden;background:var(--bg)}
body{font:16px/1.55 "Manrope",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);padding-bottom:calc(84px + env(safe-area-inset-bottom));-webkit-font-smoothing:antialiased}
a{color:inherit}svg{width:20px;height:20px;flex-shrink:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 18px}
.demo{background:var(--accent);color:var(--on-accent);font-size:12.5px;font-weight:700;padding:7px 16px;text-align:center}
nav{position:sticky;top:0;z-index:8;background:${rgba(T.bg, .82)};-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;gap:16px;height:60px}
.logo{font:800 18px/1 var(--head);letter-spacing:.02em;text-decoration:none;margin-right:auto;text-transform:uppercase}
${s.logoFont === 'script' ? '.logo{font:400 30px/1 "Kaushan Script",cursive;text-transform:none;letter-spacing:0}.hero h1.script{font-family:"Kaushan Script",cursive;text-transform:none;letter-spacing:0;font-weight:400}' : ''}
nav .links{display:none;gap:22px;font-weight:600;font-size:14px}
nav .links a{text-decoration:none;color:var(--muted)}nav .links a:hover{color:var(--ink)}
@media(min-width:760px){nav .links{display:flex}}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:14px 20px;border-radius:999px;font-weight:800;text-decoration:none;font-size:16px;transition:transform .15s,filter .15s;border:0;cursor:pointer;font-family:inherit}
.btn:active{transform:scale(.97)}.btn:hover{filter:brightness(1.08)}
.btn-main{background:var(--accent);color:var(--on-accent)}.btn-wa{background:var(--wa);color:#fff}
.btn-ghost{background:transparent;color:var(--ink);border:1.5px solid ${rgba(T.ink, .25)}}
.btn.sm{padding:10px 14px;font-size:14px;width:100%}
nav .btn{padding:9px 14px;font-size:14px}

/* Первый экран */
.hero{position:relative;isolation:isolate;overflow:hidden;min-height:min(86vh,760px);display:flex;align-items:flex-end;background:radial-gradient(90% 70% at 80% 10%,${rgba(T.accent, .28)},transparent 60%),linear-gradient(180deg,${T.surface},${T.bg})}
.hero-bg{position:absolute;inset:0;z-index:-2;background-size:cover;background-position:center}
.hero.has-photo:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.35) 45%,${rgba(T.bg, .96)} 100%)}
.hero-in{width:100%;padding-top:120px;padding-bottom:48px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.hero h1{font:800 clamp(40px,11vw,112px)/.95 var(--head);letter-spacing:-.03em;margin:14px 0 16px;text-transform:uppercase;overflow-wrap:break-word}
.tagline{font-size:clamp(17px,4.3vw,22px);max-width:34ch;color:${rgba(T.ink, .85)};margin-bottom:24px}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}
.chip{font-size:13px;font-weight:700;padding:7px 12px;border-radius:999px;background:${rgba(T.ink, .08)};border:1px solid ${rgba(T.ink, .12)};-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.chip b{color:var(--accent)}

section{padding:56px 0}
.kicker{font-size:12.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
h2{font:800 clamp(28px,7vw,48px)/1.05 var(--head);letter-spacing:-.02em;margin-bottom:22px;text-transform:uppercase}
.lead{font-size:18px;max-width:60ch}
.muted{color:var(--muted);font-size:14px}

/* Каталог */
.filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:18px;padding-bottom:4px}
.filters::-webkit-scrollbar{display:none}
.filters button{flex-shrink:0;font:700 14px "Manrope",sans-serif;padding:9px 15px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--muted);cursor:pointer}
.filters button.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
@media(min-width:760px){.grid{grid-template-columns:repeat(3,1fr);gap:18px}}
@media(min-width:1040px){.grid{grid-template-columns:repeat(4,1fr)}}
.p{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}
.p[hidden]{display:none}
.ph{position:relative;aspect-ratio:3/4;background:${rgba(T.ink, .04)}}
.ph img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s}
.p:hover .ph img{transform:scale(1.04)}
.noimg{width:100%;height:100%;background:repeating-linear-gradient(135deg,${rgba(T.ink, .04)} 0 12px,transparent 12px 24px)}
.sale{position:absolute;left:10px;top:10px;background:#ff3b30;color:#fff;font-weight:800;font-size:12px;padding:4px 8px;border-radius:8px}
.pi{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.pc{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.p h3{font-size:15px;font-weight:700;line-height:1.3}
.pd{font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sz{display:flex;gap:4px;flex-wrap:wrap}.sz span{font-size:11.5px;font-weight:700;border:1px solid var(--line);border-radius:6px;padding:2px 6px;color:var(--muted)}
.pr{display:flex;align-items:baseline;gap:8px;margin-top:auto;padding-top:4px}
.pr b{font:800 17px/1 var(--head)}.pr b.ask{font:700 13px "Manrope",sans-serif;color:var(--muted)}.pr s{color:var(--muted);font-size:13px}
.empty{border:1px dashed var(--line);border-radius:var(--r);padding:38px 20px;text-align:center;color:var(--muted)}
.empty b{display:block;color:var(--ink);font-size:18px;margin-bottom:6px}

/* Почему мы */
.why{display:grid;gap:12px;padding:0;list-style:none}
@media(min-width:760px){.why{grid-template-columns:repeat(3,1fr)}}
.why li{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:22px}
.why .n{font:800 34px/1 var(--head);color:var(--accent);display:block;margin-bottom:12px}
.why p{font-weight:700;font-size:16.5px}

/* Фото */
.gal{display:grid;grid-auto-flow:column;grid-auto-columns:72%;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.gal::-webkit-scrollbar{display:none}
.gal img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r);scroll-snap-align:start;display:block}
@media(min-width:760px){.gal{grid-auto-flow:row;grid-template-columns:repeat(4,1fr);grid-auto-columns:auto;overflow:visible}}

/* Отзывы */
.rv-head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px}.rv-head h2{margin:0}
.big{display:flex;align-items:center;gap:10px}.big b{font:800 46px/1 var(--head);color:var(--accent)}
.stars{color:#ffc53d;letter-spacing:2px;font-size:15px}
.rv{display:grid;grid-auto-flow:column;grid-auto-columns:86%;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.rv::-webkit-scrollbar{display:none}
.rv figure{scroll-snap-align:start;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px}
.rv blockquote{margin-top:10px}
@media(min-width:760px){.rv{grid-auto-flow:row;grid-template-columns:repeat(2,1fr);grid-auto-columns:auto;overflow:visible}}
.src{font-size:13.5px;color:var(--muted);margin-top:14px}

/* Контакты */
.loc{display:grid;gap:12px}@media(min-width:760px){.loc{grid-template-columns:1fr 1.3fr}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:22px}
.addr{font:800 20px/1.3 var(--head);margin-bottom:6px}
.links{display:flex;gap:14px;flex-wrap:wrap;margin-top:16px;font-weight:700}.links a{color:var(--accent);text-decoration:none;display:inline-flex;gap:6px;align-items:center}
.map{width:100%;height:100%;min-height:300px;border:0;border-radius:var(--r);display:block}
.final{margin:0 0 40px;border-radius:28px;padding:40px 24px;background:var(--accent);color:var(--on-accent)}
.final h2{margin-bottom:10px}.final p{font-size:17px;margin-bottom:22px;opacity:.85}
.final .btn-main{background:var(--on-accent);color:var(--accent)}
footer{padding:0 0 30px;color:var(--muted);font-size:12.5px;text-align:center}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:9;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:${rgba(T.bg, .88)};-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-top:1px solid var(--line)}
.bar .btn{flex:1;padding:13px 10px;font-size:15px}
@media(min-width:900px){.bar{display:none}body{padding-bottom:0}}
.ph,[data-open]{cursor:pointer}
.modal{position:fixed;inset:0;z-index:20;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.modal.open{display:flex}
.sheet{background:var(--surface);border:1px solid var(--line);border-radius:24px 24px 0 0;width:100%;max-width:880px;max-height:92vh;overflow:auto;display:grid;animation:up .25s ease}
@keyframes up{from{transform:translateY(40px);opacity:0}}
@media(min-width:760px){.modal{align-items:center;padding:20px}.sheet{border-radius:24px;grid-template-columns:1.1fr 1fr}}
.sheet .big{position:relative;background:${rgba(T.ink, .04)};min-height:120px}.sheet .big img{width:100%;height:100%;max-height:70vh;object-fit:cover;display:block}
.sheet .info{padding:22px;display:flex;flex-direction:column;gap:10px}
.sheet h3{font:800 24px/1.15 var(--head);text-transform:uppercase}
.sheet .pr b{font-size:24px}.sheet .sz span{font-size:13px;padding:5px 9px}
.sheet .x{position:absolute;right:12px;top:12px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:22px;cursor:pointer}
.sheet .info .btn{margin-top:auto}
.reveal{opacity:0;transform:translateY(16px);transition:opacity .6s,transform .6s}.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}}
</style>
</head>
<body>
<div class="demo">Демо-концепт, не официальный сайт. Удалим по первой просьбе.</div>
<nav><div class="wrap"><a class="logo" href="#top">${esc(s.name)}</a><div class="links"><a href="#catalog">Каталог</a>${reviews.length ? '<a href="#reviews">Отзывы</a>' : ''}<a href="#contacts">Контакты</a></div>${wa ? `<a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">${ICON_WA}<span>Написать</span></a>` : ''}</div></nav>

<header class="hero${s.hero ? ' has-photo' : ''}" id="top">
  ${s.hero ? `<div class="hero-bg" style="background-image:url('${esc(s.hero)}')" role="img" aria-label="${esc(s.name)}"></div>` : ''}
  <div class="wrap hero-in">
    <span class="eyebrow">${esc(s.niche || 'магазин одежды')} · Бишкек</span>
    <h1${s.logoFont === 'script' ? ' class="script"' : ''}>${esc(s.name)}</h1>
    ${c.tagline ? `<p class="tagline">${esc(c.tagline)}</p>` : ''}
    <div class="btns"><a class="btn btn-main" href="#catalog">Смотреть каталог</a>${wa ? `<a class="btn btn-ghost" href="${wa}" target="_blank" rel="noopener">${ICON_WA}<span>WhatsApp</span></a>` : ''}</div>
    <div class="chips">
      ${s.rating ? `<span class="chip"><b>★ ${esc(String(s.rating).replace('.', ','))}</b> · ${num(s.reviews_count)} ${plural(s.reviews_count, 'отзыв', 'отзыва', 'отзывов')} в 2ГИС</span>` : ''}
      ${hours ? `<span class="chip">${esc(hours)}</span>` : ''}
      ${delivery ? '<span class="chip">Есть доставка</span>' : ''}
      ${s.district ? `<span class="chip">${esc(s.district)}</span>` : ''}
    </div>
  </div>
</header>

<div class="wrap">
${c.about ? `<section class="reveal"><div class="kicker">О магазине</div><p class="lead">${esc(c.about)}</p></section>` : ''}

<section id="catalog" style="padding-top:${c.about ? '0' : '56px'}"><div class="kicker">Каталог</div><h2>В наличии</h2>
${visible.length ? `${cats.length > 1 ? `<div class="filters" id="filters"><button class="on" data-c="">Все</button>${cats.map(x => `<button data-c="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
<div class="grid" id="grid">${visible.map(card).join('')}</div>
<p class="src">Наличие и размеры уточняйте${wa ? ' в WhatsApp' : ' по телефону'} — ответим быстро.</p>`
  : `<div class="empty"><b>Каталог скоро появится</b>Новинки — в нашем Instagram${s.instagram ? `: <a href="${esc(s.instagram)}" target="_blank" rel="noopener" style="color:var(--accent)">@${esc(s.instagram.split('/').filter(Boolean).pop())}</a>` : ''}</div>`}
</section>

${praise.length ? `<section class="reveal"><div class="kicker">Почему к нам</div><h2>За что любят</h2><ul class="why">${praise.map((p, i) => `<li><span class="n">0${i + 1}</span><p>${esc(p)}</p></li>`).join('')}</ul></section>` : ''}

${photos.length ? `<section class="reveal"><div class="kicker">Магазин</div><h2>Как у нас</h2><div class="gal">${photos.map(p => `<img src="${esc(p)}" alt="" loading="lazy">`).join('')}</div></section>` : ''}

${reviews.length ? `<section class="reveal" id="reviews"><div class="kicker">Отзывы</div>
<div class="rv-head"><h2>Что пишут</h2>${s.rating ? `<div class="big"><b>${esc(String(s.rating).replace('.', ','))}</b><div>${STARS}<div class="muted">${num(s.reviews_count)} ${plural(s.reviews_count, 'отзыв', 'отзыва', 'отзывов')} в 2ГИС</div></div></div>` : ''}</div>
<div class="rv">${reviews.map(r => `<figure>${STARS}<blockquote>${esc(r.text)}</blockquote></figure>`).join('')}</div>
${s.source_url ? `<p class="src">Пересказ отзывов. Оригиналы — <a href="${esc(s.source_url)}" target="_blank" rel="noopener">в карточке 2ГИС</a>.</p>` : ''}</section>` : ''}

<section class="reveal" id="contacts"><div class="kicker">Контакты</div><h2>Приходите</h2>
<div class="loc"><div class="card">
${s.address ? `<div class="addr">${esc(s.address)}</div><div class="muted">${esc([s.address_comment, s.district, 'Бишкек'].filter(Boolean).join(' · '))}</div>` : ''}
${hours ? `<p style="margin-top:14px;font-weight:700">Работаем ${esc(hours)}</p>` : ''}
<div class="links">${s.phone ? `<a href="${tel(s.phone)}">${ICON_PHONE}${esc(s.phone)}</a>` : ''}${wa ? `<a href="${wa}" target="_blank" rel="noopener">${ICON_WA}WhatsApp</a>` : ''}${s.instagram ? `<a href="${esc(s.instagram)}" target="_blank" rel="noopener">${ICON_IG}Instagram</a>` : ''}</div>
${s.source_url ? `<div class="links"><a href="${esc(s.source_url)}" target="_blank" rel="noopener">Построить маршрут в 2ГИС →</a></div>` : ''}
</div>
${s.coords ? `<iframe class="map" loading="lazy" title="Карта" src="https://yandex.ru/map-widget/v1/?ll=${s.coords.lon},${s.coords.lat}&z=16&pt=${s.coords.lon},${s.coords.lat},pm2rdm"></iframe>` : ''}
</div></section>

${wa ? `<div class="final reveal"><h2>${esc(c.cta || 'Подберём размер за минуту')}</h2><p>Напишите, что понравилось — подскажем по размеру и наличию${delivery ? ', доставим' : ''}.</p><a class="btn btn-main" href="${wa}" target="_blank" rel="noopener">${ICON_WA}<span>Написать в WhatsApp</span></a></div>` : ''}
<footer>Демо-концепт сайта для «${esc(s.name)}». Не является официальным сайтом. Данные — из открытой карточки 2ГИС.</footer>
</div>
<div class="modal" id="modal" aria-hidden="true"><div class="sheet" role="dialog" aria-modal="true"><div class="big"><img id="mImg" alt=""><button class="x" id="mClose" aria-label="Закрыть">×</button></div><div class="info"><div class="pc" id="mCat"></div><h3 id="mTitle"></h3><p class="pd" id="mDesc" style="-webkit-line-clamp:unset;display:block"></p><div class="sz" id="mSz"></div><div class="pr" id="mPr"></div><a class="btn btn-main" id="mOrder" target="_blank" rel="noopener">${ICON_WA}<span>Заказать в WhatsApp</span></a></div></div></div>
<script type="application/json" id="P">${JSON.stringify(visible.map(it => ({ id: it.id, t: it.title, c: it.category, d: it.description, s: it.sizes, p: it.price, o: it.old_price, i: it.image, u: wa ? wa + '?text=' + encodeURIComponent(orderText(it)) : null }))).replace(/</g, '\\u003c')}</script>
<div class="bar">${wa ? `<a class="btn btn-wa" href="${wa}" target="_blank" rel="noopener">${ICON_WA}<span>WhatsApp</span></a>` : ''}${s.phone ? `<a class="btn btn-main" href="${tel(s.phone)}">${ICON_PHONE}<span>Позвонить</span></a>` : ''}</div>
<script>
(function(){
var f=document.getElementById('filters');
if(f)f.onclick=function(e){var b=e.target.closest('button');if(!b)return;[].forEach.call(f.children,function(x){x.classList.toggle('on',x===b)});var c=b.getAttribute('data-c');[].forEach.call(document.querySelectorAll('.p'),function(p){p.hidden=!!c&&p.getAttribute('data-cat')!==c})};
var SLUG=${JSON.stringify(s.slug)};
var vid;try{vid=localStorage.getItem('vid');if(!vid){vid=Math.random().toString(36).slice(2,14)+Date.now().toString(36);localStorage.setItem('vid',vid)}}catch(_){vid=null}
function ev(type,pid){try{var b=JSON.stringify({type:type,product_id:pid||undefined,vid:vid,ref:document.referrer});if(navigator.sendBeacon)navigator.sendBeacon('/api/'+SLUG+'/event',new Blob([b],{type:'text/plain'}));else fetch('/api/'+SLUG+'/event',{method:'POST',body:b,keepalive:true})}catch(_){}}
ev('view');
var P={};try{JSON.parse(document.getElementById('P').textContent).forEach(function(x){P[x.id]=x})}catch(_){}
var m=document.getElementById('modal'),fmt=function(n){return Number(n).toLocaleString('ru-RU')},$i=function(i){return document.getElementById(i)};
function openP(id){var x=P[id];if(!x)return;$i('mImg').src=x.i||'';$i('mImg').style.display=x.i?'':'none';$i('mCat').textContent=x.c||'';$i('mTitle').textContent=x.t;$i('mDesc').textContent=x.d||'';
$i('mSz').innerHTML='';(x.s||'').split(/\\s*,\\s*/).filter(Boolean).forEach(function(z){var sp=document.createElement('span');sp.textContent=z;$i('mSz').appendChild(sp)});
$i('mPr').innerHTML=x.p?'<b>'+fmt(x.p)+' сом</b>'+(x.o&&x.o>x.p?'<s>'+fmt(x.o)+'</s>':''):'<b class="ask">цена по запросу</b>';
var o=$i('mOrder');if(x.u){o.href=x.u;o.style.display='';o.setAttribute('data-order',id)}else o.style.display='none';
m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';ev('product',id);try{history.replaceState(null,'','#p'+id)}catch(_){}}
function closeP(){m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';try{history.replaceState(null,'',location.pathname)}catch(_){}}
document.addEventListener('click',function(e){var t=e.target.closest('[data-open]');if(t){openP(+t.getAttribute('data-open'));return}
 var a=e.target.closest('a');if(!a)return;if(a.hasAttribute('data-order'))ev('order',+a.getAttribute('data-order'));else if(/wa\\.me/.test(a.href))ev('wa');else if(/^tel:/.test(a.href))ev('call')});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeP();if(e.key==='Enter'&&e.target.hasAttribute&&e.target.hasAttribute('data-open'))openP(+e.target.getAttribute('data-open'))});
m.addEventListener('click',function(e){if(e.target===m)closeP()});$i('mClose').onclick=closeP;
if(/^#p\\d+$/.test(location.hash))openP(+location.hash.slice(2));
var rs=document.querySelectorAll('.reveal');
if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});rs.forEach(function(r){io.observe(r)})}else rs.forEach(function(r){r.classList.add('in')});
})();
</script>
</body></html>`;
};

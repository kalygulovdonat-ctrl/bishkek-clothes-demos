// data/raw-2gis.json + data/overrides.json → data/stores.json
// Запуск из папки clothes: node import.js
const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('data/raw-2gis.json', 'utf8'));
const overrides = fs.existsSync('data/overrides.json') ? JSON.parse(fs.readFileSync('data/overrides.json', 'utf8')) : {};
const tr = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:'',ө:'o',ү:'u',ң:'n' };
const slugify = s => s.toLowerCase().replace(/[а-яёөүң]/g, c => tr[c] ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
const fmtPhone = p => p.replace(/^\+996(\d{3})(\d{2})(\d{2})(\d{2})$/, '+996 $1 $2-$3-$4');
const THEMES = ['noir', 'rose', 'ocean'];

const used = new Set();
const out = raw.map((r, i) => {
  let slug = slugify(r.name === 'Магазин одежды' ? 'afilin store' : r.name) || 'store';
  while (used.has(slug)) slug += '-2';
  used.add(slug);
  const s = {
    slug, id: r.id, name: r.name, niche: r.ext || (r.rubrics[0] || 'магазин одежды').toLowerCase(),
    source_url: `https://2gis.kg/bishkek/firm/${r.id}`,
    phone: r.phones[0] ? fmtPhone(r.phones[0]) : null,
    whatsapp: r.wa[0] || null, instagram: r.ig[0] || null,
    address: r.addr, address_comment: r.addr_comment, district: r.district, coords: r.pt,
    hours: r.hrs, rating: r.rating, reviews_count: r.rc,
    rubrics: r.rubrics, attrs: r.attrs, photos: [], hero: null,
    theme: THEMES[i % 3], accent: null
  };
  return Object.assign(s, overrides[r.id] || {});
});
fs.writeFileSync('data/stores.json', JSON.stringify(out, null, 1));
console.log('Магазинов:', out.length); out.forEach(s => console.log(' ', s.slug.padEnd(22), s.name));

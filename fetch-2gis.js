// Скачивает открытые карточки 2ГИС по списку id → clothes/data/raw-2gis.json
// Запуск из папки clothes: node fetch-2gis.js
const fs = require('fs');
const IDS = ["70000001048854769","70000001053418028","70000001074773693","70000001020072457","70000001083925519","70000001084284381","70000001099952045","70000001083863008","70000001090795784","70000001101914548","70000001028422259","70000001087770941","70000001118086997","70000001075164120","70000001114529157","70000001103202623","70000001037111081","70000001102710975","70000001075183943","70000001093354091","70000001027183459","70000001113629416","70000001110620592","70000001103456028","70000001032783612","70000001094134512","70000001101329906","70000001066886331","70000001083801426","70000001088772185","70000001088460465"];
const D = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };

async function profile(id) {
  const h = await (await fetch(`https://2gis.kg/bishkek/firm/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ru' } })).text();
  const a = h.indexOf("var initialState = JSON.parse('") + 31, b = h.indexOf("');", a);
  const st = JSON.parse(h.slice(a, b).replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  return st.data.entity.profile[id].data;
}

(async () => {
  const out = [];
  for (const id of IDS) {
    const p = await profile(id);
    const cs = (p.contact_groups || []).flatMap(g => g.contacts || []);
    const hrs = {};
    for (const k in D) { const w = p.schedule?.[k]?.working_hours; hrs[D[k]] = w ? `${w[0].from}-${w[w.length - 1].to}` : null; }
    out.push({
      id, name: p.name_ex?.primary || p.name, ext: p.name_ex?.extension || null,
      addr: p.address_name || null, addr_comment: p.address_comment || null,
      district: (p.adm_div || []).find(x => x.type === 'district')?.name || null,
      rating: p.reviews?.general_rating, rc: p.reviews?.general_review_count, pt: p.point, hrs,
      phones: [...new Set(cs.filter(k => k.type === 'phone').map(k => k.value))],
      wa: [...new Set(cs.filter(k => k.type === 'whatsapp').map(k => (k.value.match(/wa\.me\/(\d+)/) || [])[1]).filter(Boolean))],
      ig: cs.filter(k => k.type === 'instagram').map(k => k.url || k.value),
      rubrics: (p.rubrics || []).map(r => r.name),
      attrs: (p.attribute_groups || []).filter(g => g.is_primary && !/Премия|Дополнительно/.test(g.name)).flatMap(g => g.attributes.map(a => a.name)),
      photos: (p.external_content || []).filter(k => k.type === 'photo_album').reduce((s, k) => s + (k.count || 0), 0)
    });
    process.stdout.write('.');
  }
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/raw-2gis.json', JSON.stringify(out, null, 1));
  console.log('\nСохранено:', out.length);
})();

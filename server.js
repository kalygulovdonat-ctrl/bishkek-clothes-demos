// Сервер демо-сайтов магазинов одежды: витрина + админка товаров.
// Локально: node server.js  → SQLite в data/shop.db.  На Render: DATABASE_URL → PostgreSQL.
// ADMIN_SECRET — один секрет, из которого вычисляются пароли всех админок и подпись входа.
// Пароли: node server.js --passwords   (печатает пароль каждого магазина)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const openDb = require('./db');
const renderStore = require('./template/store.js');
const renderAdmin = require('./template/admin.js');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4400);

// ---------- Секрет ----------
function loadSecret() {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  const f = path.join(ROOT, 'data', '.secret');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
}
const SECRET = loadSecret();
const hmac = v => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
// Пароли админок: в data/admins.json лежат только scrypt-отпечатки. Сами пароли — у владельца проекта (passwords.md).
const ADMINS_FILE = path.join(ROOT, 'data', 'admins.json');
const ADMINS = fs.existsSync(ADMINS_FILE) ? JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')) : {};
const scrypt = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');

// Показываем только магазины, для которых уже написаны тексты (content/<slug>.json)
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8'))
  .filter(s => fs.existsSync(path.join(ROOT, 'content', s.slug + '.json')));
const findStore = slug => STORES.find(s => s.slug === slug);
const content = slug => { const f = path.join(ROOT, 'content', slug + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; };

// node server.js --new-passwords  — выдать пароли магазинам, у которых их ещё нет:
// отпечатки → data/admins.json (в репозиторий), сами пароли → passwords.md (только локально)
if (process.argv[2] === '--new-passwords') {
  const pwFile = path.join(ROOT, 'passwords.md');
  let md = fs.existsSync(pwFile) ? fs.readFileSync(pwFile, 'utf8') : '# Пароли админок (только у вас, не в репозитории)\n\n| Магазин | Админка | Пароль |\n|---|---|---|\n';
  for (const s of STORES) {
    if (ADMINS[s.slug]) continue;
    const pw = crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x');
    const salt = crypto.randomBytes(16).toString('hex');
    ADMINS[s.slug] = { salt, hash: scrypt(pw, salt) };
    md += `| ${s.name} | /${s.slug}/admin | \`${pw}\` |\n`;
    console.log('Новый пароль:', s.slug);
  }
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(ADMINS, null, 1));
  fs.writeFileSync(pwFile, md);
  process.exit(0);
}

const db = openDb(ROOT);

// ---------- Вход ----------
function checkPassword(slug, pw) {
  const rec = ADMINS[slug];
  if (!rec || typeof pw !== 'string' || pw.length > 200) return false;
  const a = Buffer.from(scrypt(pw, rec.salt), 'hex'), b = Buffer.from(rec.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function makeToken(slug) { const exp = Date.now() + 7 * 864e5; const v = `${slug}.${exp}`; return `${v}.${hmac('session:' + v)}`; }
function isAuthed(req, slug) {
  const name = 'adm_' + slug.replace(/[^a-z0-9-]/g, '');
  const m = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(name + '='));
  if (!m) return false;
  const [s, exp, sig] = decodeURIComponent(m.slice(name.length + 1)).split('.');
  if (s !== slug || !(Number(exp) > Date.now()) || !sig) return false;
  const good = hmac(`session:${s}.${exp}`);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
const SECURE = process.env.RENDER ? '; Secure' : '';
// Не больше 10 неверных паролей за 10 минут с одного адреса
const fails = new Map();
const clientIp = req => (process.env.RENDER && (req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';
const recentFails = ip => { const now = Date.now(), l = (fails.get(ip) || []).filter(t => now - t < 6e5); fails.set(ip, l); return l; };

// ---------- Помощники ----------
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function send(res, code, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'SAMEORIGIN', ...extra });
  res.end(body);
}
const json = (res, code, obj, extra) => send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });
function readBody(req, limit = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
function serveAsset(res, rel) {
  const base = path.join(ROOT, 'assets'), full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) return send(res, 404, 'Не найдено', 'text/plain; charset=utf-8');
  send(res, 200, fs.readFileSync(full), MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', { 'Cache-Control': 'public, max-age=604800' });
}
// Тип фото проверяем по первым байтам файла, а не по тому, что заявил браузер
function decodeImage(dataUrl) {
  const m = /^data:image\/[a-z+]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('bad_image');
  const buf = Buffer.from(m[1], 'base64');
  if (buf[0] === 0xff && buf[1] === 0xd8) return { buf, mime: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50) return { buf, mime: 'image/png' };
  if (buf.slice(8, 12).toString() === 'WEBP') return { buf, mime: 'image/webp' };
  throw new Error('bad_image');
}
async function storeImage(slug, buf, mime) { const id = crypto.randomBytes(10).toString('hex'); await db.putImage(id, slug, mime, buf); return id; }
const cleanText = (v, max) => (v == null ? null : String(v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) || null);
const cleanInt = v => (v === '' || v == null ? null : Number.isFinite(+v) && +v >= 0 && +v < 1e8 ? Math.round(+v) : null);
function productFields(b) {
  const title = cleanText(b.title, 120);
  if (!title) throw new Error('no_title');
  return { title, price: cleanInt(b.price), old_price: cleanInt(b.old_price), category: cleanText(b.category, 40), sizes: cleanText(b.sizes, 80), description: cleanText(b.description, 600), in_stock: b.in_stock === false || b.in_stock === 0 ? 0 : 1 };
}
const ERR = { too_big: 'Файл слишком большой (до 5 МБ)', bad_json: 'Неверный запрос', bad_image: 'Нужно фото JPG, PNG или WEBP', no_title: 'Укажите название товара' };

// ---------- Стартовые товары для демо (seed/<slug>/manifest.json), только если у магазина пусто ----------
async function seedAll() {
  for (const s of STORES) {
    const mf = path.join(ROOT, 'seed', s.slug, 'manifest.json');
    if (!fs.existsSync(mf) || await db.count(s.slug)) continue;
    const list = JSON.parse(fs.readFileSync(mf, 'utf8'));
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const imageId = it.file ? await storeImage(s.slug, fs.readFileSync(path.join(ROOT, 'seed', s.slug, it.file)), 'image/jpeg') : null;
      await db.insert(s.slug, { ...productFields(it), sort: list.length - i }, imageId);
    }
    console.log(`Стартовые товары: ${s.slug} — ${list.length}`);
  }
}

// ---------- Маршруты ----------
const ROOT_PAGE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="dark"><title>Демо-концепты</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#121417;color:#9aa0a8;font:16px system-ui;text-align:center;padding:16px"><div><b style="color:#f2f2ef;font-size:22px;display:block;margin-bottom:8px">Демо-концепты сайтов</b>Ссылку на свою страницу вы получили лично.</div>';

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

    if (url.pathname === '/robots.txt') return send(res, 200, 'User-agent: *\nDisallow: /\n', 'text/plain');
    if (url.pathname === '/healthz') return send(res, 200, 'ok', 'text/plain');
    if (url.pathname === '/') return send(res, 200, ROOT_PAGE);
    if (parts[0] === 'assets') return serveAsset(res, parts.slice(1).join('/'));
    if (parts[0] === 'img' && /^[0-9a-f]{20}$/.test(parts[1] || '')) {
      const img = await db.getImage(parts[1]);
      return img ? send(res, 200, Buffer.from(img.data), img.mime, { 'Cache-Control': 'public, max-age=31536000, immutable' }) : send(res, 404, 'Нет фото', 'text/plain; charset=utf-8');
    }

    if (parts[0] === 'api') {
      const slug = parts[1]; const store = slug && findStore(slug);
      if (!store) return json(res, 404, { error: 'Магазин не найден' });

      if (parts[2] === 'products' && req.method === 'GET' && !parts[3]) return json(res, 200, await db.list(slug));

      if (parts[2] === 'login' && req.method === 'POST') {
        const ip = clientIp(req), l = recentFails(ip);
        if (l.length >= 10) return json(res, 429, { error: 'Слишком много попыток. Подождите 10 минут.' });
        const b = await readBody(req, 4096);
        if (!checkPassword(slug, b.password)) { l.push(Date.now()); return json(res, 401, { error: 'Неверный пароль' }); }
        return json(res, 200, { ok: true }, { 'Set-Cookie': `adm_${slug}=${encodeURIComponent(makeToken(slug))}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${SECURE}` });
      }
      if (parts[2] === 'logout' && req.method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': `adm_${slug}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${SECURE}` });

      // Ниже — только для владельца этого магазина
      if (!isAuthed(req, slug)) return json(res, 401, { error: 'Нужно войти' });
      if ((req.method === 'POST' || req.method === 'PUT') && !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Только JSON' });

      if (parts[2] === 'products' && req.method === 'POST' && !parts[3]) {
        const b = await readBody(req); const f = productFields(b);
        let imageId = null;
        if (b.image) { const { buf, mime } = decodeImage(b.image); imageId = await storeImage(slug, buf, mime); }
        const id = await db.insert(slug, f, imageId);
        return json(res, 201, await db.one(id, slug));
      }
      const id = Number(parts[3]);
      const row = parts[2] === 'products' && id ? await db.one(id, slug) : null;
      if (parts[2] === 'products' && id && !row) return json(res, 404, { error: 'Товар не найден' });
      if (row && req.method === 'PUT') {
        const b = await readBody(req); const f = productFields(b);
        let imageId = row.image_id;
        if (typeof b.image === 'string' && b.image.startsWith('data:')) { const { buf, mime } = decodeImage(b.image); imageId = await storeImage(slug, buf, mime); await db.dropImage(row.image_id); }
        if (b.image === null) { await db.dropImage(row.image_id); imageId = null; }
        await db.update(id, f, imageId);
        return json(res, 200, await db.one(id, slug));
      }
      if (row && req.method === 'DELETE') { await db.remove(id); await db.dropImage(row.image_id); return json(res, 200, { ok: true }); }
      return json(res, 404, { error: 'Нет такого действия' });
    }

    const store = parts[0] && findStore(parts[0]);
    if (!store) return send(res, 404, 'Страница не найдена', 'text/plain; charset=utf-8');
    if (parts.length === 1 && !url.pathname.endsWith('/')) return send(res, 301, '', 'text/plain', { Location: `/${store.slug}/` });
    if (parts[1] === 'admin' && parts.length === 2) return send(res, 200, renderAdmin(store, isAuthed(req, store.slug)), 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
    if (parts.length === 1) return send(res, 200, renderStore(store, content(store.slug), await db.list(store.slug)), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
    return send(res, 404, 'Страница не найдена', 'text/plain; charset=utf-8');
  } catch (e) {
    const msg = ERR[e.message];
    if (msg) return json(res, 400, { error: msg });
    console.error(e);
    return json(res, 500, { error: 'Ошибка сервера' });
  }
});

seedAll().catch(e => console.error('Ошибка стартовых товаров:', e.message))
  .finally(() => server.listen(PORT, () => console.log(`Сервер (${db.kind}): http://localhost:${PORT}/`)));

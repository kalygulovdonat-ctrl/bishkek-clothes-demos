// Хранилище товаров и фото. Если задан DATABASE_URL — PostgreSQL (Render), иначе SQLite-файл (локально).
// Фото хранятся в самой базе: на бесплатном Render диск стирается при каждом перезапуске.
const path = require('path');
const fs = require('fs');

// Статистика: одно событие = одна строка. Без IP и личных данных — только случайный id браузера (vid).
const EVENTS = pk => `CREATE TABLE IF NOT EXISTS events (id ${pk}, slug TEXT NOT NULL, type TEXT NOT NULL, product_id INTEGER,
  day TEXT NOT NULL, vid TEXT, ref TEXT, device TEXT);
CREATE INDEX IF NOT EXISTS events_slug_day ON events(slug, day);`;

const COLS = 'id, slug, title, price, old_price, category, sizes, description, image_id, in_stock, sort';

function sqliteStore(file) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, title TEXT NOT NULL, price INTEGER, old_price INTEGER,
  category TEXT, sizes TEXT, description TEXT, image_id TEXT, in_stock INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS products_slug ON products(slug);
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, slug TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL);
${EVENTS('INTEGER PRIMARY KEY AUTOINCREMENT')}`);
  const q = (sql, p = []) => db.prepare(sql);
  return {
    kind: 'sqlite',
    all: async (sql, p = []) => q(sql).all(...p),
    get: async (sql, p = []) => q(sql).get(...p),
    run: async (sql, p = []) => { const r = q(sql).run(...p); return { id: Number(r.lastInsertRowid) }; }
  };
}

function pgStore(url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 5 });
  const conv = sql => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };
  const ready = pool.query(`
CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, price INTEGER, old_price INTEGER,
  category TEXT, sizes TEXT, description TEXT, image_id TEXT, in_stock INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS products_slug ON products(slug);
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, slug TEXT NOT NULL, mime TEXT NOT NULL, data BYTEA NOT NULL);
${EVENTS('SERIAL PRIMARY KEY')}`);
  return {
    kind: 'postgres',
    all: async (sql, p = []) => { await ready; return (await pool.query(conv(sql), p)).rows; },
    get: async (sql, p = []) => { await ready; return (await pool.query(conv(sql), p)).rows[0]; },
    run: async (sql, p = []) => { await ready; const isIns = /^\s*INSERT/i.test(sql); const r = await pool.query(conv(sql) + (isIns ? ' RETURNING id' : ''), p); return { id: isIns ? r.rows[0].id : null }; }
  };
}

module.exports = function open(root) {
  const s = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : sqliteStore(path.join(root, 'data', 'shop.db'));
  const withUrl = r => r && { ...r, image: r.image_id ? `/img/${r.image_id}` : null };
  return {
    kind: s.kind,
    list: async slug => (await s.all(`SELECT ${COLS} FROM products WHERE slug = ? ORDER BY sort DESC, id DESC`, [slug])).map(withUrl),
    one: async (id, slug) => withUrl(await s.get(`SELECT ${COLS} FROM products WHERE id = ? AND slug = ?`, [id, slug])),
    count: async slug => Number((await s.get('SELECT COUNT(*) AS n FROM products WHERE slug = ?', [slug])).n),
    insert: async (slug, f, imageId) => {
      const top = Number((await s.get('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM products WHERE slug = ?', [slug])).s);
      const r = await s.run('INSERT INTO products(slug,title,price,old_price,category,sizes,description,image_id,in_stock,sort) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [slug, f.title, f.price, f.old_price, f.category, f.sizes, f.description, imageId, f.in_stock, f.sort ?? top]);
      return r.id;
    },
    update: (id, f, imageId) => s.run('UPDATE products SET title=?,price=?,old_price=?,category=?,sizes=?,description=?,image_id=?,in_stock=? WHERE id=?',
      [f.title, f.price, f.old_price, f.category, f.sizes, f.description, imageId, f.in_stock, id]),
    remove: id => s.run('DELETE FROM products WHERE id = ?', [id]),
    putImage: (id, slug, mime, buf) => s.run('INSERT INTO images(id, slug, mime, data) VALUES (?,?,?,?)', [id, slug, mime, buf]),
    getImage: id => s.get('SELECT mime, data FROM images WHERE id = ?', [id]),
    dropImage: id => id ? s.run('DELETE FROM images WHERE id = ?', [id]) : null,

    logEvent: e => s.run('INSERT INTO events(slug,type,product_id,day,vid,ref,device) VALUES (?,?,?,?,?,?,?)', [e.slug, e.type, e.product_id, e.day, e.vid, e.ref, e.device]),
    // Сводка за период: from — первая дата (YYYY-MM-DD) включительно
    stats: async (slug, from) => {
      const n = r => Number(r || 0);
      const byType = await s.all('SELECT type, COUNT(*) AS c, COUNT(DISTINCT vid) AS u FROM events WHERE slug = ? AND day >= ? GROUP BY type', [slug, from]);
      const visitors = n((await s.get("SELECT COUNT(DISTINCT vid) AS u FROM events WHERE slug = ? AND day >= ? AND type = 'view'", [slug, from])).u);
      const daily = await s.all("SELECT day, SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views, COUNT(DISTINCT CASE WHEN type='view' THEN vid END) AS visitors, SUM(CASE WHEN type IN ('order','wa','call') THEN 1 ELSE 0 END) AS leads FROM events WHERE slug = ? AND day >= ? GROUP BY day ORDER BY day", [slug, from]);
      const products = await s.all("SELECT product_id, SUM(CASE WHEN type='product' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN type='order' THEN 1 ELSE 0 END) AS orders FROM events WHERE slug = ? AND day >= ? AND product_id IS NOT NULL GROUP BY product_id", [slug, from]);
      const refs = await s.all("SELECT COALESCE(ref, '') AS ref, COUNT(*) AS c FROM events WHERE slug = ? AND day >= ? AND type = 'view' GROUP BY ref ORDER BY c DESC LIMIT 8", [slug, from]);
      const devices = await s.all("SELECT COALESCE(device, '') AS device, COUNT(*) AS c FROM events WHERE slug = ? AND day >= ? AND type = 'view' GROUP BY device", [slug, from]);
      const t = Object.fromEntries(byType.map(r => [r.type, n(r.c)]));
      return {
        views: t.view || 0, visitors, product_views: t.product || 0, orders: t.order || 0, wa: t.wa || 0, calls: t.call || 0,
        daily: daily.map(d => ({ day: d.day, views: n(d.views), visitors: n(d.visitors), leads: n(d.leads) })),
        products: products.map(p => ({ id: Number(p.product_id), views: n(p.views), orders: n(p.orders) })),
        refs: refs.map(r => ({ ref: r.ref, c: n(r.c) })), devices: devices.map(d => ({ device: d.device, c: n(d.c) }))
      };
    }
  };
};

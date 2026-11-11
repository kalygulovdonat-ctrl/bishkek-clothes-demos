// Хранилище товаров и фото. Если задан DATABASE_URL — PostgreSQL (Render), иначе SQLite-файл (локально).
// Фото хранятся в самой базе: на бесплатном Render диск стирается при каждом перезапуске.
const path = require('path');
const fs = require('fs');

const COLS = 'id, slug, title, price, old_price, category, sizes, description, image_id, in_stock, sort';

function sqliteStore(file) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL, title TEXT NOT NULL, price INTEGER, old_price INTEGER,
  category TEXT, sizes TEXT, description TEXT, image_id TEXT, in_stock INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS products_slug ON products(slug);
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, slug TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL);`);
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
CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, slug TEXT NOT NULL, mime TEXT NOT NULL, data BYTEA NOT NULL);`);
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
    dropImage: id => id ? s.run('DELETE FROM images WHERE id = ?', [id]) : null
  };
};

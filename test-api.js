// Проверка бэкенда: node test-api.js [адрес]   (по умолчанию http://localhost:4400)
// Создаёт и удаляет тестовый товар, проверяет защиту. Пароль берёт из того же секрета, что и сервер.
const fs = require('fs');
const { execFileSync } = require('child_process');
const B = process.argv[2] || 'http://localhost:4400';
const SLUG = 'the-bull';
const pw = execFileSync(process.execPath, ['server.js', '--passwords'], { cwd: __dirname, env: process.env }).toString()
  .split('\n').find(l => l.startsWith(SLUG + ' ')).trim().split(/\s+/)[1];

let cookie = '';
async function call(method, path, body, withCookie = true) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(withCookie && cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; }
  return { code: r.status, j };
}
const ok = (name, cond, extra = '') => { console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) process.exitCode = 1; };

(async () => {
  const start = await call('GET', `/api/${SLUG}/products`);
  ok('список товаров', start.code === 200, `${start.j.length} шт.`);
  ok('без входа нельзя добавить', (await call('POST', `/api/${SLUG}/products`, { title: 'x' }, false)).code === 401);
  ok('неверный пароль', (await call('POST', `/api/${SLUG}/login`, { password: 'wrong' })).code === 401);
  ok('вход', (await call('POST', `/api/${SLUG}/login`, { password: pw })).code === 200);
  const img = 'data:image/jpeg;base64,' + fs.readFileSync(`${__dirname}/seed/${SLUG}/18t.jpg`).toString('base64');
  const add = await call('POST', `/api/${SLUG}/products`, { title: 'Тестовая куртка', price: 4990, old_price: 6990, category: 'Куртки', sizes: 'M, L', image: img });
  ok('добавить товар с фото', add.code === 201 && add.j.title === 'Тестовая куртка' && !!add.j.image, add.j.image);
  const pic = await fetch(B + add.j.image);
  ok('фото отдаётся из базы', pic.status === 200 && pic.headers.get('content-type') === 'image/jpeg');
  const upd = await call('PUT', `/api/${SLUG}/products/${add.j.id}`, { title: 'Тестовая куртка 2', price: 3990, in_stock: false });
  ok('изменить и скрыть', upd.code === 200 && upd.j.price === 3990 && upd.j.in_stock === 0 && upd.j.image === add.j.image);
  ok('поддельный файл отклонён', (await call('POST', `/api/${SLUG}/products`, { title: 'x', image: 'data:image/png;base64,SGVsbG8=' })).code === 400);
  ok('чужой магазин недоступен', [401, 404].includes((await call('POST', `/api/modo/products`, { title: 'x' })).code));
  const page = await (await fetch(`${B}/${SLUG}/`)).text();
  ok('скрытый товар не на витрине', !page.includes('Тестовая куртка 2'));
  ok('удалить', (await call('DELETE', `/api/${SLUG}/products/${add.j.id}`)).code === 200);
  ok('фото удалено вместе с товаром', (await fetch(B + add.j.image)).status === 404);
  const end = await call('GET', `/api/${SLUG}/products`);
  ok('список вернулся к исходному', end.j.length === start.j.length, `${end.j.length} шт.`);
})();

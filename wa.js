// Сообщения магазинам одежды. node wa.js --list | node wa.js --md (→ messages.md) | node wa.js <slug> (открыть чат с текстом)
// Ничего не отправляет само: открывает чат в WhatsApp Desktop с готовым текстом.
const fs = require('fs');
const { execFileSync } = require('child_process');
const B = 'https://bishkek-clothes-demos.onrender.com/';
const stores = JSON.parse(fs.readFileSync(__dirname + '/data/stores.json', 'utf8'));
const content = s => JSON.parse(fs.readFileSync(`${__dirname}/content/${s}.json`, 'utf8'));
const plural = n => { const m = n % 100, k = n % 10; return m > 10 && m < 20 ? 'отзывов' : k === 1 ? 'отзыв' : k > 1 && k < 5 ? 'отзыва' : 'отзывов'; };
// Номер WhatsApp должен быть похож на кыргызский: 996 + 9 цифр
const okWa = s => /^996\d{9}$/.test(s.whatsapp || '');
const list = stores.filter(okWa);

function text(s) {
  const p = (content(s.slug).praise || [])[0] || '';
  return [
    'Здравствуйте! Я программист.',
    `Посмотрел ваш магазин в 2ГИС: рейтинг ${String(s.rating).replace('.', ',')} и ${s.reviews_count} ${plural(s.reviews_count)}, покупатели отмечают: ${p.charAt(0).toLowerCase() + p.slice(1)}. Но сайта у вас нет.`,
    'Я сделал для вас бесплатную демо-версию сайта с каталогом — товары можно добавлять и удалять самим прямо с телефона:',
    `${B}${s.slug}/`,
    'Это ни к чему не обязывает. Если не понравится — просто удалю. Если понравится — дам доступ к управлению и расскажу, как поставить сайт на ваш домен.'
  ].join('\n');
}

const arg = process.argv[2];
if (arg === '--list') { list.forEach((s, i) => console.log(i + 1, s.slug, '+' + s.whatsapp)); console.log('без WhatsApp:', stores.filter(s => !okWa(s)).map(s => `${s.slug}(${s.whatsapp || '—'})`).join(', ')); }
else if (arg === '--md') {
  let md = '# Сообщения магазинам одежды (не в репозиторий)\n\n';
  for (const s of list) md += `## ${s.name}\n+${s.whatsapp}\n\n\`\`\`\n${text(s)}\n\`\`\`\n\n`;
  fs.writeFileSync(__dirname + '/messages.md', md); console.log('messages.md:', list.length);
} else {
  const s = list.find(x => x.slug === arg);
  if (!s) { console.error('нет такого магазина с WhatsApp'); process.exit(1); }
  execFileSync('powershell', ['-NoProfile', '-Command', `Start-Process 'whatsapp://send?phone=${s.whatsapp}&text=${encodeURIComponent(text(s))}'`], { stdio: 'ignore' });
  console.log(`Открыт чат: ${s.name} (+${s.whatsapp})`);
}

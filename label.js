/* Этикетка: разбор текста таблицы КБЖУ (OCR), ответ Open Food Facts, проверка калорий по БЖУ */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.LB = f(); })(this, function () {
  const NUM = '(\\d{1,4}(?:[.,]\\d{1,2})?)';
  const n = s => s == null ? null : +String(s).replace(',', '.');
  function fixOcr(t) { return String(t || '').replace(/\r/g, '').replace(/(?<=\d)[OoОо](?=\d|\b)/g, '0').replace(/(?<=\d)[lI|](?=\d)/g, '1').replace(/[ \t]+/g, ' '); }
  function grab(t, words) { for (const w of words) { const m = t.match(new RegExp(w + '[^\\d\\n]{0,25}' + NUM, 'i')); if (m) return n(m[1]); } return null; }
  function parseText(raw) { const t = fixOcr(raw), lo = t.toLowerCase(); let kcal = null;
    let m = lo.match(new RegExp(NUM + '\\s*(?:ккал|kcal|ккaл|kкал)')); if (m) kcal = n(m[1]);
    if (kcal == null) { m = lo.match(new RegExp('(?:энергетическая ценность|калорийность|energy)[^\\d\\n]{0,40}' + NUM + '\\s*(кдж|kj)?')); if (m && !m[2]) kcal = n(m[1]); }
    if (kcal == null) { m = lo.match(new RegExp(NUM + '\\s*(?:кдж|kj)')); if (m) kcal = Math.round(n(m[1]) / 4.184); }
    const p = grab(lo, ['белк\\S*', 'protein\\S*']), f = grab(lo, ['жир\\S*', 'fat\\S*']), c = grab(lo, ['углевод\\S*', 'carbohydrate\\S*', 'carb\\S*']);
    m = lo.match(new RegExp('(?:масса нетто|нетто|net\\s*w(?:eigh)?t|масса|вес)[^\\d\\n]{0,15}' + NUM + '\\s*(кг|kg|г|g|мл|ml|л|l)(?![a-zа-я])'));
    let pack = null; if (m) { pack = n(m[1]); if (/^(кг|kg|л|l)$/.test(m[2])) pack *= 1000; }
    return {kcal, p, f, c, pack: pack && pack < 5000 ? Math.round(pack) : null}; }
  function check(x) { if (!x || x.kcal == null || x.p == null || x.f == null || x.c == null) return {ok: false, calc: null, missing: true};
    const calc = x.p * 4 + x.f * 9 + x.c * 4; if (!calc && !x.kcal) return {ok: true, calc: 0}; const d = Math.abs(x.kcal - calc) / Math.max(x.kcal, calc);
    return {ok: d <= 0.15, calc: Math.round(calc), diff: d}; }
  function fromOff(j) { const pr = j && j.status === 1 && j.product; if (!pr) return null; const nu = pr.nutriments || {};
    let kcal = nu['energy-kcal_100g']; if (kcal == null && nu.energy_100g != null) kcal = nu.energy_100g / 4.184;
    const r1 = v => v == null || v === '' ? null : Math.round(+v * 10) / 10;
    const q = String(pr.quantity || ''), qm = q.match(/(\d+(?:[.,]\d+)?)\s*(kg|кг|g|г|ml|мл|l|л)(?![a-zа-я])/i); let pack = n(pr.product_quantity) || null;
    if (!pack && qm) { pack = n(qm[1]); if (/^(kg|кг|l|л)$/i.test(qm[2])) pack *= 1000; }
    const name = [pr.product_name_ru || pr.product_name, pr.brands && String(pr.brands).split(',')[0]].filter(Boolean).join(', ');
    return {name: name.slice(0, 120), kcal: kcal == null ? null : Math.round(kcal), p: r1(nu.proteins_100g), f: r1(nu.fat_100g), c: r1(nu.carbohydrates_100g), pack: pack ? Math.round(pack) : null, portion: n(pr.serving_quantity) ? Math.round(n(pr.serving_quantity)) : null}; }
  const validEan = s => { if (!/^\d{8}$|^\d{12,14}$/.test(s)) return false; const d = s.split('').map(Number), c = d.pop(); const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 ? 1 : 3), 0); return (10 - sum % 10) % 10 === c; };
  return {parseText, check, fromOff, validEan};
});

'use strict';
// Nutricio — ручная норма («Моя норма»). Чистые функции, UMD.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NutricioManual = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const KC = { p: 4, f: 9, c: 4 };
  const KEYS = ['p', 'f', 'c'];
  // Режим «ккал + %»: граммы из калорий и долей (доли в процентах, сумма 100)
  function fromPct(kcal, pct) { const g = {}; for (const k of KEYS) g[k] = Math.round((kcal * pct[k]) / 100 / KC[k]); return { kcal: Math.round(kcal), ...g, pct: { ...pct } }; }
  // Режим «граммы»: калории = Б×4 + Ж×9 + У×4
  function fromGrams(g) { const kcal = Math.round(g.p * 4 + g.f * 9 + g.c * 4); const pct = kcal ? pctOf(g, kcal) : { p: 0, f: 0, c: 0 }; return { kcal, p: Math.round(g.p), f: Math.round(g.f), c: Math.round(g.c), pct }; }
  function pctOf(g, kcal) { const raw = KEYS.map((k) => (g[k] * KC[k] * 100) / kcal); return round100(raw); }
  // Округление долей до целых с суммой ровно 100 (метод наибольших остатков)
  function round100(raw) { const fl = raw.map(Math.floor); let rest = 100 - fl.reduce((s, x) => s + x, 0);
    const ord = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]); for (let j = 0; rest > 0; j = (j + 1) % 3, rest--) fl[ord[j][1]]++;
    return { p: fl[0], f: fl[1], c: fl[2] }; }
  // Ползунок: меняем одну долю, остальные две подстраиваются пропорционально, сумма всегда 100, каждая ≥ 0
  function setPct(pct, key, value) { const v = Math.max(0, Math.min(100, Math.round(value))); const others = KEYS.filter((k) => k !== key);
    const restOld = others.reduce((s, k) => s + pct[k], 0), restNew = 100 - v; const out = { ...pct, [key]: v };
    if (restOld <= 0) { out[others[0]] = Math.ceil(restNew / 2); out[others[1]] = Math.floor(restNew / 2); }
    else { const a = Math.round((pct[others[0]] * restNew) / restOld); out[others[0]] = a; out[others[1]] = restNew - a; }
    return out; }
  // Мягкие подсказки (не блокируют сохранение)
  function hints(n, ctx) { const out = [];
    if (ctx.bmr && n.kcal < ctx.bmr) out.push({ id: 'kcal_bmr', text: `Калорий меньше базового обмена (${Math.round(ctx.bmr)} ккал) — организму может не хватать энергии` });
    if (ctx.weight && n.p < 1.2 * ctx.weight) out.push({ id: 'protein', text: `Белка меньше 1,2 г на кг веса (${Math.round(1.2 * ctx.weight)} г) — мышцам может не хватать` });
    if (ctx.weight && n.f < 0.6 * ctx.weight) out.push({ id: 'fat', text: `Жиров меньше 0,6 г на кг веса (${Math.round(0.6 * ctx.weight)} г) — это важно для гормонов` });
    return out; }
  // Раз в 14 дней вместо автокоррекции — предложение по тренду. autocorrectResult — результат calc.autocorrect.
  function suggestion(autocorrectResult, today, last) { if (last && (Date.parse(today) - Date.parse(last)) / 864e5 < 14) return null;
    if (!autocorrectResult || autocorrectResult.action !== 'adjust' || !autocorrectResult.change) return null;
    const ch = autocorrectResult.change; return { change: ch, d: today, text: `По тренду предлагаю ${ch > 0 ? '+' : '−'}${Math.abs(ch)} ккал` }; }
  function applySuggestion(m, sug) { return m.mode === 'g' ? (() => { const kcal = m.kcal + sug.change; const r = fromPct(kcal, m.pct); return { ...r, mode: 'g' }; })() : { ...fromPct(m.kcal + sug.change, m.pct), mode: 'pct' }; }
  return { fromPct, fromGrams, setPct, round100, hints, suggestion, applySuggestion };
});

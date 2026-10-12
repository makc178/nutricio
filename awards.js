'use strict';
// Nutricio — награды по awards.md. Чистые функции над нормализованным дневником, UMD (Node и браузер).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NutricioAwards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LIST = [
    ['streak_7', 'Росток', 'Неделя в балансе! Ваш росток пустил корни 🌱'],
    ['streak_30', 'Деревце', 'Месяц стабильности. Это уже привычка!'],
    ['streak_100', 'Роща', '100 дней! Вы вырастили целую рощу'],
    ['protein_week', 'Белковый щит', 'Неделя белка в норме: мышцы говорят спасибо'],
    ['fiber_week', 'Зелёная сила', 'Клетчатка в норме всю неделю'],
    ['water_week', 'Родник', 'Неделя с правильной водой'],
    ['steps_10k', 'Путник', '10 000 шагов! Отличная прогулка'],
    ['steps_week', 'Марафонец', 'Неделя в движении'],
    ['workout_10', 'Энергия', '10 тренировок позади!'],
    ['kg_1', 'Первый шаг', null], ['kg_5', 'Лёгкость', null], ['kg_10', 'Новая форма', null],
    ['waist_5', 'Тонкая талия', 'Минус 5 см в талии!'],
    ['goal', 'Цель достигнута', 'Вы достигли цели! Время для новой?'],
    ['first_week_log', 'Дневник', 'Неделя честного дневника'],
    ['comeback', 'Возвращение', 'С возвращением! Каждый день — новый старт'],
  ].map(([id, title, text]) => ({ id, title, text }));
  const KG = { loss: { kg_1: 1, kg_5: 5, kg_10: 10 }, gain: { kg_1: 1, kg_5: 3, kg_10: 5 } };
  const FREEZE_EVERY = 7;

  const D = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const K = (t) => t.toISOString().slice(0, 10);
  const add = (s, n) => K(new Date(D(s).getTime() + n * 864e5));
  function range(from, to) { const out = []; for (let d = from; d <= to; d = add(d, 1)) out.push(d); return out; }

  // Серия «не красных» дней по калориям. Красный или пустой день прощается, если прошлая заморозка была ≥ 7 дней назад.
  // Сегодняшний день, пока в нём нет записей, серию не рвёт. Возвращает текущую и максимальную серию.
  function streaks(days, today) {
    const keys = Object.keys(days).filter((k) => days[k] && days[k].zone).sort();
    if (!keys.length) return { current: 0, max: 0, freezes: [] };
    let cur = 0, max = 0, lastFreeze = null; const freezes = [];
    for (const d of range(keys[0], today)) {
      const z = days[d] && days[d].zone;
      if (d === today && !z) break;
      if (z && z !== 'red') { cur++; if (cur > max) max = cur; continue; }
      const canFreeze = cur > 0 && (lastFreeze == null || (D(d) - D(lastFreeze)) / 864e5 >= FREEZE_EVERY);
      if (canFreeze) { lastFreeze = d; freezes.push(d); } else cur = 0;
    }
    return { current: cur, max, freezes };
  }
  // есть ли N подряд дней, где pred истинно
  function run(days, n, pred) { const ks = Object.keys(days).sort(); if (!ks.length) return false; let c = 0;
    for (const d of range(ks[0], ks[ks.length - 1])) { c = days[d] && pred(days[d]) ? c + 1 : 0; if (c >= n) return true; } return false; }
  function ema(ws, alpha = 0.25) { let e = null; return [...ws].sort((a, b) => (a.d < b.d ? -1 : 1)).map((x) => (e = e == null ? x.w : alpha * x.w + (1 - alpha) * e)); }

  // input: {today, goal:'loss'|'maintain'|'gain', startWeight, targetWeight,
  //   days: {'YYYY-MM-DD': {zone, p, pNorm, fiber, water, waterNorm, steps, workouts, allMeals}},
  //   weights:[{d,w}], waists:[{d,cm}]}
  function conditions(inp) {
    const days = inp.days || {}, today = inp.today; const st = streaks(days, today); const ok = {};
    ok.streak_7 = st.max >= 7; ok.streak_30 = st.max >= 30; ok.streak_100 = st.max >= 100;
    ok.protein_week = run(days, 7, (x) => x.pNorm > 0 && x.p >= 0.9 * x.pNorm);
    ok.fiber_week = run(days, 7, (x) => x.fiber >= 25);
    ok.water_week = run(days, 7, (x) => x.waterNorm > 0 && x.water >= x.waterNorm);
    ok.steps_10k = Object.values(days).some((x) => (x.steps || 0) >= 10000);
    ok.steps_week = run(days, 7, (x) => (x.steps || 0) >= 8000);
    ok.workout_10 = Object.values(days).reduce((s, x) => s + (x.workouts || 0), 0) >= 10;
    const tr = ema(inp.weights || []), last = tr.length ? tr[tr.length - 1] : null, w0 = inp.startWeight;
    const dir = inp.goal === 'gain' ? 'gain' : inp.goal === 'loss' ? 'loss' : null;
    for (const id of ['kg_1', 'kg_5', 'kg_10']) ok[id] = !!(dir && last != null && w0 && (dir === 'loss' ? w0 - last : last - w0) >= KG[dir][id] - 1e-9);
    const ws = [...(inp.waists || [])].sort((a, b) => (a.d < b.d ? -1 : 1)); ok.waist_5 = ws.length > 1 && ws[0].cm - ws[ws.length - 1].cm >= 5;
    ok.goal = !!(dir && last != null && inp.targetWeight && (dir === 'loss' ? last <= inp.targetWeight : last >= inp.targetWeight));
    ok.first_week_log = run(days, 7, (x) => !!x.allMeals);
    let reds = 0, cb = false; const ks = Object.keys(days).sort();
    if (ks.length) for (const d of range(ks[0], ks[ks.length - 1])) { const z = days[d] && days[d].zone;
      if (z === 'red') reds++; else if (z === 'green' && reds >= 3) { cb = true; break; } else if (z) reds = 0; }
    ok.comeback = cb;
    return { ok, streak: st };
  }
  function text(a, inp) { if (a.text) return a.text; const n = KG[inp.goal === 'gain' ? 'gain' : 'loss'][a.id];
    return `${inp.goal === 'gain' ? 'Плюс' : 'Минус'} ${n} кг по тренду. Так держать!`; }
  // Чекпоинт: history {id: date} не меняется, возвращаются новая история и только что выданные награды (каждая один раз).
  function check(inp, history = {}) { const { ok, streak } = conditions(inp); const h = { ...history }, fresh = [];
    for (const a of LIST) if (ok[a.id] && !h[a.id]) { h[a.id] = inp.today; fresh.push({ id: a.id, title: a.title, text: text(a, inp), d: inp.today }); }
    return { history: h, fresh, streak }; }
  return { LIST, FREEZE_EVERY, streaks, conditions, check };
});

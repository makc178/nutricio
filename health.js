/* Нормализация данных из «Быстрых команд» (iOS): числа строками с запятой, единицы, секунды, одиночный объект вместо массива.
   + Health Auto Export (REST API, JSON v2): {data:{metrics:[{name,units,data:[{date,qty}]}],workouts:[{name,start,end,duration(сек),activeEnergyBurned{qty,units},distance}]}}.
   Формат HAE взят из документации и на живой выгрузке не проверен. */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.HL = f(); })(this, function () {
  function num(v) { if (v == null) return null; if (typeof v === 'number') return isFinite(v) ? v : null;
    const s = String(v).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return s ? +s[0] : null; }
  function minutes(w) { const sec = w.seconds ?? w.duration_s ?? w.durationSeconds; if (num(sec) != null) return num(sec) / 60;
    let v = w.minutes ?? w.min ?? w.duration; if (v == null || v === '') return null; if (typeof v === 'number') return v > 1440 ? v / 60 : v;
    const s = String(v).toLowerCase().replace(',', '.'), hm = s.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
    if (hm) return hm[3] != null ? +hm[1] * 60 + +hm[2] + +hm[3] / 60 : +hm[1] * 60 + +hm[2];
    let t = 0, hit = false; const h = s.match(/(\d+(?:\.\d+)?)\s*(ч|h)/), m = s.match(/(\d+(?:\.\d+)?)\s*(мин|min|m(?!s))/), c = s.match(/(\d+(?:\.\d+)?)\s*(сек|с\b|с$|sec|s\b|s$)/);
    if (h) { t += +h[1] * 60; hit = true; } if (m) { t += +m[1]; hit = true; } if (c) { t += +c[1] / 60; hit = true; }
    if (hit) return t; const n = num(s); return n == null ? null : n > 1440 ? n / 60 : n; }
  function date(v) { if (!v) return null; const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return null; }
  const r0 = x => Math.round(x), r1 = x => Math.round(x * 10) / 10;

  // ---- Health Auto Export (HAE, JSON v2) ----
  const KJ_PER_KCAL = 4.184;   // как nutrition.kj_per_kcal в config.json
  let CFGX = {exclude: [], typeId: null};
  // configure({exclude: ['fishing'], typeId: name => id}): типы тренировок, ккал которых не идут в активные (activity.exclude_workout_types)
  function configure(o) { CFGX = {exclude: (o && o.exclude) || [], typeId: (o && o.typeId) || null}; }
  const idOf = t => CFGX.typeId ? String(CFGX.typeId(t)) : String(t || '').toLowerCase().replace(/^hkworkoutactivitytype\.?/, '').replace(/[^a-zа-яё0-9]/g, '');
  const isExcluded = t => CFGX.exclude.includes(idOf(t));
  const unitStr = u => String(u == null ? '' : u).toLowerCase().replace(/\s/g, '');
  const toKcal = (q, u) => /^(kj|кдж|kilojoule|kilojoules)/.test(unitStr(u)) ? q / KJ_PER_KCAL : q;
  const qtyUnits = x => x && typeof x === 'object' && !Array.isArray(x) ? [num(x.qty ?? x.value), x.units ?? x.unit] : [num(x), null];
  const dayOf = s => { const m = String(s == null ? '' : s).match(/^\s*(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };  // локальная дата из строки, без перевода в UTC
  const isHAE = j => !!j && typeof j === 'object' && !Array.isArray(j) && (Array.isArray(j.metrics) || (Array.isArray(j.workouts) && j.date == null) || (j.data && typeof j.data === 'object' && (Array.isArray(j.data.metrics) || Array.isArray(j.data.workouts))));
  function haeDays(j) {
    const d = j.data && typeof j.data === 'object' && !Array.isArray(j.data) ? j.data : j, by = {}, get = k => by[k] || (by[k] = {steps: null, ak: null, wt: null, wtAt: '', ws: []});
    for (const m of d.metrics || []) { if (!m || typeof m !== 'object') continue; const n = String(m.name || '').toLowerCase();
      for (const p of Array.isArray(m.data) ? m.data : []) { const k = dayOf(p && p.date), q = num(p && p.qty); if (!k || q == null) continue; const r = get(k);
        if (n === 'step_count') r.steps = (r.steps || 0) + q;
        else if (n === 'active_energy' || n === 'active_energy_burned') r.ak = (r.ak || 0) + toKcal(q, m.units);
        else if (n === 'weight_body_mass' || n === 'body_mass' || n === 'weight') { const at = String(p.date); if (at >= r.wtAt) { r.wtAt = at; r.wt = /^(lb|lbs|pound|pounds)$/.test(unitStr(m.units)) ? q * 0.45359237 : q; } } } }
    for (const w of d.workouts || []) { if (!w || typeof w !== 'object') continue; const k = dayOf(w.start); if (!k) continue;
      let e = w.activeEnergyBurned ?? w.activeEnergy; if (Array.isArray(e)) e = {qty: e.reduce((s, x) => s + (num(x && x.qty) || 0), 0), units: e[0] && e[0].units}; const [eq, eu] = qtyUnits(e), kc = eq != null ? toKcal(eq, eu) : null;
      let [dq, du] = qtyUnits(w.distance); if (dq != null) { const u = unitStr(du); dq = /^(mi|mile|miles)$/.test(u) ? dq * 1.609344 : u === 'm' ? dq / 1000 : dq; }
      const sec = num(w.duration), x = {type: String(w.name ?? w.type ?? '').trim().slice(0, 60) || 'Другое', minutes: sec != null ? r0(sec / 60) : 0, kcal: kc != null ? r0(kc) : 0};
      if (date(w.start)) x.start = String(w.start).slice(0, 25); if (dq != null) x.distance = r1(dq); get(k).ws.push(x); }
    return Object.keys(by).sort().map(k => { const r = by[k], o = {date: k}, seen = new Set(), ws = [];
      for (const x of r.ws) { const key = [x.type, x.start || '', x.minutes, x.kcal].join('|'); if (seen.has(key)) continue; seen.add(key); ws.push(x); }
      const ex = ws.filter(x => isExcluded(x.type)).reduce((s, x) => s + x.kcal, 0);
      if (r.steps != null && r.steps >= 0) o.steps = r0(r.steps);
      if (r.ak != null && r.ak >= 0) { o.activeKcal = Math.max(0, r0(r.ak - ex)); if (ex) o.exKcal = ex; }   // exKcal: сколько ккал исключённых тренировок уже вычтено из activeKcal (приложение не вычитает повторно)
      if (ws.length) o.workouts = ws;
      if (r.wt != null && r.wt >= 30 && r.wt <= 300) o.weight = r1(r.wt);
      return o; }); }
  function normDay(d) { if (!d || typeof d !== 'object') return null; const k = date(d.date); if (!k) return null;
    let ws = d.workouts; if (typeof ws === 'string') { try { ws = JSON.parse(ws); } catch (e) { ws = null; } } if (ws && !Array.isArray(ws)) ws = typeof ws === 'object' ? [ws] : null;
    const sv = String(d.steps ?? '').trim(), steps = /^\d{1,3}([,.\s\u00a0\u202f]\d{3})+$/.test(sv) ? +sv.replace(/\D/g, '') : num(d.steps), ak = num(d.activeKcal ?? d.active_kcal ?? d.activeEnergy), out = {date: k};
    const wt = num(d.weight ?? d.weight_kg ?? d.weightKg ?? d.bodyMass); if (wt != null && wt >= 30 && wt <= 300) out.weight = r1(wt);
    if (steps != null && steps >= 0) out.steps = r0(steps); if (ak != null && ak >= 0) out.activeKcal = r0(ak);
    if (ws) { const seen = new Set(); out.workouts = [];
      for (const w of ws) { if (!w || typeof w !== 'object') continue; const type = String(w.type ?? w.name ?? '').trim().slice(0, 60), mn = minutes(w), kc = num(w.kcal ?? w.energy ?? w.calories), dist = num(w.distance);
        if (!type && mn == null && kc == null) continue; const x = {type: type || 'Другое', minutes: mn != null ? r0(mn) : 0, kcal: kc != null ? r0(kc) : 0};
        if (date(w.start)) x.start = String(w.start).slice(0, 25); if (dist != null) x.distance = r1(dist);
        const key = [x.type, x.start || '', x.minutes, x.kcal].join('|'); if (seen.has(key)) continue; seen.add(key); out.workouts.push(x); } }
    return out; }
  function normalize(j) { if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { return []; } }
    if (isHAE(j)) return haeDays(j);
    const days = Array.isArray(j) ? j : j && Array.isArray(j.days) ? j.days : [j]; return days.map(normDay).filter(Boolean); }
  // несколько файлов: сортировка по имени (yyyy-MM-dd-HHmm), более поздний заменяет данные «Здоровья» за день; пустые поля не затирают
  function mergeFiles(files) { const by = {}; for (const f of [...files].sort((a, b) => a.name < b.name ? -1 : 1)) for (const d of normalize(f.json)) { const p = by[d.date] || {date: d.date};
      if (d.steps != null) p.steps = d.steps; if (d.activeKcal != null) { p.activeKcal = d.activeKcal; p.exKcal = d.exKcal || 0; } if (d.workouts) p.workouts = d.workouts; if (d.weight != null) p.weight = d.weight; by[d.date] = p; }
    return Object.values(by).sort((a, b) => a.date < b.date ? -1 : 1); }
  return {num, minutes, date, normalize, mergeFiles, configure};
});

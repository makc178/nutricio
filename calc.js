'use strict';
// Nutricio — расчётное ядро по nutrition-spec.md v1. Без зависимостей, работает в Node и браузере (UMD).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NutricioCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const KCAL = { p: 4, c: 4, f: 9 };                       // §5
  const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, very_high: 1.9 }; // §3
  const MEAL_SHARES = { breakfast: 0.25, lunch: 0.35, dinner: 0.25, snacks: 0.15 };            // §6
  const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const MIN_KCAL = { female: 1200, male: 1500 };           // §4
  const PROTEIN_G_PER_KG = { loss: 2.0, maintain: 1.6, gain: 1.8 }; // §5
  const SAFE_PACE = { loss: [0.005, 0.01], gain: [0.0025, 0.005] }; // доля веса в неделю, §4
  // В спецификации нет порога «сидячего» уровня по данным «Здоровья»; параметр, уточнить у Нутрициолога.
  const SEDENTARY_STEPS = 5000;

  const r1 = (x) => Math.round(x * 10) / 10;
  const bmi = (weight, heightCm) => weight / Math.pow(heightCm / 100, 2);

  // §2
  function bmr({ sex, weight, height, age }) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    if (sex === 'male') return base + 5;
    if (sex === 'female') return base - 161;
    throw new Error('sex must be male|female');
  }

  // §3: K по уровню или по 7-дневным данным «Здоровья» (средние шаги/день, тренировок за неделю)
  function activityFactor(levelOrHealth) {
    if (typeof levelOrHealth === 'number' && levelOrHealth > 0) return levelOrHealth; // явный K (режим «Учитывать шаги»)
    if (typeof levelOrHealth === 'string') {
      const k = ACTIVITY[levelOrHealth];
      if (!k) throw new Error('unknown activity level');
      return k;
    }
    const { avgSteps = 0, workoutsPerWeek = 0 } = levelOrHealth || {};
    let bySteps = avgSteps > 10000 ? 1.725 : avgSteps >= 7000 ? 1.55 : avgSteps >= SEDENTARY_STEPS ? 1.375 : 1.2;
    let byWorkouts = workoutsPerWeek >= 6 ? 1.725 : workoutsPerWeek >= 3 ? 1.55 : workoutsPerWeek >= 1 ? 1.375 : 1.2;
    return Math.max(bySteps, byWorkouts); // 1.9 — только ручной выбор
  }

  const tdee = (bmrValue, k) => bmrValue * k;
  const minCalories = (sex, bmrValue) => Math.max(bmrValue, MIN_KCAL[sex]);

  // §4
  function targetCalories({ goal, sex, weight, height, bmr: b, tdee: t }) {
    if (goal === 'maintain') return Math.round(t);
    if (goal === 'gain') return Math.round(t * 1.10);
    if (goal === 'loss') {
      const f = bmi(weight, height) < 25 ? 0.85 : 0.80;
      return Math.round(Math.max(t * f, minCalories(sex, b)));
    }
    throw new Error('goal must be loss|maintain|gain');
  }

  // §4 безопасный темп. deadline/today — Date; возвращает предупреждение и реалистичную дату
  function paceCheck({ goal, weight, targetWeight, today, deadline }) {
    if (goal === 'maintain') return { ok: true };
    const delta = Math.abs(targetWeight - weight);
    const [minP, maxP] = SAFE_PACE[goal];
    const maxKgWeek = weight * maxP;
    const weeksSafe = delta / maxKgWeek;
    const realisticDate = new Date(today.getTime() + Math.ceil(weeksSafe * 7) * 864e5);
    const res = { ok: true, safeRangeKgWeek: [r1(weight * minP), r1(maxKgWeek)], realisticDate };
    if (deadline) {
      const weeks = (deadline - today) / (7 * 864e5);
      const required = weeks > 0 ? delta / weeks : Infinity;
      res.requiredKgWeek = required;
      if (required > maxKgWeek) { res.ok = false; res.warning = 'too_fast'; }
    }
    return res;
  }

  // §5
  function macros({ goal, weight, height, targetWeight, kcal, workoutHours = 0 }) {
    const protW = bmi(weight, height) > 30 && targetWeight ? targetWeight : weight;
    const p = PROTEIN_G_PER_KG[goal] * protW;
    const f = Math.min(Math.max(0.9 * weight, 0.8 * weight, (0.20 * kcal) / KCAL.f), (0.35 * kcal) / KCAL.f); // §5 + потолок 35% ккал (подтверждено Нутрициологом)
    const c = Math.max(0, (kcal - p * KCAL.p - f * KCAL.f) / KCAL.c);
    const fiber = Math.max(25, (14 * kcal) / 1000);
    const waterMl = 30 * weight + 500 * workoutHours;
    return { kcal, p: Math.round(p), f: Math.round(f), c: Math.round(c), fiber: Math.round(fiber), waterMl: Math.round(waterMl) };
  }

  // §6: базовые лимиты по приёмам
  function mealLimits(day, shares = MEAL_SHARES) {
    const sum = MEAL_ORDER.reduce((s, m) => s + (shares[m] || 0), 0);
    const out = {};
    for (const m of MEAL_ORDER) {
      out[m] = {};
      for (const k of ['kcal', 'p', 'f', 'c']) out[m][k] = (day[k] * (shares[m] || 0)) / sum;
    }
    return out;
  }

  // §6 перенос: eaten = { breakfast: {kcal,p,f,c}, ... } для уже закрытых приёмов (closed — список).
  // Остаток дня (перебор уменьшает, недобор увеличивает) делится на оставшиеся приёмы пропорционально их долям.
  function redistribute(day, eaten, closed, shares = MEAL_SHARES) {
    const base = mealLimits(day, shares);
    const open = MEAL_ORDER.filter((m) => !closed.includes(m));
    const openShare = open.reduce((s, m) => s + (shares[m] || 0), 0);
    const out = {};
    for (const m of closed) out[m] = base[m];
    for (const k of ['kcal', 'p', 'f', 'c']) {
      const used = closed.reduce((s, m) => s + ((eaten[m] && eaten[m][k]) || 0), 0);
      const remaining = Math.max(0, day[k] - used);
      for (const m of open) {
        out[m] = out[m] || {};
        out[m][k] = openShare > 0 ? (remaining * (shares[m] || 0)) / openShare : 0;
      }
    }
    return out;
  }

  // §7
  function color(actual, limit, nutrient) {
    if (!limit) return 'green';
    const r = actual / limit;
    if (nutrient === 'p' || nutrient === 'fiber') return r < 0.8 ? 'yellow' : 'green';
    if (r < 0.9) return 'green';
    if (r <= 1.05) return 'yellow';
    return 'red';
  }

  // §8 тренд: EMA alpha 0.25 по ежедневным весам (null — пропуск дня)
  function weightTrend(weights, alpha = 0.25) {
    let ema = null;
    return weights.map((w) => {
      if (w == null) return ema;
      ema = ema == null ? w : alpha * w + (1 - alpha) * ema;
      return ema;
    });
  }

  // §8 автокоррекция раз в 14 дней. plannedKgWeek > 0 — величина планового темпа;
  // trendStart/trendEnd — тренд в начале/конце окна; adherence — доля дней (0..1) с соблюдением калорий.
  // Для набора направление коррекции зеркальное (в спеке явно описано для похудения).
  function autocorrect({ goal, plannedKgWeek, trendStart, trendEnd, adherence, kcal, minKcal, days = 14 }) {
    if (goal === 'maintain' || !plannedKgWeek) return { kcal, change: 0, action: 'none' };
    if (adherence < 0.85) return { kcal, change: 0, action: 'advice_discipline' };
    const dir = goal === 'loss' ? -1 : 1;
    const actualKgWeek = ((trendEnd - trendStart) * dir) / (days / 7);
    const ratio = actualKgWeek / plannedKgWeek;
    let change = 0;
    if (ratio < 0.5) change = 100 * dir;        // медленно: похудение −100, набор +100
    else if (ratio > 1.5) change = -100 * dir;  // быстро: похудение +100, набор −100
    let next = kcal + change;
    if (minKcal != null && next < minKcal) next = minKcal;
    return { kcal: next, change: next - kcal, ratio, action: change ? 'adjust' : 'none' };
  }

  const isAutocorrectDue = (lastDate, today) => (today - lastDate) / 864e5 >= 14;
  const needsRecalc = (weightAtCalc, currentWeight) => Math.abs(currentWeight - weightAtCalc) >= 2; // §8

  // §9 (опция) — 50% сожжённых на тренировке
  const workoutBonus = (burnedKcal, enabled = true) => (enabled ? Math.round(burnedKcal * 0.5) : 0);

  // Полный план
  function plan(profile) {
    const b = bmr(profile);
    const k = activityFactor(profile.activity);
    const t = tdee(b, k);
    const kcal = targetCalories({ ...profile, bmr: b, tdee: t });
    const m = macros({ ...profile, kcal });
    return { bmi: r1(bmi(profile.weight, profile.height)), bmr: Math.round(b), k, tdee: Math.round(t), minKcal: Math.round(minCalories(profile.sex, b)), ...m, meals: mealLimits(m) };
  }

  // Прибавка за активность (формула Нутрициолога 16.10.2026). Все коэффициенты — из config.json → activity.
  // day: {activeKcal, steps}; активные калории важнее шагов; тренировки отдельно не прибавляются (уже внутри активных калорий).
  // goal (loss|maintain|gain) — доля прибавки по цели (cfg.goal_share), применяется до округления и потолка
  function activityBonus(day, weight, cfg, goal) {
    const d = day || {}, ak = Number(d.activeKcal), st = Number(d.steps);
    let raw = 0, source = null;
    if (isFinite(ak) && ak > 0) { raw = ak; source = 'active'; }
    else if (isFinite(st) && st > 0 && weight > 0) { raw = cfg.kcal_per_step_kg * weight * Math.max(0, st - cfg.steps_baseline); source = 'steps'; }
    const gs = cfg.goal_share && goal && cfg.goal_share[goal] != null ? cfg.goal_share[goal] : 1, adj = raw * gs;
    const step = cfg.round > 0 ? cfg.round : 1;
    const kcal = Math.max(0, Math.min(cfg.cap, Math.round(adj / step) * step));
    return { kcal, source, raw: Math.round(raw), share: gs };
  }
  // Норма дня = базовая норма (с K = k_sedentary) + прибавка; белок без изменений, прибавка делится на углеводы/жиры
  function applyActivity(base, bonusKcal, cfg) {
    const b = bonusKcal || 0, sm = cfg.split_macros;
    return { ...base, kcal: base.kcal + b, c: base.c + (b * sm.carbs) / KCAL.c, f: base.f + (b * sm.fat) / KCAL.f, p: base.p };
  }
  // Лимиты по приёмам: limits посчитаны от базовой нормы; вся прибавка уходит в ужин и перекус (cfg.split_meals)
  function addBonusToMeals(limits, bonusKcal, cfg) {
    const out = {}, b = bonusKcal || 0, sm = cfg.split_macros;
    for (const m of Object.keys(limits)) out[m] = { ...limits[m] };
    for (const [m, share] of Object.entries(cfg.split_meals)) {
      if (!out[m]) continue; const add = b * share;
      out[m].kcal += add; out[m].c += (add * sm.carbs) / KCAL.c; out[m].f += (add * sm.fat) / KCAL.f; out[m].bonus = Math.round(add);
    }
    return out;
  }

  // вода: 30 мл/кг, не больше 3,5 л; ручная норма из «Профиля» важнее
  const waterNormMl = (weight, override) => (override > 0 ? Math.round(override) : Math.min(3500, Math.round(30 * (weight || 0))));
  return { waterNormMl, ACTIVITY, MEAL_SHARES, MEAL_ORDER, SEDENTARY_STEPS, bmi, bmr, activityFactor, tdee, minCalories, targetCalories,
    paceCheck, macros, mealLimits, redistribute, activityBonus, applyActivity, addBonusToMeals, color, weightTrend, autocorrect, isAutocorrectDue, needsRecalc, workoutBonus, plan };
});

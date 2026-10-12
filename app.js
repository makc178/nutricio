'use strict';
/* Nutricio — PWA. Личные данные шифруются ключом из PIN (PBKDF2-SHA256 600k + AES-GCM) и хранятся в IndexedDB.
   Фото «до/после» — отдельный второй PIN и отдельный ключ. Резерв — закрытый репозиторий (только шифротекст). */
const C = window.NutricioCalc;
const ICONS = {"beydzh": "<circle cx=\"12\" cy=\"9\" r=\"5.5\"/><path d=\"M9 13.5L7.5 21l4.5-2.5 4.5 2.5-1.5-7.5\"/><path d=\"M12 6.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z\"/>", "cel": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"12\" cy=\"12\" r=\".8\" fill=\"currentColor\"/>", "do_posle": "<rect x=\"3\" y=\"5\" width=\"8\" height=\"14\" rx=\"2\"/><rect x=\"13\" y=\"5\" width=\"8\" height=\"14\" rx=\"2\"/><path d=\"M7 9v6M17 9.5c-1 2-1 3 0 5\"/>", "dobavit": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v8M8 12h8\"/>", "foto": "<path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>", "grafiki": "<path d=\"M4 4v16h16\"/><path d=\"M7 15l4-4 3 3 5-6\"/>", "nastroyki": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8\"/>", "obed": "<circle cx=\"12\" cy=\"13\" r=\"7\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/><path d=\"M3 4v5M3 9v11M21 4c-2 0-2 4-2 6h2v10\"/>", "obemy": "<path d=\"M8 3c-2 4-2 14 0 18M16 3c2 4 2 14 0 18\"/><path d=\"M6 12h12\" stroke-dasharray=\"2 2\"/>", "perekus": "<path d=\"M12 7c-4-2-8 1-7 6s4 8 7 6c3 2 6-1 7-6s-3-8-7-6z\"/><path d=\"M12 7c0-2 1-3 3-4\"/>", "pitanie": "<path d=\"M12 4c5 0 8 3 8 8s-3 8-8 8-8-3-8-8\"/><path d=\"M4 12c0-4 2-7 6-8-1 3 0 6 2 8\"/>", "poisk": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"M16 16l4.5 4.5\"/>", "profil": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1-4 4-6 8-6s7 2 8 6\"/>", "restoran": "<path d=\"M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 8h3v10\"/>", "shagi": "<path d=\"M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 15.5h4V18a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 19.5h4V21\"/>", "trenirovka": "<path d=\"M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12\"/>", "uzhin": "<path d=\"M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z\"/>", "ves": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"4\"/><path d=\"M9 10a3 3 0 0 1 6 0M12 10l1.5-1.5\"/>", "voda": "<path d=\"M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z\"/><path d=\"M9 15a3 3 0 0 0 3 3\"/>", "zamery": "<path d=\"M3 9h18v6H3z\"/><path d=\"M7 9v3M11 9v3M15 9v3M19 9v2\"/>", "zamok": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"3\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/><circle cx=\"12\" cy=\"15\" r=\"1.2\"/>", "zavtrak": "<path d=\"M4 12h12v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z\"/><path d=\"M16 13h1.5a2 2 0 0 1 0 4H15\"/><path d=\"M8 5c0 1.5 1 1.5 1 3M12 5c0 1.5 1 1.5 1 3\"/>"};
const LOGO = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><path d=\"M14 50h72a36 36 0 0 1-72 0z\" fill=\"#4F6B45\"/><path d=\"M48 46c-2-16 6-28 22-32 2 16-6 28-22 32z\" fill=\"#7A9A6E\"/><path d=\"M48 46c4-10 10-18 20-28\" stroke=\"#F6F1E7\" stroke-width=\"2\" fill=\"none\"/><path d=\"M44 46c-8-6-18-6-22-2 6 4 14 5 22 2z\" fill=\"#C9A45C\"/></svg>";
const DATA_REPO = 'makc178/nutricio-data', BRANCH = 'main', ITER = 600000;
const MEALS = [['breakfast','Завтрак','zavtrak'],['lunch','Обед','obed'],['dinner','Ужин','uzhin'],['snacks','Перекусы','perekus']];
const MNAME = Object.fromEntries(MEALS.map(m => [m[0], m[1]]));
const COL = {green:'#6E9A5A', yellow:'#D9A93A', red:'#C2553F'};
const VOL = [['waist','Талия'],['hips','Бёдра'],['chest','Грудь'],['arm','Плечо'],['thigh','Бедро (одна нога)']];
const ACT = [['sedentary','Сидячий образ жизни'],['light','Лёгкая: до 7 тыс. шагов или 1–3 тренировки'],['moderate','Средняя: 7–10 тыс. или 3–5 тренировок'],['high','Высокая: больше 10 тыс. или 6–7 тренировок'],['very_high','Очень высокая']];
const $ = s => document.querySelector(s), app = () => document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic = (n, cls='') => `<span class="ic ${cls}">${ICONS[n] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>` : ''}</span>`;
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const fmtD = d => d.toLocaleDateString('ru-RU', {day:'numeric', month:'long'});
const r0 = x => Math.round(x || 0), r1 = x => Math.round((x || 0) * 10) / 10;
const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : null; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const m = n % 10; return n > 10 && n < 20 ? c : m === 1 ? a : m >= 2 && m <= 4 ? b : c; };
function toast(t, ms = 2600) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), ms); }

/* ---------- хранилище и шифрование ---------- */
const idb = (() => { let p; const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('nutricio', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, f) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode), s = t.objectStore('kv'), q = f(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return { get: k => tx('readonly', s => s.get(k)), set: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)), keys: () => tx('readonly', s => s.getAllKeys()) }; })();
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveKey(pin, salt, iter = ITER) { const k0 = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt, iterations:iter}, k0, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']); }
async function seal(key, bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, bytes); return {iv: b64(iv), ct: b64(ct)}; }
async function open_(key, box) { return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM', iv: ub64(box.iv)}, key, ub64(box.ct))); }

let KEY = null, META = null, S = null, BPKEY = null, TAB = 'food', DAY = dkey(), PERIOD = 'week', VOLK = 'waist';
const blank = () => ({v:1, created: Date.now(), updated: 0, profile: null, plan: null, measures: [], meals: {}, activity: {}, customFoods: [], restaurants: [], awarded: {}, sync: {token: '', last: 0}, log: []});
async function save(local = false) { if (!save.p && navigator.storage?.persist) { save.p = 1; navigator.storage.persist().catch(() => {}); } S.updated = Date.now(); await idb.set('state', {salt: META.salt, iter: META.iter, ...(await seal(KEY, enc.encode(JSON.stringify(S)))), updated: S.updated}); if (!local) schedSync(); }
/* ---------- PIN ---------- */
let pinBuf = '', pinMode = 'unlock', pinFirst = '', pinFails = 0, pinBusy = false, RESTORE = null;
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  // PIN-экран не должен зависеть от IndexedDB: если хранилище не отвечает или недоступно, всё равно показываем вход
  let ok = true; try { META = await Promise.race([idb.get('meta'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]); } catch (e) { ok = false; META = null; }
  pinMode = META ? 'unlock' : 'new'; renderPin(ok ? '' : 'Хранилище браузера недоступно — данные не сохранятся');
}
window.addEventListener('error', e => { if (!app().innerHTML.trim()) app().innerHTML = `<div class="pin"><div class="h1">Nutricio</div><p class="mut" style="text-align:center;max-width:300px">Не удалось запустить приложение: ${esc(String(e.message || e))}. Обновите страницу.</p></div>`; });
function renderPin(msg = '') {
  const t = {unlock: 'Введите PIN-код', new: 'Придумайте PIN-код из 4 цифр', confirm: 'Повторите PIN-код', restore: 'PIN-код от резервной копии'}[pinMode];
  app().innerHTML = `<div class="pin"><div style="width:84px">${LOGO}</div><div class="h1" style="margin-top:8px">Nutri<span style="color:var(--sage)">cio</span></div>
  <div class="mut" style="margin-top:6px" id="pinT">${t}</div><div class="dots">${[0,1,2,3].map(i => `<i class="${i < pinBuf.length ? 'f' : ''}"></i>`).join('')}</div>
  <div class="keys">${[1,2,3,4,5,6,7,8,9].map(n => `<button data-k="${n}">${n}</button>`).join('')}<button class="e" data-k="x" aria-label="Отмена">${pinMode === 'restore' ? '✕' : ''}</button><button data-k="0">0</button><button class="e" data-k="b" aria-label="Стереть">⌫</button></div>
  <div style="margin-top:20px;min-height:40px;text-align:center;font-size:13.5px;color:var(--bad)" id="pinM">${esc(msg)}</div>
  ${pinMode === 'new' ? `<button class="lnk" id="restoreBtn">Восстановить из резервной копии</button><p class="mut" style="max-width:300px;text-align:center;margin-top:12px">Данные хранятся только у вас в зашифрованном виде. Без PIN-кода их не восстановить.</p>` : ''}</div>`;
  app().querySelectorAll('[data-k]').forEach(b => b.onclick = () => pinKey(b.dataset.k));
  const rb = $('#restoreBtn'); if (rb) rb.onclick = restoreFlow;
}
document.addEventListener('keydown', e => { if (!KEY && $('.keys') && !$('#ov')) { if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('b'); } });
async function pinKey(k) {
  if (pinBusy) return;
  if (k === 'b') pinBuf = pinBuf.slice(0, -1); else if (k === 'x') { if (pinMode === 'restore') { pinMode = 'new'; RESTORE = null; } pinBuf = ''; } else if (pinBuf.length < 4) pinBuf += k;
  renderPin(); if (pinBuf.length < 4) return;
  const pin = pinBuf; pinBuf = ''; pinBusy = true;
  try {
    if (pinMode === 'new') { pinFirst = pin; pinMode = 'confirm'; renderPin(); }
    else if (pinMode === 'confirm') {
      if (pin !== pinFirst) { pinMode = 'new'; renderPin('PIN-коды не совпали, попробуйте ещё раз'); return; }
      $('#pinM').textContent = 'Создаю ключ шифрования…'; $('#pinM').style.color = 'var(--mut)';
      const salt = crypto.getRandomValues(new Uint8Array(16)); META = {salt: b64(salt), iter: ITER, created: Date.now()};
      KEY = await deriveKey(pin, salt); S = blank(); await idb.set('meta', META); await save(true); start();
    } else if (pinMode === 'restore') { await restoreWithPin(pin); }
    else {
      const wait = (+localStorage.getItem('nc.lockUntil') || 0) - Date.now();
      if (wait > 0) { renderPin(`Слишком много попыток. Подождите ${Math.ceil(wait/1000)} с`); return; }
      $('#pinM').textContent = 'Проверка…'; $('#pinM').style.color = 'var(--mut)';
      const st = await idb.get('state'); const key = await deriveKey(pin, ub64(st.salt), st.iter);
      try { S = JSON.parse(dec.decode(await open_(key, st))); } catch (e) {
        pinFails = (+localStorage.getItem('nc.fails') || 0) + 1; localStorage.setItem('nc.fails', pinFails);
        if (pinFails >= 5) localStorage.setItem('nc.lockUntil', Date.now() + 30000 * (pinFails - 4));
        renderPin('Неверный PIN-код'); return; }
      localStorage.setItem('nc.fails', 0); KEY = key; start();
    }
  } finally { pinBusy = false; }
}
function lock() { KEY = null; S = null; BPKEY = null; BP_LIST = null; closeSheet(); pinMode = 'unlock'; renderPin(); }
let HIDDEN_AT = Date.now();
document.addEventListener('visibilitychange', () => { if (document.hidden) { HIDDEN_AT = Date.now(); if (BPKEY) { BPKEY = null; BP_LIST = null; if (TAB === 'progress' && !$('#ov')) render(); } } else if (KEY && Date.now() - HIDDEN_AT > 5 * 60000) lock(); });

function restoreFlow() {
  sheet(`<div class="hd"><div class="h1" style="font-size:21px">Восстановление</div><button class="x" data-close>×</button></div><div style="padding:0 16px">
  <p class="mut" style="margin-bottom:12px">Нужен ключ доступа GitHub к закрытому репозиторию ${DATA_REPO}, затем PIN-код, которым была зашифрована копия.</p>
  <label class="fld"><span>Ключ доступа GitHub</span><input id="rtok" type="password" autocomplete="off"></label><button class="btn" id="rgo">Загрузить копию</button></div>`);
  $('#rgo').onclick = async () => { const tok = $('#rtok').value.trim(); if (!tok) return;
    try { const st = await ghGetJson(tok, 'state.enc.json'); if (!st) throw new Error('в репозитории нет копии'); RESTORE = {tok, st: st.json}; closeSheet(); pinMode = 'restore'; renderPin(); }
    catch (e) { toast('Не удалось: ' + e.message); } };
}
async function restoreWithPin(pin) {
  $('#pinM').textContent = 'Расшифровка…';
  const st = RESTORE.st; const key = await deriveKey(pin, ub64(st.salt), st.iter);
  try { S = JSON.parse(dec.decode(await open_(key, st))); } catch (e) { renderPin('PIN-код не подходит к копии'); return; }
  S.sync = S.sync || {}; S.sync.token = RESTORE.tok; META = {salt: st.salt, iter: st.iter, created: Date.now()}; KEY = key;
  await idb.set('meta', META); await save(true); RESTORE = null; start(); toast('Данные восстановлены');
}

/* ---------- синхронизация с закрытым репозиторием ---------- */
const ghH = tok => ({Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'});
const ghUrl = p => `https://api.github.com/repos/${DATA_REPO}/contents/${p}`;
async function ghGetJson(tok, path) { const r = await fetch(`${ghUrl(path)}?ref=${BRANCH}&_=${Date.now()}`, {headers: ghH(tok), cache: 'no-store'});
  if (r.status === 404) return null; if (!r.ok) throw new Error('GitHub ' + r.status); const j = await r.json();
  let txt = j.content ? dec.decode(ub64(j.content.replace(/\n/g, ''))) : null;
  if (txt == null) { const r2 = await fetch(j.git_url, {headers: ghH(tok)}); txt = dec.decode(ub64((await r2.json()).content.replace(/\n/g, ''))); }
  return {sha: j.sha, json: JSON.parse(txt)}; }
async function ghPut(tok, path, obj, msg) { for (let i = 0; i < 3; i++) { let sha; try { const g = await fetch(`${ghUrl(path)}?ref=${BRANCH}&_=${Date.now()}`, {headers: ghH(tok), cache: 'no-store'}); if (g.ok) sha = (await g.json()).sha; } catch (e) {}
    const r = await fetch(ghUrl(path), {method: 'PUT', headers: ghH(tok), body: JSON.stringify({message: msg, branch: BRANCH, sha, content: b64(enc.encode(JSON.stringify(obj)))})});
    if (r.ok) return; if (r.status !== 409 && r.status !== 422) throw new Error('GitHub ' + r.status); } throw new Error('конфликт версий'); }
async function ghList(tok, dir) { const r = await fetch(`${ghUrl(dir)}?ref=${BRANCH}&_=${Date.now()}`, {headers: ghH(tok), cache: 'no-store'}); if (r.status === 404) return []; if (!r.ok) throw new Error('GitHub ' + r.status); return r.json(); }
async function ghDel(tok, path, sha) { await fetch(ghUrl(path), {method: 'DELETE', headers: ghH(tok), body: JSON.stringify({message: 'imported ' + path, sha, branch: BRANCH})}); }
let syncT = null, SYNC_ST = '';
function schedSync() { if (!S?.sync?.token) return; clearTimeout(syncT); syncT = setTimeout(syncNow, 4000); }
async function syncNow(manual) {
  const tok = S?.sync?.token; if (!tok) return;
  try {
    SYNC_ST = 'синхронизация…';
    const remote = await ghGetJson(tok, 'state.enc.json');
    if (remote && remote.json.updated > S.updated && remote.json.salt === META.salt) {
      try { const R = JSON.parse(dec.decode(await open_(KEY, remote.json))); R.sync = S.sync; S = R; } catch (e) {}
    }
    await save(true); await ghPut(tok, 'state.enc.json', await idb.get('state'), 'state ' + new Date().toISOString().slice(0, 16));
    for (const k of await idb.keys()) { if (!/^(dish|bp):/.test(k) || k.endsWith(':sent')) continue; if (await idb.get(k + ':sent')) continue;
      await ghPut(tok, k.replace(':', '/') + '.enc.json', await idb.get(k), 'photo'); await idb.set(k + ':sent', 1); }
    const bpm = await idb.get('bpmeta'); if (bpm && !(await idb.get('bpmeta:sent'))) { await ghPut(tok, 'bp/meta.enc.json', bpm, 'bp meta'); await idb.set('bpmeta:sent', 1); }
    await importInbox(tok);
    S.sync.last = Date.now(); await save(true); SYNC_ST = 'сохранено ' + new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
    if (manual) toast('Резервная копия обновлена');
  } catch (e) { SYNC_ST = 'ошибка: ' + e.message; if (manual) toast('Синхронизация: ' + e.message); }
  if (TAB === 'profile' && KEY && !$('#ov')) render();
}
async function importInbox(tok) { const files = await ghList(tok, 'inbox'); let n = 0;
  for (const f of files) { if (!f.name.endsWith('.json')) continue; try { const j = await ghGetJson(tok, f.path); n += importHealth(j.json); await ghDel(tok, f.path, f.sha); } catch (e) {} }
  if (n) { await save(true); toast(`Импортировано из «Здоровья»: ${n} ${plural(n, 'день', 'дня', 'дней')}`); } }

/* ---------- импорт активности (Быстрые команды / файл / inbox) ----------
   {"date":"2026-10-12","steps":8420,"activeKcal":410,"workouts":[{"type":"Бег","minutes":35,"kcal":320}]}  или {"days":[...]} */
function importHealth(j) { const days = Array.isArray(j) ? j : j.days || [j]; let n = 0;
  for (const d of days) { if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) continue; const a = S.activity[d.date] = S.activity[d.date] || {steps: 0, workouts: []};
    if (num(d.steps) != null) { a.steps = r0(num(d.steps)); a.src = 'health'; }
    if (num(d.activeKcal) != null) a.activeKcal = r0(num(d.activeKcal));
    if (Array.isArray(d.workouts)) a.workouts = (a.workouts || []).filter(w => w.src !== 'health').concat(d.workouts.map(w => ({id: uid(), type: String(w.type || 'Тренировка').slice(0, 40), min: r0(num(w.minutes)), kcal: r0(num(w.kcal)), src: 'health'})));
    n++; }
  return n; }
let PENDING_IMPORT = null;
function grabHash() { const m = location.hash.match(/^#import=(.+)$/); if (!m) return; PENDING_IMPORT = m[1]; history.replaceState(null, '', location.pathname); }
async function hashImport() { if (!PENDING_IMPORT) return; const raw = PENDING_IMPORT; PENDING_IMPORT = null;
  try { const s = decodeURIComponent(raw); let j; try { j = JSON.parse(s); } catch (e) { j = JSON.parse(dec.decode(ub64(s.replace(/-/g, '+').replace(/_/g, '/')))); }
    const n = importHealth(j); await save(); toast(`Импортировано из «Здоровья»: ${n} ${plural(n, 'день', 'дня', 'дней')}`); } catch (e) { toast('Не удалось прочитать данные импорта'); } }
/* ---------- расчёты ---------- */
const dayItems = k => S.meals[k] || [];
const sumItems = items => items.reduce((a, x) => ({kcal: a.kcal + (x.kcal || 0), p: a.p + (x.p || 0), f: a.f + (x.f || 0), c: a.c + (x.c || 0)}), {kcal: 0, p: 0, f: 0, c: 0});
function series() { return [...S.measures].sort((a, b) => a.d < b.d ? -1 : 1); }
function lastWeight() { const m = series().filter(x => x.weight); return m.length ? m[m.length - 1].weight : S.profile?.weight; }
function age(bd) { const b = new Date(bd), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
function pAge(p) { if (p.age0 != null) { const a = new Date(p.ageAt), n = new Date(); let m = (n.getFullYear() - a.getFullYear()) * 12 + n.getMonth() - a.getMonth(); if (n.getDate() < a.getDate()) m--; return p.age0 + Math.floor(Math.max(0, m) / 12); } return pAge(p); }
function recalcPlan(weight) { const p = S.profile; p.planAge = pAge(p); const prof = {sex: p.sex, age: pAge(p), height: p.height, weight: weight ?? lastWeight(), activity: p.activity, goal: p.goal, targetWeight: p.targetWeight};
  S.plan = {...C.plan(prof), weightAt: prof.weight, at: dkey(), adj: S.plan?.adj || 0, lastAuto: S.plan?.lastAuto}; }
function dayNorm(k) { const pl = S.plan; if (!pl) return null; const kcal = pl.kcal + (pl.adj || 0); const scale = kcal / pl.kcal;
  let bonus = 0; if (S.profile?.workoutBonus) bonus = C.workoutBonus((S.activity[k]?.workouts || []).reduce((s, w) => s + (w.kcal || 0), 0));
  return {kcal: kcal + bonus, p: pl.p, f: pl.f, c: Math.max(0, pl.c * scale + bonus / 4), fiber: pl.fiber}; }
// §6: основной приём считается закрытым, если записи уже есть в одном из следующих; перекусы не закрывают приёмы
function mealLimitsFor(k) { const n = dayNorm(k); const shares = S.profile?.shares || C.MEAL_SHARES; const eaten = {}; for (const [m] of MEALS) eaten[m] = sumItems(dayItems(k).filter(x => x.meal === m));
  const order = ['breakfast', 'lunch', 'dinner']; let lastIdx = -1; order.forEach((m, i) => { if (eaten[m].kcal > 0) lastIdx = i; });
  return {lim: C.redistribute(n, eaten, order.filter((m, i) => i < lastIdx), shares), eaten, norm: n}; }
function dayColor(k) { const n = dayNorm(k); if (!n || !dayItems(k).length) return null; return C.color(sumItems(dayItems(k)).kcal, n.kcal, 'kcal'); }
function streak() { let n = 0, d = new Date(); if (!dayItems(dkey(d)).length) d = addD(d, -1); for (;;) { const c = dayColor(dkey(d)); if (!c || c === 'red') break; n++; d = addD(d, -1); } return n; }
function trendSeries() { const m = series().filter(x => x.weight); if (!m.length) return []; const byD = Object.fromEntries(m.map(x => [x.d, x.weight])); const days = [];
  for (let d = parseD(m[0].d), end = parseD(dkey()); d <= end; d = addD(d, 1)) days.push(dkey(d)); const tr = C.weightTrend(days.map(k => byD[k] ?? null)); return days.map((k, i) => ({d: k, w: byD[k] ?? null, t: tr[i]})); }
function plannedKgWeek() { const p = S.profile; if (!p || p.goal === 'maintain') return 0; const w = S.plan?.weightAt || p.weight; return p.goal === 'loss' ? w * 0.0075 : w * 0.00375; }
function adherence(days) { let ok = 0; for (let i = 1; i <= days; i++) { const c = dayColor(dkey(addD(new Date(), -i))); if (c && c !== 'red') ok++; } return ok / days; }
async function maintenance() { if (!S.plan) return; let ch = false;
  const lw = lastWeight(); if (lw && C.needsRecalc(S.plan.weightAt, lw)) { recalcPlan(lw); S.log.push({d: dkey(), t: `Норма пересчитана: вес изменился до ${lw} кг`}); ch = true; }
  const last = parseD(S.plan.lastAuto || S.plan.at);
  if (C.isAutocorrectDue(last, new Date())) { const tr = trendSeries(); const a = tr.find(x => x.d === dkey(addD(new Date(), -14))), b = tr[tr.length - 1];
    if (a && b && a.t && b.t) { const res = C.autocorrect({goal: S.profile.goal, plannedKgWeek: plannedKgWeek(), trendStart: a.t, trendEnd: b.t, adherence: adherence(14), kcal: S.plan.kcal + (S.plan.adj || 0), minKcal: S.plan.minKcal});
      if (res.action === 'adjust') { S.plan.adj = (S.plan.adj || 0) + res.change; S.log.push({d: dkey(), t: `Автокоррекция: ${res.change > 0 ? '+' : ''}${res.change} ккал, норма ${r0(res.kcal)} ккал`}); toast(`Норма скорректирована на ${res.change > 0 ? '+' : ''}${res.change} ккал`, 4000); }
      else if (res.action === 'advice_discipline') S.log.push({d: dkey(), t: 'За 2 недели норма соблюдалась реже 85% дней. Норму не меняем — попробуйте держаться плана'}); }
    S.plan.lastAuto = dkey(); ch = true; }
  if (ch) await save(); }

/* ---------- мотивация (§10) ---------- */
function badgeList() { const st = Math.max(streak(), S.awarded.maxStreak || 0); const w0 = S.profile?.weight, wl = lastWeight(); const lost = w0 && wl ? w0 - wl : 0;
  const ws = series().filter(x => x.waist); const waistLost = ws.length > 1 ? ws[0].waist - ws[ws.length - 1].waist : 0;
  let protWeek = true; for (let i = 0; i < 7; i++) { const k = dkey(addD(new Date(), -i)); const n = dayNorm(k); if (!n || !dayItems(k).length || sumItems(dayItems(k)).p < n.p * 0.8) { protWeek = false; break; } }
  const steps10 = Object.values(S.activity).some(a => (a.steps || 0) >= 10000);
  return [['s7', '7 дней', st >= 7], ['s30', '30 дней', st >= 30], ['s100', '100 дней', st >= 100], ['prot', 'Белок неделю', protWeek], ['st10', '10 тыс. шагов', steps10],
    ...(S.profile?.goal === 'loss' ? [['kg1', '−1 кг', lost >= 1], ['kg5', '−5 кг', lost >= 5], ['kg10', '−10 кг', lost >= 10]] : []), ['waist5', '−5 см талии', waistLost >= 5]]
    .map(([id, t, on]) => ({id, t, on: on || !!S.awarded[id]})); }
async function checkBadges() { let ch = false; const st = streak(); if (st > (S.awarded.maxStreak || 0)) { S.awarded.maxStreak = st; ch = true; }
  for (const b of badgeList()) if (b.on && !S.awarded[b.id]) { S.awarded[b.id] = dkey(); ch = true; toast(`Новый бейдж «${b.t}». Так держать!`, 3500); }
  if (ch) await save(); }
function weeklyReport() { let days = 0, green = 0, kc = 0, prot = 0, steps = 0, sd = 0;
  for (let i = 1; i <= 7; i++) { const k = dkey(addD(new Date(), -i)); const c = dayColor(k); if (c) { days++; if (c !== 'red') green++; const t = sumItems(dayItems(k)); kc += t.kcal; if (t.p >= dayNorm(k).p * 0.8) prot++; } const a = S.activity[k]; if (a?.steps) { steps += a.steps; sd++; } }
  if (!days) return null;
  const praise = green >= 5 ? 'Отличная неделя: вы держались нормы почти каждый день.' : green >= 3 ? 'Хорошая работа: больше половины дней в плане.' : 'Вы продолжаете записывать питание — это уже главный шаг.';
  const fact = `В норме ${green} из ${days} ${plural(days, 'дня', 'дней', 'дней')} с записями, в среднем ${r0(kc / days)} ккал в день.`;
  const advice = prot < days / 2 ? 'Совет: добавьте белок в завтрак — творог, яйца или йогурт.' : sd && steps / sd < 7000 ? 'Совет: добавьте 15-минутную прогулку после обеда.' : 'Совет: продолжайте в том же ритме и взвешивайтесь по утрам.';
  return {praise, fact, advice}; }
function tips() { const k = dkey(), now = new Date(), h = now.getHours(), out = []; if (k !== DAY || !S.plan) return out; const n = dayNorm(k), t = sumItems(dayItems(k));
  if (h >= 18 && dayItems(k).length && t.p < n.p * 0.8) out.push('Белка пока меньше 80% нормы. Добавьте творог, курицу, рыбу, яйца или греческий йогурт.');
  const st = S.activity[k]?.steps; if (h >= 19 && st != null && st < 6000) out.push(`Сегодня ${st} шагов. Короткая вечерняя прогулка поможет дойти до 6000.`);
  if ([1, 2, 3].every(i => dayColor(dkey(addD(now, -i))) === 'red')) out.push('Последние три дня выше нормы — так бывает. Завтра начните с сытного белкового завтрака и запланируйте ужин заранее.');
  const late = dayItems(k).filter(x => x.meal === 'dinner' && x.t && new Date(x.t).getHours() >= 22); if (late.length && sumItems(late).kcal > 0.3 * t.kcal) out.push('Поздний ужин дал больше 30% калорий дня. Попробуйте перенести основную часть ужина пораньше.');
  return out; }

/* ---------- каркас ---------- */
async function start() { await hashImport(); if (!S.profile) return onboarding(); await maintenance(); await checkBadges(); render(); syncNow(); }
function render() { if (S?.profile && S.plan && S.profile.age0 != null && S.profile.planAge !== pAge(S.profile)) { recalcPlan(); save(); }
  const y = window.scrollY; app().innerHTML = (TAB === 'food' ? scrFood() : TAB === 'progress' ? scrProgress() : scrProfile()) + nav(); bind(); window.scrollTo(0, y);
  if (TAB === 'profile') bindProfileForm(); if (TAB === 'progress' && BPKEY) bpRenderRow(); }
function nav() { const b = (t, n, i) => `<button data-tab="${t}" class="${TAB === t ? 'on' : ''}">${ic(i)}${n}</button>`;
  return `<nav class="nav">${b('food', 'Питание', 'pitanie')}<button class="plus" id="plus" aria-label="Добавить">+</button>${b('progress', 'Прогресс', 'grafiki')}${b('profile', 'Профиль', 'profil')}</nav>`; }
function bind() { app().querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { TAB = b.dataset.tab; window.scrollTo(0, 0); render(); });
  $('#plus').onclick = () => addSheet(defaultMeal()); app().querySelectorAll('[data-act]').forEach(b => b.onclick = e => ACTIONS[b.dataset.act](b.dataset, e)); }
function defaultMeal() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 20 ? 'dinner' : 'snacks'; }
function sheet(html) { closeSheet(); const o = document.createElement('div'); o.className = 'ov'; o.id = 'ov'; o.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  o.onclick = e => { if (e.target === o || e.target.closest('[data-close]')) closeSheet(); }; document.body.appendChild(o);
  o.querySelectorAll('[data-act]').forEach(b => b.onclick = e => ACTIONS[b.dataset.act](b.dataset, e)); return o; }
function closeSheet() { const o = $('#ov'); if (o) o.remove(); }
/* ---------- анкета ---------- */
function onboarding(edit) { const p = S.profile || {};
  app().innerHTML = `<div class="scr" style="padding-bottom:30px"><div class="hd"><div><div class="mut">${edit ? 'Профиль' : 'Добро пожаловать'}</div><div class="h1">${edit ? 'Параметры и цель' : 'Расскажите о себе'}</div></div></div>
  <form id="ob"><div class="card"><h3>Исходные параметры</h3>
  <div class="seg" id="sex">${[['female', 'Женщина'], ['male', 'Мужчина']].map(([v, t]) => `<button type="button" data-v="${v}" class="${p.sex === v ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div class="g3"><label class="fld"><span>Возраст, лет</span><input name="age" inputmode="numeric" required value="${esc(S.profile ? pAge(p) : '')}"></label><label class="fld"><span>Рост, см</span><input name="height" inputmode="decimal" required value="${esc(p.height || '')}"></label><label class="fld"><span>Вес, кг</span><input name="weight" inputmode="decimal" required value="${esc(edit ? lastWeight() : '')}"></label></div>
  ${edit ? '' : `<div class="mut" style="margin:4px 0 8px">Обхваты, см (можно позже)</div><div class="g3">${VOL.map(([k, t]) => `<label class="fld"><span>${t}</span><input name="${k}" inputmode="decimal"></label>`).join('')}</div>`}
  <label class="fld"><span>Активность</span><select name="activity">${ACT.map(([v, t]) => `<option value="${v}" ${(p.activity || 'light') === v ? 'selected' : ''}>${esc(t.split(':')[0])}</option>`).join('')}</select><small class="mut" id="actd" style="display:block;margin-top:5px"></small></label></div>
  <div class="card"><h3>Цель</h3><div class="seg" id="goal">${[['loss', 'Похудеть'], ['maintain', 'Поддерживать'], ['gain', 'Набрать']].map(([v, t]) => `<button type="button" data-v="${v}" class="${(p.goal || 'loss') === v ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div id="tgt"><label class="fld"><span>Целевой вес, кг</span><input name="targetWeight" inputmode="decimal" value="${esc(p.targetWeight || '')}"></label><div class="fld"><span>Желаемый срок</span><div class="seg seg-in" id="dl">${[['1', '1 мес'], ['3', '3 мес'], ['6', '6 мес'], ['own', 'свой']].map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join('')}</div><label id="dlw" style="display:none;margin-top:8px"><input name="weeks" inputmode="numeric" placeholder="Сколько недель"></label><div id="pace" style="display:none;margin-top:6px;font-size:13px;color:var(--sage)"></div></div></div>
  <div id="obm" class="mut"></div></div><div style="padding:0 16px"><button class="btn" type="submit">${edit ? 'Сохранить и пересчитать' : 'Рассчитать мою норму'}</button>${edit ? '<button type="button" class="btn sec" style="margin-top:10px" id="obc">Отмена</button>' : ''}</div></form></div>`;
  let sex = p.sex, goal = p.goal || 'loss';
  const segs = (id, set) => document.querySelectorAll(`#${id} button`).forEach(b => b.onclick = () => { document.querySelectorAll(`#${id} button`).forEach(x => x.classList.remove('on')); b.classList.add('on'); set(b.dataset.v); });
  segs('sex', v => sex = v); segs('goal', v => { goal = v; $('#tgt').style.display = v === 'maintain' ? 'none' : ''; }); $('#tgt').style.display = goal === 'maintain' ? 'none' : '';
  const actd = () => { const t = (ACT.find(x => x[0] === $('#ob [name=activity]').value) || ['', ''])[1]; $('#actd').textContent = t.includes(':') ? t.split(':').slice(1).join(':').trim() : ''; }; $('#ob [name=activity]').onchange = actd; actd();
  let DL = p.deadline || null; const wk = () => { const n = num($('#ob [name=weeks]').value); DL = n > 0 ? dkey(new Date(Date.now() + n * 7 * 864e5)) : null; };
  if (p.deadline) { document.querySelector('#dl [data-v=own]').classList.add('on'); $('#dlw').style.display = ''; const n = Math.max(1, Math.round((new Date(p.deadline) - Date.now()) / (7 * 864e5))); $('#ob [name=weeks]').value = n; }
  segs('dl', v => { $('#dlw').style.display = v === 'own' ? '' : 'none'; if (v === 'own') wk(); else { const d = new Date(); d.setMonth(d.getMonth() + +v); DL = dkey(d); } }); $('#ob [name=weeks]').oninput = () => { wk(); pace(); };
  function pace() { const el = $('#pace'); const w = num($('#ob [name=weight]').value), tw = num($('#ob [name=targetWeight]').value);
    if (goal === 'maintain' || !DL || !w || !tw || (goal === 'loss' ? tw >= w : tw <= w)) { el.style.display = 'none'; return; }
    const need = Math.ceil(Math.abs(w - tw) / (w * (goal === 'loss' ? 0.01 : 0.005)));
    const real = new Date(); real.setHours(0, 0, 0, 0); real.setDate(real.getDate() + need * 7);
    if (new Date(DL) >= real) { el.style.display = 'none'; return; }
    el.style.display = ''; el.innerHTML = `Реалистично к ${real.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'})} <button type="button" id="paceOk" style="border:0;background:none;padding:0 0 0 6px;color:var(--gold,#D9A93A);font-weight:700;text-decoration:underline;cursor:pointer">Выбрать</button>`;
    $('#paceOk').onclick = () => { document.querySelectorAll('#dl button').forEach(x => x.classList.toggle('on', x.dataset.v === 'own')); $('#dlw').style.display = ''; $('#ob [name=weeks]').value = need; DL = dkey(real); pace(); }; }
  document.querySelectorAll('#dl button').forEach(b => b.addEventListener('click', () => pace())); ['weight', 'targetWeight'].forEach(n => $(`#ob [name=${n}]`).addEventListener('input', pace)); document.querySelectorAll('#goal button').forEach(b => b.addEventListener('click', () => pace())); pace();
  if ($('#obc')) $('#obc').onclick = () => { TAB = 'profile'; render(); };
  $('#ob').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const g = n => num(f.get(n)); const m = $('#obm'); m.style.color = 'var(--bad)';
    const ag = Math.round(g('age')), height = g('height'), weight = g('weight'), tw = g('targetWeight');
    if (!sex) return m.textContent = 'Выберите пол — он нужен для формулы обмена веществ';
    if (!(ag >= 14 && ag <= 100)) return m.textContent = 'Возраст — от 14 до 100 лет';
    if (!height || height < 120 || height > 230) return m.textContent = 'Рост — от 120 до 230 см'; if (!weight || weight < 30 || weight > 300) return m.textContent = 'Вес — от 30 до 300 кг';
    if (goal !== 'maintain' && (!tw || (goal === 'loss' ? tw >= weight : tw <= weight))) return m.textContent = goal === 'loss' ? 'Целевой вес должен быть меньше текущего' : 'Целевой вес должен быть больше текущего';
    S.profile = {...p, sex, age0: ag, ageAt: (p.age0 === ag && p.ageAt) ? p.ageAt : dkey(), height, weight: edit ? p.weight : weight, activity: f.get('activity'), goal, targetWeight: goal === 'maintain' ? null : tw, deadline: goal === 'maintain' ? null : DL, startDate: p.startDate || dkey()};
    if (!edit) { const rec = {d: dkey(), weight}; for (const [k] of VOL) { const v = g(k); if (v) rec[k] = v; } S.measures.push(rec); }
    else { upsertMeasure({weight}); S.plan = {...(S.plan || {}), adj: 0}; }
    recalcPlan(weight); await save(); TAB = 'food'; render(); planSheet(true); };
}
function upsertMeasure(v, d = dkey()) { let m = S.measures.find(x => x.d === d); if (!m) { m = {d}; S.measures.push(m); } Object.assign(m, v); }
function planSheet(first) { const p = S.profile, pl = S.plan; const pc = C.paceCheck({goal: p.goal, weight: lastWeight(), targetWeight: p.targetWeight, today: new Date(), deadline: p.deadline ? parseD(p.deadline) : null});
  const yr = d => `${fmtD(d)} ${d.getFullYear()}`;
  sheet(`<div class="hd"><div class="h1" style="font-size:21px">${first ? 'Ваша норма готова' : 'Расчёт нормы'}</div><button class="x" data-close>×</button></div>
  <div class="card" style="text-align:center"><div style="font-weight:800;font-size:38px">${r0(pl.kcal + (pl.adj || 0))}</div><div class="mut">ккал в день</div>
  <div class="g3" style="margin-top:12px">${[['Белки', pl.p], ['Жиры', pl.f], ['Углеводы', pl.c]].map(([t, v]) => `<div><b style="font-size:18px">${r0(v)} г</b><div class="mut">${t}</div></div>`).join('')}</div></div>
  <div class="card" style="font-size:13.5px;line-height:1.6">Базовый обмен: <b>${pl.bmr}</b> ккал · расход с активностью: <b>${pl.tdee}</b> ккал<br>ИМТ: <b>${pl.bmi}</b> · клетчатка: <b>${pl.fiber} г</b> · вода: <b>${(pl.waterMl / 1000).toFixed(1)} л</b><br>
  По приёмам: ${MEALS.map(([m, t]) => `${t.toLowerCase()} ${r0(pl.meals[m].kcal)}`).join(', ')} ккал
  ${p.goal !== 'maintain' ? `<br>Безопасный темп: ${pc.safeRangeKgWeek[0]}–${pc.safeRangeKgWeek[1]} кг в неделю. Реалистичная дата цели: <b>${yr(pc.realisticDate)}</b>` : ''}
  ${pc.ok === false ? `<div class="tip" style="margin:10px 0 0;background:#D9A93A22">Выбранный срок требует слишком быстрого темпа. Безопаснее ориентироваться на ${yr(pc.realisticDate)}.</div>` : ''}</div>
  <div style="padding:0 16px"><button class="btn" data-close>Понятно</button></div>`); }

/* ---------- Питание ---------- */
function ring(val, max, color, size = 150) { const r = size / 2 - 13, L = 2 * Math.PI * r, frac = Math.min(1, max ? val / max : 0), h = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${h}" cy="${h}" r="${r}" stroke="#ECE5D6" stroke-width="13" fill="none"/>${val ? `<circle cx="${h}" cy="${h}" r="${r}" stroke="${color}" stroke-width="13" fill="none" stroke-linecap="round" stroke-dasharray="${frac * L} ${L}" transform="rotate(-90 ${h} ${h})"/>` : ''}</svg>`; }
const barH = (t, v, max, nut) => `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600"><span>${t}</span><span>${r0(v)} / ${r0(max)} г</span></div><div class="bar"><i style="width:${Math.min(100, max ? v / max * 100 : 0)}%;background:${COL[C.color(v, max, nut)]}"></i></div></div>`;
function scrFood() { const k = DAY, {lim, eaten, norm} = mealLimitsFor(k), t = sumItems(dayItems(k)), dc = C.color(t.kcal, norm.kcal, 'kcal'), left = norm.kcal - t.kcal, st = streak(), isToday = k === dkey(), d = parseD(k), a = S.activity[k];
  return `<div class="scr"><div class="hd"><div><div class="row" style="gap:6px"><button class="lnk" data-act="day" data-n="-1" aria-label="Предыдущий день">‹</button><span class="mut">${isToday ? 'Сегодня, ' : ''}${d.toLocaleDateString('ru-RU', {weekday: 'long', day: 'numeric', month: 'long'})}</span>${isToday ? '' : '<button class="lnk" data-act="day" data-n="1" aria-label="Следующий день">›</button>'}</div><div class="h1">Питание</div></div>${st ? `<div style="font-weight:700;font-size:13px" class="gold">🔥 ${st} ${plural(st, 'день', 'дня', 'дней')}</div>` : ''}</div>
  <div class="card row" style="gap:14px"><div class="ring">${ring(t.kcal, norm.kcal, COL[dc])}<div><b style="font-size:26px">${r0(Math.abs(left))}</b><span class="mut">${left >= 0 ? 'осталось ккал' : 'сверх нормы'}</span><span style="font-size:11px;font-weight:600">${r0(t.kcal)} / ${r0(norm.kcal)}</span></div></div>
  <div class="sp">${barH('Белки', t.p, norm.p, 'p')}${barH('Жиры', t.f, norm.f, 'f')}${barH('Углеводы', t.c, norm.c, 'c')}</div></div>
  ${tips().map(x => `<div class="tip">💡 ${esc(x)}</div>`).join('')}
  ${MEALS.map(([m, tn, icn]) => { const e = eaten[m], l = lim[m], c = C.color(e.kcal, l.kcal, 'kcal'), items = dayItems(k).filter(x => x.meal === m);
    return `<div class="card row" style="padding:12px 14px;cursor:pointer" data-act="meal" data-m="${m}"><div class="ib">${ic(icn)}</div><div class="sp"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">${tn}</b><b style="font-size:14px;color:${e.kcal ? COL[c] : 'var(--mut)'}">${r0(e.kcal)} / ${r0(l.kcal)}</b></div>
    <div class="mut" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${items.length ? esc(items.map(x => x.name).join(', ')) : 'Пока пусто · нажмите, чтобы добавить'}</div><div class="bar" style="margin-top:6px;height:5px"><i style="width:${Math.min(100, l.kcal ? e.kcal / l.kcal * 100 : 0)}%;background:${COL[c]}"></i></div></div></div>`; }).join('')}
  <div class="g2" style="padding:0 16px"><div class="card row" style="margin:0;padding:12px;cursor:pointer" data-act="activity" data-d="${k}">${ic('shagi')}<div><b>${a?.steps ? a.steps.toLocaleString('ru-RU') : '—'}</b><div class="mut">шагов</div></div></div>
  <div class="card row" style="margin:0;padding:12px;cursor:pointer" data-act="measure">${ic('ves')}<div><b>${lastWeight() ? r1(lastWeight()) + ' кг' : '—'}</b><div class="mut">записать вес</div></div></div></div></div>`; }
function mealSheet(m) { const items = dayItems(DAY).filter(x => x.meal === m), {lim} = mealLimitsFor(DAY), t = sumItems(items);
  sheet(`<div class="hd"><div><div class="mut">${fmtD(parseD(DAY))}</div><div class="h1" style="font-size:21px">${MNAME[m]}</div></div><button class="x" data-close>×</button></div>
  <div class="card"><div class="mut" style="margin-bottom:6px">${r0(t.kcal)} из ${r0(lim[m].kcal)} ккал · Б ${r0(t.p)} · Ж ${r0(t.f)} · У ${r0(t.c)}</div>
  ${items.length ? items.map(x => `<div class="li"><div class="sp"><b style="font-size:14px">${esc(x.name)}</b><div class="mut">${x.g ? r0(x.g) + ' г · ' : ''}Б ${r1(x.p)} · Ж ${r1(x.f)} · У ${r1(x.c)}${x.est ? ' · ≈ оценка' : ''}${x.photo ? ' · есть фото' : ''}</div></div><b>${r0(x.kcal)}</b><button class="x" style="font-size:20px" data-act="delItem" data-id="${x.id}" data-m="${m}" aria-label="Удалить">×</button></div>`).join('') : '<div class="empty">В этом приёме пока ничего нет</div>'}</div>
  <div style="padding:0 16px"><button class="btn" data-act="addTo" data-m="${m}">Добавить в «${MNAME[m]}»</button></div>`); }
let CUR_MEAL = 'breakfast';
function addSheet(m) { CUR_MEAL = m; const rc = recent(); sheet(`<div class="hd"><div><div class="mut">${fmtD(parseD(DAY))}</div><div class="h1" style="font-size:21px">Добавить</div></div><button class="x" data-close>×</button></div>
  <div class="seg" style="margin:0 16px 14px" id="mealSeg">${MEALS.map(([v, t]) => `<button data-v="${v}" class="${v === m ? 'on' : ''}">${t}</button>`).join('')}</div>
  <div class="tiles"><button class="tile" data-act="addPhoto">${ic('foto')}<b>Фото</b><span class="mut">Сохранить фото блюда</span></button><button class="tile" data-act="addSearch">${ic('poisk')}<b>Поиск</b><span class="mut">База продуктов</span></button>
  <button class="tile" data-act="addRest">${ic('restoran')}<b>Ресторан</b><span class="mut">Блюда из меню</span></button><button class="tile" data-act="addManual">${ic('dobavit')}<b>Вручную</b><span class="mut">Своё блюдо и КБЖУ</span></button></div>
  ${rc.length ? `<div class="card" style="margin-top:14px"><h3>Недавние</h3>${rc.map((x, i) => `<div class="li" style="cursor:pointer" data-act="quickRecent" data-i="${i}"><div class="sp"><b style="font-size:14px">${esc(x.name)}</b><div class="mut">${x.g ? r0(x.g) + ' г · ' : ''}${r0(x.kcal)} ккал</div></div><span class="pill">+</span></div>`).join('')}</div>` : ''}`);
  document.querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => { document.querySelectorAll('#mealSeg button').forEach(x => x.classList.remove('on')); b.classList.add('on'); CUR_MEAL = b.dataset.v; }); }
function recent() { const seen = new Set(), out = []; for (const k of Object.keys(S.meals).sort().reverse()) for (const x of [...S.meals[k]].reverse()) { const id = x.name + '|' + r0(x.g); if (!seen.has(id)) { seen.add(id); out.push(x); } if (out.length >= 6) return out; } return out; }
async function addItem(it) { (S.meals[DAY] = S.meals[DAY] || []).push({id: uid(), meal: CUR_MEAL, t: Date.now(), ...it}); await save(); closeSheet(); render(); toast(`Добавлено: ${it.name}`); await checkBadges(); }
function portionForm(food, src) { const per100 = food.per !== 'portion';
  sheet(`<div class="hd"><div><div class="mut">${MNAME[CUR_MEAL]}</div><div class="h1" style="font-size:20px">${esc(food.name)}</div></div><button class="x" data-close>×</button></div>
  <div class="card"><div class="mut" style="margin-bottom:10px">${per100 ? 'На 100 г' : 'На порцию'}: ${r0(food.kcal)} ккал · Б ${r1(food.p)} · Ж ${r1(food.f)} · У ${r1(food.c)}${food.est ? ' · ≈ оценка' : ''}</div>
  <label class="fld"><span>${per100 ? 'Вес порции, г' : 'Количество порций'}</span><input id="pg" inputmode="decimal" value="${per100 ? (food.g || 100) : 1}"></label><div id="pv" style="font-weight:700"></div></div>
  <div style="padding:0 16px"><button class="btn" id="padd">Добавить</button></div>`);
  const calc = () => { const q = num($('#pg').value) || 0, k = per100 ? q / 100 : q; return {name: food.name, g: per100 ? q : food.g ? food.g * q : null, kcal: food.kcal * k, p: (food.p || 0) * k, f: (food.f || 0) * k, c: (food.c || 0) * k, src, est: !!food.est}; };
  const upd = () => { const x = calc(); $('#pv').textContent = `${r0(x.kcal)} ккал · Б ${r1(x.p)} · Ж ${r1(x.f)} · У ${r1(x.c)}`; }; $('#pg').oninput = upd; upd();
  $('#padd').onclick = () => { if (!(num($('#pg').value) > 0)) return toast('Укажите количество'); addItem(calc()); }; }
let FOODS = null, RES = [];
async function loadFoods() { if (FOODS) return FOODS; try { const r = await fetch('data/foods.json'); if (!r.ok) throw 0; const j = await r.json(); FOODS = (Array.isArray(j) ? j : j.items || []).map(x => ({...x, name: x.name_ru || x.name, n: ((x.name_ru || x.name || '') + ' ' + (x.brand || '')).toLowerCase().replace(/ё/g, 'е')})); } catch (e) { FOODS = []; } return FOODS; }
function searchSheet() { sheet(`<div class="hd"><div class="h1" style="font-size:21px">Поиск продукта</div><button class="x" data-close>×</button></div>
  <div style="padding:0 16px"><label class="fld"><input id="q" placeholder="Например, творог 5%" autocomplete="off"></label></div><div class="card" id="qr"><div class="empty">Загрузка базы…</div></div><p class="mut" style="padding:0 20px">Источники: Open Food Facts (лицензия ODbL), USDA FoodData Central.</p>`);
  const q = $('#q'); setTimeout(() => q.focus(), 50);
  loadFoods().then(F => { const draw = () => { if (!$('#qr')) return; const s = q.value.trim().toLowerCase().replace(/ё/g, 'е'); const mine = S.customFoods.map(x => ({...x, n: x.name.toLowerCase().replace(/ё/g, 'е'), mine: 1}));
      if (!F.length && !mine.length) { $('#qr').innerHTML = '<div class="empty">База продуктов ещё подключается. Пока добавьте блюдо вручную — оно сохранится в «Мои продукты» и будет находиться поиском.</div>'; return; }
      if (s.length < 2) { $('#qr').innerHTML = `<div class="empty">Введите хотя бы 2 буквы. В базе ${(F.length + mine.length).toLocaleString('ru-RU')} продуктов.</div>`; return; }
      const words = s.split(/\s+/); RES = mine.concat(F).filter(x => words.every(w => x.n.includes(w))).slice(0, 40);
      $('#qr').innerHTML = RES.length ? RES.map((x, i) => `<div class="li" style="cursor:pointer" data-i="${i}"><div class="sp"><b style="font-size:14px">${esc(x.name)}</b><div class="mut">${x.brand ? esc(x.brand) + ' · ' : ''}${x.mine ? 'мой продукт · ' : ''}${r0(x.kcal)} ккал / ${x.per === 'portion' ? 'порция' : '100 г'}</div></div><span class="pill">+</span></div>`).join('') : '<div class="empty">Ничего не найдено. Попробуйте другое слово или добавьте вручную.</div>';
      $('#qr').querySelectorAll('[data-i]').forEach(e => e.onclick = () => portionForm(RES[+e.dataset.i], RES[+e.dataset.i].mine ? 'my' : 'db')); };
    q.oninput = draw; draw(); }); }
function manualSheet(photoId) { sheet(`<div class="hd"><div><div class="mut">${MNAME[CUR_MEAL]}</div><div class="h1" style="font-size:21px">${photoId ? 'Фото сохранено' : 'Своё блюдо'}</div></div><button class="x" data-close>×</button></div>
  ${photoId ? '<div class="tip">Распознавание блюда по фото появится позже. Пока введите название и КБЖУ вручную — фото останется в записи в зашифрованном виде.</div>' : ''}
  <form id="mf" style="padding:0 16px"><label class="fld"><span>Название</span><input name="name" required></label>
  <div class="g2"><label class="fld"><span>Вес порции, г</span><input name="g" inputmode="decimal"></label><label class="fld"><span>Калории, ккал</span><input name="kcal" inputmode="decimal" required></label></div>
  <div class="g3"><label class="fld"><span>Белки, г</span><input name="p" inputmode="decimal"></label><label class="fld"><span>Жиры, г</span><input name="f" inputmode="decimal"></label><label class="fld"><span>Углеводы, г</span><input name="c" inputmode="decimal"></label></div>
  <label class="fld" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="keep" style="width:auto" checked><span style="margin:0">Сохранить в «Мои продукты»</span></label>
  <button class="btn" type="submit">Добавить</button></form>`);
  $('#mf').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); const g = n => num(f.get(n)) || 0; const name = f.get('name').trim(); if (!name) return;
    const it = {name, g: g('g') || null, kcal: g('kcal'), p: g('p'), f: g('f'), c: g('c'), src: photoId ? 'photo' : 'manual'}; if (photoId) it.photo = photoId;
    if (f.get('keep') && !S.customFoods.some(x => x.name === name)) S.customFoods.push({id: uid(), name, per: 'portion', g: it.g, kcal: it.kcal, p: it.p, f: it.f, c: it.c});
    addItem(it); }; }
function pickImage(cb, capture) { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.capture = 'environment'; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }
async function shrink(file, max = 1280) { const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = r0(bmp.width * k); cv.height = r0(bmp.height * k); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Uint8Array(await (await new Promise(r => cv.toBlob(r, 'image/jpeg', .82))).arrayBuffer()); }
function photoAdd() { pickImage(async f => { try { const bytes = await shrink(f); const id = uid(); await idb.set('dish:' + id, await seal(KEY, bytes)); manualSheet(id); } catch (e) { toast('Не удалось сохранить фото'); } }, true); }
let RESTDB = null;
async function loadRest() { if (RESTDB) return RESTDB; try { const r = await fetch('data/restaurants.json'); if (!r.ok) throw 0; const j = await r.json(); RESTDB = j.restaurants || j; } catch (e) { RESTDB = []; } return RESTDB; }
async function restSheet() { const pub = await loadRest(); const all = pub.map(r => ({...r, pub: 1})).concat(S.restaurants);
  sheet(`<div class="hd"><div class="h1" style="font-size:21px">Рестораны</div><button class="x" data-close>×</button></div>
  <div class="card">${all.length ? all.map((r, i) => `<div class="li" style="cursor:pointer" data-ri="${i}"><div class="ib" style="width:36px;height:36px">${ic('restoran')}</div><div class="sp"><b style="font-size:14px">${esc(r.name)}</b><div class="mut">${(r.dishes || []).length ? `${r.dishes.length} ${plural(r.dishes.length, 'блюдо', 'блюда', 'блюд')}` : 'меню ещё не загружено'}${r.address ? ' · ' + esc(r.address) : ''}</div></div>${r.kbju_source === 'site' ? (/eda\.yandex|ginza/i.test(r.url || '') ? '<span class="pill" style="background:#EFE3C8;color:#8a6a1f;font-weight:600">меню доставки</span>' : '<span class="pill">КБЖУ с сайта</span>') : r.kbju_source ? '<span class="pill" style="background:#EFE3C8;color:#8a6a1f;font-weight:600">оценка по составу</span>' : ''}</div>`).join('') : '<div class="empty">Меню ресторанов ещё собираются. Можно добавить ресторан и блюда вручную.</div>'}</div>
  <div style="padding:0 16px"><button class="btn sec" id="addR">+ Добавить ресторан</button></div>`);
  document.querySelectorAll('[data-ri]').forEach(e => e.onclick = () => restMenu(all[+e.dataset.ri]));
  $('#addR').onclick = () => { sheet(`<div class="hd"><div class="h1" style="font-size:21px">Новый ресторан</div><button class="x" data-close>×</button></div><form id="rf" style="padding:0 16px"><label class="fld"><span>Название</span><input name="name" required></label><label class="fld"><span>Сайт (необязательно)</span><input name="url" type="url" placeholder="https://"></label><p class="mut" style="margin-bottom:12px">Загрузка меню с сайта и по фото меню появится позже. Сейчас блюда добавляются вручную.</p><button class="btn">Сохранить</button></form>`);
    $('#rf').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const r = {id: uid(), name: f.get('name').trim(), url: f.get('url') || '', dishes: []}; S.restaurants.push(r); await save(); restMenu(r); }; }; }
function restMenu(r) { const own = !r.pub;
  const dlv = /eda\.yandex|ginza/i.test(r.url || '');
  const badge = (t) => ` <span class="pill" style="background:#EFE3C8;color:#8a6a1f;font-weight:600">${t}</span>`;
  const cats = [...new Set((r.dishes || []).map(d => d.cat).filter(Boolean))]; let CAT = '';
  const sfx = ` (${r.name})`; const ord = []; const seenO = new Set();
  for (const k of Object.keys(S.meals).sort().reverse()) for (const x of [...S.meals[k]].reverse()) if (x.name && x.name.endsWith(sfx) && !seenO.has(x.name)) { seenO.add(x.name); ord.push(x); }
  sheet(`<div class="hd"><div><div class="mut">${MNAME[CUR_MEAL]}</div><div class="h1" style="font-size:21px">${esc(r.name)}${dlv ? badge('меню доставки') : ''}</div></div><button class="x" data-close>×</button></div>
  <div id="rtop" style="position:sticky;top:0;z-index:2;background:var(--bg,#F6F1E7);padding:0 16px 6px"><label class="fld"><input id="rq" placeholder="Поиск по меню"></label>
  ${cats.length > 1 ? `<div id="rcat" style="display:flex;gap:6px;overflow-x:auto;white-space:nowrap;padding:2px 0 4px;scrollbar-width:none"><button class="pill" data-c="" style="border:0">Все</button>${cats.map(c => `<button class="pill" data-c="${esc(c)}" style="border:0;background:#0000000d;color:inherit">${esc(c)}</button>`).join('')}</div>` : ''}</div>
  ${ord.length ? `<div style="padding:4px 20px 0" class="mut"><b>Вы заказывали</b></div><div class="card" id="ro">${ord.slice(0, 8).map((x, i) => `<div class="li" style="cursor:pointer" data-oi="${i}"><div class="sp"><b style="font-size:14px">${esc(x.name.slice(0, -sfx.length))}</b><div class="mut">${x.g ? r0(x.g) + ' г · ' : ''}${r0(x.kcal)} ккал</div></div><b style="color:var(--sage)">+</b></div>`).join('')}</div>` : ''}
  <div id="rl"></div>
  ${own ? '<div style="padding:0 16px"><button class="btn sec" id="addD">+ Добавить блюдо</button></div>' : `<p class="mut" style="padding:0 20px">Источник КБЖУ: ${esc(r.note || '')}${r.url ? ` (${esc(r.url)})` : ''}</p>`}`);
  const row = d => { const pp = d.pk != null; const e = d.est ? '≈' : '';
    return `<div class="li" style="cursor:pointer" data-di="${r.dishes.indexOf(d)}"><div class="sp"><b style="font-size:14px">${esc(d.name)}</b>${d.est ? badge(d.est_src === 'photo' ? 'по фото меню' : 'оценка по составу') : ''}<div class="mut">${pp ? `порция${d.g ? ' ' + r0(d.g) + ' г' : ''} · ${e}Б ${r1(d.pp)} · ${e}Ж ${r1(d.pf)} · ${e}У ${r1(d.pc)}` : `${d.per === '100g' ? 'на 100 г · ' : d.g ? r0(d.g) + ' г · ' : ''}${e}Б ${r1(d.p)} · ${e}Ж ${r1(d.f)} · ${e}У ${r1(d.c)}`}</div></div><b>${e}${r0(pp ? d.pk : d.kcal)}${pp ? '' : '<span class="mut" style="font-weight:400">/100</span>'.repeat(d.per === '100g' ? 1 : 0)}</b></div>`; };
  const draw = () => { const s = $('#rq').value.toLowerCase(); const ds = (r.dishes || []).filter(d => d.name.toLowerCase().includes(s) && (!CAT || d.cat === CAT));
    let h = ''; if (!ds.length) h = '<div class="card"><div class="empty">Блюд не найдено</div></div>';
    else if (cats.length > 1) { for (const c of cats) { const g = ds.filter(d => d.cat === c); if (g.length) h += `<div style="padding:8px 20px 0" class="mut"><b>${esc(c)}</b></div><div class="card">${g.map(row).join('')}</div>`; } const rest = ds.filter(d => !d.cat); if (rest.length) h += `<div class="card">${rest.map(row).join('')}</div>`; }
    else h = `<div class="card">${ds.map(row).join('')}</div>`;
    $('#rl').innerHTML = h;
    $('#rl').querySelectorAll('[data-di]').forEach(e => e.onclick = () => { const d = r.dishes[+e.dataset.di]; const nm = `${d.name} (${r.name})`;
      if (d.pk != null && d.g) portionForm({...d, name: nm, per: '100g'}, 'restaurant'); else if (d.pk != null) portionForm({...d, name: nm, per: 'portion', kcal: d.pk, p: d.pp, f: d.pf, c: d.pc, g: null}, 'restaurant'); else portionForm({...d, name: nm, per: d.per === '100g' ? '100g' : 'portion'}, 'restaurant'); }); };
  $('#rq').oninput = draw; draw();
  document.querySelectorAll('#rcat [data-c]').forEach(b => b.onclick = () => { CAT = b.dataset.c; document.querySelectorAll('#rcat [data-c]').forEach(x => { const on = x.dataset.c === CAT; x.style.background = on ? '' : '#0000000d'; x.style.color = on ? '' : 'inherit'; }); draw(); });
  document.querySelectorAll('#ro [data-oi]').forEach(e => e.onclick = () => { const {id, meal, t, ...it} = ord[+e.dataset.oi]; addItem(it); });
  if (own) $('#addD').onclick = () => { sheet(`<div class="hd"><div class="h1" style="font-size:20px">Блюдо · ${esc(r.name)}</div><button class="x" data-close>×</button></div><form id="df" style="padding:0 16px"><label class="fld"><span>Название</span><input name="name" required></label>
    <div class="g2"><label class="fld"><span>Вес, г</span><input name="g" inputmode="decimal"></label><label class="fld"><span>Ккал на порцию</span><input name="kcal" inputmode="decimal" required></label></div><div class="g3"><label class="fld"><span>Белки</span><input name="p" inputmode="decimal"></label><label class="fld"><span>Жиры</span><input name="f" inputmode="decimal"></label><label class="fld"><span>Углеводы</span><input name="c" inputmode="decimal"></label></div><button class="btn">Сохранить блюдо</button></form>`);
    $('#df').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const g = n => num(f.get(n)) || 0; r.dishes.push({name: f.get('name').trim(), g: g('g') || null, kcal: g('kcal'), p: g('p'), f: g('f'), c: g('c')}); await save(); restMenu(r); }; }; }

/* ---------- Замеры / активность ---------- */
function measureSheet() { const m = S.measures.find(x => x.d === dkey()) || {};
  sheet(`<div class="hd"><div class="h1" style="font-size:21px">Замеры</div><button class="x" data-close>×</button></div><form id="msf" style="padding:0 16px">
  <label class="fld"><span>Дата</span><input name="d" type="date" value="${dkey()}" max="${dkey()}"></label><label class="fld"><span>Вес, кг</span><input name="weight" inputmode="decimal" value="${m.weight || ''}"></label>
  <div class="g3">${VOL.map(([k, t]) => `<label class="fld"><span>${t}, см</span><input name="${k}" inputmode="decimal" value="${m[k] || ''}"></label>`).join('')}</div><button class="btn">Сохранить</button></form>`);
  $('#msf').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const v = {}; for (const k of ['weight', ...VOL.map(x => x[0])]) { const x = num(f.get(k)); if (x != null) { if (k === 'weight' && (x < 30 || x > 300)) return toast('Проверьте вес'); v[k] = x; } }
    if (!Object.keys(v).length) return toast('Введите хотя бы одно значение'); upsertMeasure(v, f.get('d') || dkey()); await maintenance(); await save(); closeSheet(); render(); toast('Замеры сохранены'); await checkBadges(); }; }
function activitySheet(d = dkey()) { const a = S.activity[d] || {steps: 0, workouts: []};
  sheet(`<div class="hd"><div><div class="mut">${fmtD(parseD(d))}</div><div class="h1" style="font-size:21px">Активность</div></div><button class="x" data-close>×</button></div>
  <form id="af" style="padding:0 16px"><label class="fld"><span>Шаги за день</span><input name="steps" inputmode="numeric" value="${a.steps || ''}"></label>
  <div class="card" style="margin:0 0 12px"><h3>Тренировки</h3>${(a.workouts || []).length ? a.workouts.map(w => `<div class="li"><div class="sp"><b style="font-size:14px">${esc(w.type)}</b><div class="mut">${w.min || 0} мин · ${w.kcal || 0} ккал${w.src === 'health' ? ' · из «Здоровья»' : ''}</div></div><button type="button" class="x" style="font-size:20px" data-w="${w.id}">×</button></div>`).join('') : '<div class="empty" style="padding:8px">Тренировок нет</div>'}
  <div class="g3" style="margin-top:8px"><label class="fld"><span>Тип</span><input name="type" placeholder="Бег"></label><label class="fld"><span>Минуты</span><input name="min" inputmode="numeric"></label><label class="fld"><span>Ккал</span><input name="kcal" inputmode="numeric"></label></div></div>
  <button class="btn">Сохранить</button></form>`);
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => { a.workouts = a.workouts.filter(w => w.id !== b.dataset.w); S.activity[d] = a; await save(); activitySheet(d); });
  $('#af').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); a.steps = r0(num(f.get('steps')) || 0); a.workouts = a.workouts || [];
    if (f.get('type') || num(f.get('min'))) a.workouts.push({id: uid(), type: f.get('type') || 'Тренировка', min: r0(num(f.get('min')) || 0), kcal: r0(num(f.get('kcal')) || 0), src: 'manual'});
    S.activity[d] = a; await save(); closeSheet(); render(); toast('Активность сохранена'); await checkBadges(); }; }
/* ---------- Прогресс ---------- */
function chartData() { const tr = trendSeries(), today = new Date(), m = series();
  const agg = (n, step) => { const out = []; for (let i = n - 1; i >= 0; i--) { const end = step === 'm' ? new Date(today.getFullYear(), today.getMonth() - i + 1, 0) : addD(today, -i * (step === 'w' ? 7 : 1)); const start = step === 'm' ? new Date(end.getFullYear(), end.getMonth(), 1) : step === 'w' ? addD(end, -6) : end;
      const ks = dkey(start), ke = dkey(end), pts = tr.filter(x => x.d >= ks && x.d <= ke), ws = pts.filter(x => x.w != null).map(x => x.w), ts = pts.filter(x => x.t != null), vols = m.filter(x => x.d >= ks && x.d <= ke && x[VOLK]).map(x => x[VOLK]);
      out.push({label: step === 'm' ? end.toLocaleDateString('ru-RU', {month: 'short'}).replace('.', '') : step === 'w' ? `${start.getDate()}.${pad(start.getMonth() + 1)}` : String(end.getDate()), w: ws.length ? ws.reduce((a, b) => a + b) / ws.length : null, t: ts.length ? ts[ts.length - 1].t : null, v: vols.length ? vols[vols.length - 1] : null}); } return out; };
  return PERIOD === 'week' ? agg(7, 'd') : PERIOD === 'month' ? agg(30, 'd') : PERIOD === 'quarter' ? agg(13, 'w') : agg(12, 'm'); }
function lineChart(pts, keys, target) { const W = 340, H = 160, L = 30, B = 20, T = 10; const vals = pts.flatMap(p => keys.map(k => p[k.k])).filter(v => v != null);
  if (!vals.length) return '<div class="empty">Нет данных за этот период</div>'; if (target) vals.push(target); let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 1) { lo -= 1; hi += 1; } const pd = (hi - lo) * .12; lo -= pd; hi += pd;
  const x = i => L + (W - L - 6) * (pts.length === 1 ? .5 : i / (pts.length - 1)), y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const grid = [0, .5, 1].map(f => { const v = lo + (hi - lo) * f; return `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#ECE5D6"/><text x="${L - 4}" y="${y(v) + 4}" font-size="9" text-anchor="end" fill="#8A877F">${r1(v)}</text>`; }).join('');
  const every = Math.ceil(pts.length / 7), labels = pts.map((p, i) => i % every === 0 || i === pts.length - 1 ? `<text x="${x(i)}" y="${H - 5}" font-size="9" text-anchor="middle" fill="#8A877F">${p.label}</text>` : '').join('');
  const lines = keys.map(k => { let d = '', pen = false; pts.forEach((p, i) => { if (p[k.k] == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[k.k]).toFixed(1); pen = true; });
    const dots = k.dots ? pts.map((p, i) => p[k.k] != null ? `<circle cx="${x(i)}" cy="${y(p[k.k])}" r="2.6" fill="${k.c}"/>` : '').join('') : ''; return `<path d="${d}" fill="none" stroke="${k.c}" stroke-width="${k.w || 2}" stroke-linecap="round"/>${dots}`; }).join('');
  const tl = target ? `<line x1="${L}" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="#C9A45C" stroke-dasharray="5 4"/><text x="${W - 2}" y="${y(target) - 4}" font-size="9" text-anchor="end" fill="#C9A45C">цель ${target}</text>` : '';
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img">${grid}${tl}${lines}${labels}</svg>`; }
function goalCard() { const p = S.profile, tr = trendSeries(), cur = tr.length ? tr[tr.length - 1].t : lastWeight(), w0 = p.weight;
  if (p.goal === 'maintain') return `<div class="card"><h3>Цель и факт ${ic('cel')}</h3><div class="mut">Цель — поддерживать вес ${r1(w0)} кг. Тренд сейчас: <b style="color:var(--ink)">${r1(cur)} кг</b> (${cur - w0 >= 0 ? '+' : ''}${r1(cur - w0)} кг).</div></div>`;
  const total = Math.abs(p.targetWeight - w0), done = Math.max(0, p.goal === 'loss' ? w0 - cur : cur - w0), frac = total ? Math.min(1, done / total) : 0;
  let fc = 'появится после 2 недель записей веса'; const k14 = tr.find(x => x.d === dkey(addD(new Date(), -14)));
  if (k14 && k14.t) { const rate = (cur - k14.t) / 2, need = p.targetWeight - cur; if (rate && Math.sign(rate) === Math.sign(need)) { const d = addD(new Date(), Math.ceil(need / rate * 7)); fc = `при текущем темпе — ${fmtD(d)} ${d.getFullYear()}`; } else fc = 'вес пока не движется к цели'; }
  const fact = k14 && k14.t ? Math.abs(cur - k14.t) / 2 : null;
  return `<div class="card"><h3>Цель и факт ${ic('cel')}</h3><div class="row" style="justify-content:space-between;margin-bottom:8px"><div><div class="mut">Старт</div><b>${r1(w0)} кг</b></div><div style="text-align:center"><div class="mut">Тренд</div><b style="font-size:19px">${r1(cur)} кг</b></div><div style="text-align:right"><div class="mut">Цель</div><b class="gold">${r1(p.targetWeight)} кг</b></div></div>
  <div class="bar"><i style="width:${frac * 100}%;background:var(--sage)"></i></div><div class="mut" style="margin-top:8px;line-height:1.5">Пройдено ${r1(done)} из ${r1(total)} кг (${r0(frac * 100)}%). План: ${r1(plannedKgWeek())} кг/нед${fact != null ? `, факт: ${r1(fact)} кг/нед` : ''}.<br>Прогноз: ${fc}.${p.deadline ? `<br>Желаемый срок: ${fmtD(parseD(p.deadline))} ${parseD(p.deadline).getFullYear()}.` : ''}</div></div>`; }
function scrProgress() { const has = series().some(x => x.weight), pts = chartData(), hasVol = series().some(x => x[VOLK]), vols = series().filter(x => VOL.some(([k]) => x[k]));
  const a = S.activity[dkey()], wr = weeklyReport(), bl = badgeList(), st = streak();
  const wk = []; for (let i = 6; i >= 0; i--) { const d = addD(new Date(), -i), c = dayColor(dkey(d)); wk.push(`<div style="text-align:center;font-size:10.5px;color:var(--mut)"><div style="width:30px;height:30px;border-radius:50%;margin:0 auto 3px;background:${c ? COL[c] : '#ECE5D6'}"></div>${d.toLocaleDateString('ru-RU', {weekday: 'short'})}</div>`); }
  const steps7 = []; for (let i = 6; i >= 0; i--) steps7.push(S.activity[dkey(addD(new Date(), -i))]?.steps || 0); const mx = Math.max(...steps7, 1);
  return `<div class="scr"><div class="hd"><div class="h1">Прогресс</div><button class="btn sm" data-act="measure">+ Замеры</button></div>
  <div style="padding:0 16px"><div class="seg">${[['week', 'Неделя'], ['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год']].map(([v, t]) => `<button data-act="period" data-v="${v}" class="${PERIOD === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>
  <div class="card"><h3>Вес <span class="mut" style="font-weight:600">${has ? `сейчас ${r1(lastWeight())} кг` : ''}</span></h3>${has ? lineChart(pts, [{k: 'w', c: '#7A9A6E', w: 1.5, dots: 1}, {k: 't', c: '#4F6B45', w: 2.4}], S.profile.targetWeight) + '<div class="mut" style="margin-top:4px">Точки — замеры, линия — тренд за 7 дней, пунктир — цель</div>' : '<div class="empty">Записей веса пока нет. Взвешивайтесь утром натощак и добавляйте вес кнопкой «+ Замеры».</div>'}</div>
  ${goalCard()}
  <div class="card"><h3>Объёмы ${ic('obemy')}</h3><div class="seg" style="margin-bottom:8px">${VOL.map(([k, t]) => `<button data-act="volk" data-v="${k}" class="${VOLK === k ? 'on' : ''}" style="font-size:11.5px">${t}</button>`).join('')}</div>
  ${hasVol ? lineChart(pts, [{k: 'v', c: '#4F6B45', dots: 1}]) : '<div class="empty">Нет замеров этого обхвата</div>'}
  ${vols.length ? `<div class="g3" style="grid-template-columns:repeat(5,1fr);margin-top:8px;text-align:center">${VOL.map(([k, t]) => { const xs = vols.filter(x => x[k]), l = xs[xs.length - 1]?.[k], f = xs[0]?.[k]; return `<div><b style="font-size:14px">${l ?? '—'}</b><div class="mut" style="font-size:10.5px">${t}${l != null && xs.length > 1 ? `<br>${l - f > 0 ? '+' : ''}${r1(l - f)}` : ''}</div></div>`; }).join('')}</div>` : ''}</div>
  <div class="card"><h3>Активность ${ic('shagi')}</h3><div class="row"><div class="sp"><b style="font-size:19px">${a?.steps ? a.steps.toLocaleString('ru-RU') : '0'}</b> <span class="mut">шагов сегодня</span><div class="mut">${(a?.workouts || []).length ? a.workouts.map(w => `${esc(w.type)} ${w.min} мин`).join(', ') : 'Тренировок сегодня нет'}</div></div><button class="btn sm sec" data-act="activity" data-d="${dkey()}">Внести</button></div>
  ${steps7.some(Boolean) ? `<div style="display:flex;gap:6px;align-items:flex-end;height:60px;margin-top:10px">${steps7.map(s => `<div style="flex:1;background:${s >= 10000 ? '#6E9A5A' : '#7A9A6E66'};height:${Math.max(3, s / mx * 100)}%;border-radius:5px" title="${s}"></div>`).join('')}</div>` : ''}</div>
  <div class="card"><h3>Мотивация ${ic('beydzh')}</h3><div class="row" style="margin-bottom:12px"><div style="font-size:30px;font-weight:800" class="gold">${st}</div><div class="mut">${plural(st, 'день', 'дня', 'дней')} подряд в норме${S.awarded.maxStreak ? ` · рекорд ${S.awarded.maxStreak}` : ''}</div></div>
  <div style="display:flex;justify-content:space-between;margin-bottom:14px">${wk.join('')}</div>
  <div class="hs">${bl.map(b => `<div class="badge ${b.on ? 'on' : ''}"><div class="c">${ic('beydzh')}</div>${b.t}</div>`).join('')}</div>
  ${wr ? `<div class="tip" style="margin:12px 0 0"><b>Недельный отчёт.</b> ${esc(wr.praise)} ${esc(wr.fact)} ${esc(wr.advice)}</div>` : '<div class="empty">Недельный отчёт появится, когда будут записи за прошлые дни</div>'}</div>
  ${bpCard()}</div>`; }
let BP_LIST = null, BP_URLS = [];
function bpCard() { return `<div class="card" id="bpCard"><h3>Фото до/после ${ic('zamok')}</h3>${!BPKEY ? `<div class="lock">${ic('do_posle')}<div style="font-weight:700;margin:8px 0 4px">Личный раздел</div><div class="mut" style="margin-bottom:12px">Фото зашифрованы отдельным PIN-кодом и не показываются без него</div><button class="btn sm" data-act="bpUnlock">${S.bpSalt ? 'Ввести второй PIN' : 'Задать второй PIN'}</button></div>`
  : `<div class="hs" id="bpRow">${(BP_LIST || []).length ? '' : '<div class="empty" style="width:100%">Фото пока нет</div>'}</div><div class="row" style="margin-top:10px"><button class="btn sm" data-act="bpAdd">+ Добавить фото</button><button class="btn sm sec" data-act="bpLock">Закрыть раздел</button></div>`}</div>`; }
async function bpFetchMissing(it) { const tok = S.sync?.token; if (!tok) return null; const r = await ghGetJson(tok, 'bp/' + it.id + '.enc.json').catch(() => null); if (r) { await idb.set('bp:' + it.id, r.json); await idb.set('bp:' + it.id + ':sent', 1); return r.json; } return null; }
async function bpRenderRow() { BP_URLS.forEach(u => URL.revokeObjectURL(u)); BP_URLS = []; const row = $('#bpRow'); if (!row || !BPKEY) return;
  for (const it of BP_LIST) { try { const box = (await idb.get('bp:' + it.id)) || await bpFetchMissing(it); if (!box || !BPKEY) continue; const u = URL.createObjectURL(new Blob([await open_(BPKEY, box)], {type: 'image/jpeg'})); BP_URLS.push(u);
    const d = document.createElement('div'); d.innerHTML = `<img class="bp" src="${u}" alt="Фото ${fmtD(parseD(it.d))}"><div class="mut" style="text-align:center">${fmtD(parseD(it.d))}</div><button class="lnk" style="display:block;margin:auto;font-size:12px" data-del="${it.id}">удалить</button>`; row.appendChild(d); } catch (e) {} }
  row.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Удалить это фото?')) return; BP_LIST = BP_LIST.filter(x => x.id !== b.dataset.del); await idb.del('bp:' + b.dataset.del); await bpSaveList(); render(); }); }
async function bpSaveList() { const box = await seal(BPKEY, enc.encode(JSON.stringify(BP_LIST))); await idb.set('bpmeta', {salt: S.bpSalt, iter: ITER, ...box}); await idb.del('bpmeta:sent'); schedSync(); }
function bpPin() { let buf = '', first = null; const setting = !S.bpSalt;
  const draw = msg => { sheet(`<div class="hd"><div class="h1" style="font-size:20px">${setting ? (first ? 'Повторите второй PIN' : 'Придумайте второй PIN') : 'Второй PIN'}</div><button class="x" data-close>×</button></div><div style="display:flex;flex-direction:column;align-items:center">
    <p class="mut" style="text-align:center;padding:0 24px">${setting ? 'Отдельный код только для фото до/после. Если его забыть, фото не восстановить.' : 'Фото откроются до закрытия раздела или выхода из приложения'}</p><div class="dots">${[0, 1, 2, 3].map(i => `<i class="${i < buf.length ? 'f' : ''}"></i>`).join('')}</div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-b="${n}">${n}</button>`).join('')}<span></span><button data-b="0">0</button><button class="e" data-b="b">⌫</button></div><div style="color:var(--bad);margin-top:14px;min-height:20px">${esc(msg || '')}</div></div>`);
    document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => key(b.dataset.b)); };
  const key = async k => { if (k === 'b') buf = buf.slice(0, -1); else if (buf.length < 4) buf += k; draw(); if (buf.length < 4) return; const pin = buf; buf = '';
    if (setting) { if (!first) { first = pin; return draw(); } if (pin !== first) { first = null; return draw('Не совпало, ещё раз'); }
      const salt = crypto.getRandomValues(new Uint8Array(16)); S.bpSalt = b64(salt); BPKEY = await deriveKey('bp:' + pin, salt); BP_LIST = []; await bpSaveList(); await save(); closeSheet(); render(); toast('Второй PIN задан'); return; }
    let m = await idb.get('bpmeta'); if (!m && S.sync?.token) { const r = await ghGetJson(S.sync.token, 'bp/meta.enc.json').catch(() => null); if (r) { m = r.json; await idb.set('bpmeta', m); await idb.set('bpmeta:sent', 1); } }
    const k2 = await deriveKey('bp:' + pin, ub64(S.bpSalt)); try { BP_LIST = m ? JSON.parse(dec.decode(await open_(k2, m))) : []; BPKEY = k2; closeSheet(); render(); $('#bpCard').scrollIntoView({block: 'nearest'}); } catch (e) { draw('Неверный PIN'); } };
  draw(); }
/* ---------- Профиль ---------- */
function scrProfile() { const p = S.profile, pl = S.plan, appUrl = location.origin + location.pathname;
  return `<div class="scr"><div class="hd"><div class="h1">Профиль</div><button class="btn sm sec" data-act="lock">Заблокировать</button></div>
  <div class="card"><h3>Норма на день <button class="lnk" data-act="plan">подробнее</button></h3><div class="g3" style="grid-template-columns:repeat(4,1fr);text-align:center">${[['ккал', pl.kcal + (pl.adj || 0)], ['Б, г', pl.p], ['Ж, г', pl.f], ['У, г', pl.c]].map(([t, v]) => `<div><b style="font-size:17px">${r0(v)}</b><div class="mut">${t}</div></div>`).join('')}</div>
  ${pl.adj ? `<div class="mut" style="margin-top:8px">С учётом автокоррекции ${pl.adj > 0 ? '+' : ''}${pl.adj} ккал</div>` : ''}</div>
  <div class="card"><h3>Где хранятся данные</h3><div class="mut" style="line-height:1.6">Анкета и дневник сохраняются на этом устройстве в зашифрованном виде, повторно их вводить не нужно. Safari и значок на экране «Домой» хранят данные раздельно: пользуйтесь приложением с экрана «Домой» (Поделиться → «На экран „Домой“»). Чтобы данные не потерялись при смене телефона или очистке браузера, включите резервную копию ниже.</div></div>
  <div class="card"><h3>Параметры</h3><div class="mut" style="line-height:1.7">${p.sex === 'male' ? 'Мужчина' : 'Женщина'}, ${pAge(p)} ${plural(pAge(p), 'год', 'года', 'лет')}, ${p.height} см, ${r1(lastWeight())} кг<br>Цель: ${{loss: 'похудеть', maintain: 'поддерживать вес', gain: 'набрать'}[p.goal]}${p.targetWeight ? ` до ${p.targetWeight} кг` : ''}<br>Активность: ${ACT.find(a => a[0] === p.activity)[1]}</div>
  <button class="btn sec" style="margin-top:10px" data-act="editProfile">Изменить параметры и цель</button></div>
  <div class="card"><h3>Распределение по приёмам</h3><form id="shf"><div class="g3" style="grid-template-columns:repeat(4,1fr)">${MEALS.map(([m, t]) => `<label class="fld"><span>${t}, %</span><input name="${m}" inputmode="numeric" value="${r0((p.shares || C.MEAL_SHARES)[m] * 100)}"></label>`).join('')}</div>
  <label class="fld" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="wb" style="width:auto" ${p.workoutBonus ? 'checked' : ''}><span style="margin:0">Добавлять к норме 50% калорий тренировки</span></label><button class="btn sm">Сохранить</button></form></div>
  <div class="card"><h3>Резервная копия</h3><div class="mut" style="line-height:1.5;margin-bottom:10px">Данные шифруются вашим PIN-кодом и копируются в закрытый репозиторий <b>${DATA_REPO}</b>. Там лежит только шифротекст.<br>Статус: <b>${S.sync?.token ? esc(SYNC_ST || (S.sync.last ? 'сохранено ' + new Date(S.sync.last).toLocaleString('ru-RU') : 'не синхронизировано')) : 'не подключено'}</b></div>
  ${S.sync?.token ? '<div class="row"><button class="btn sm" data-act="syncNow">Синхронизировать</button><button class="btn sm sec" data-act="syncOff">Отключить</button></div>' : '<label class="fld"><span>Ключ доступа GitHub (только к nutricio-data)</span><input id="tok" type="password" autocomplete="off"></label><button class="btn sm" data-act="syncOn">Подключить</button>'}</div>
  <div class="card"><h3>Импорт из «Здоровья» ${ic('shagi')}</h3><div class="mut" style="line-height:1.55">Быстрая команда на iPhone раз в день берёт шаги и тренировки из «Здоровья» и открывает ссылку:<br><code style="font-size:11px;word-break:break-all">${esc(appUrl)}#import={"date":"ГГГГ-ММ-ДД","steps":8420,"activeKcal":410,"workouts":[{"type":"Бег","minutes":35,"kcal":320}]}</code><br>
  После входа по PIN приложение запишет данные само. Ещё два способа: положить такой JSON в папку <b>inbox/</b> закрытого репозитория (заберётся при синхронизации) или загрузить файл кнопкой ниже.</div>
  <button class="btn sm sec" style="margin-top:10px" data-act="importFile">Загрузить JSON-файл</button></div>
  ${S.log.length ? `<div class="card"><h3>Журнал нормы</h3>${S.log.slice(-5).reverse().map(l => `<div class="li"><span class="mut">${fmtD(parseD(l.d))}</span><span style="font-size:13px;text-align:right">${esc(l.t)}</span></div>`).join('')}</div>` : ''}
  <div class="card"><h3>Данные</h3><button class="btn sm sec" data-act="exportEnc">Скачать зашифрованную копию</button><p class="mut" style="margin-top:10px">Nutricio даёт ориентиры и не заменяет консультацию врача.</p></div></div>`; }
function bindProfileForm() { const f = $('#shf'); if (!f) return; f.onsubmit = async e => { e.preventDefault(); const d = new FormData(f), sh = {}; let sum = 0; for (const [m] of MEALS) { sh[m] = (num(d.get(m)) || 0) / 100; sum += sh[m]; }
  if (Math.abs(sum - 1) > 0.011) return toast(`Сумма должна быть 100%, сейчас ${r0(sum * 100)}%`); S.profile.shares = sh; S.profile.workoutBonus = !!d.get('wb'); await save(); render(); toast('Сохранено'); }; }

const ACTIONS = {
  day: d => { const x = addD(parseD(DAY), +d.n); if (dkey(x) > dkey()) return; DAY = dkey(x); render(); },
  meal: d => mealSheet(d.m), addTo: d => addSheet(d.m),
  delItem: async d => { S.meals[DAY] = dayItems(DAY).filter(x => x.id !== d.id); await save(); render(); mealSheet(d.m); },
  addPhoto: () => photoAdd(), addSearch: () => searchSheet(), addRest: () => restSheet(), addManual: () => manualSheet(),
  quickRecent: d => { const {id, meal, t, ...rest} = recent()[+d.i]; addItem(rest); },
  activity: d => activitySheet(d.d), measure: () => measureSheet(),
  period: d => { PERIOD = d.v; render(); }, volk: d => { VOLK = d.v; render(); },
  bpUnlock: () => bpPin(), bpLock: () => { BPKEY = null; BP_LIST = null; BP_URLS.forEach(u => URL.revokeObjectURL(u)); BP_URLS = []; render(); },
  bpAdd: () => pickImage(async f => { try { const bytes = await shrink(f, 1600); const id = uid(); await idb.set('bp:' + id, await seal(BPKEY, bytes)); BP_LIST.push({id, d: dkey()}); await bpSaveList(); render(); toast('Фото зашифровано и сохранено'); } catch (e) { toast('Не удалось сохранить фото'); } }),
  lock: () => lock(), plan: () => planSheet(), editProfile: () => onboarding(true),
  syncOn: async () => { const t = $('#tok').value.trim(); if (!t) return; try { const r = await fetch(`https://api.github.com/repos/${DATA_REPO}`, {headers: ghH(t)}); if (!r.ok) throw new Error(r.status === 404 ? 'нет доступа к репозиторию' : 'GitHub ' + r.status); S.sync = {token: t, last: 0}; await save(true); render(); syncNow(true); } catch (e) { toast('Не удалось: ' + e.message); } },
  syncOff: async () => { if (!confirm('Отключить резервное копирование на этом устройстве?')) return; S.sync = {token: '', last: 0}; SYNC_ST = ''; await save(true); render(); },
  syncNow: () => syncNow(true),
  importFile: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { const n = importHealth(JSON.parse(await i.files[0].text())); await save(); render(); toast(`Импортировано: ${n} ${plural(n, 'день', 'дня', 'дней')}`); await checkBadges(); } catch (e) { toast('Файл не похож на данные активности'); } }; i.click(); },
  exportEnc: async () => { const st = await idb.get('state'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(st)], {type: 'application/json'})); a.download = `nutricio-${dkey()}.enc.json`; a.click(); },
};
grabHash();
window.addEventListener('hashchange', async () => { grabHash(); if (KEY && S?.profile && PENDING_IMPORT) { await hashImport(); render(); } });
boot();
